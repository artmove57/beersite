import cors from 'cors'
import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, 'data')
const dbPath = path.join(dataDir, 'ratings.db')

await fs.mkdir(dataDir, { recursive: true })

const db = await open({
  filename: dbPath,
  driver: sqlite3.Database,
})

await db.exec(`
  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    beer_id INTEGER NOT NULL,
    client_id TEXT NOT NULL,
    score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_ratings_beer_id ON ratings (beer_id);
  CREATE INDEX IF NOT EXISTS idx_ratings_client_id ON ratings (client_id);
`)

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/ratings/summary', async (req, res) => {
  try {
    const clientId = String(req.query.clientId ?? '').trim()

    const totals = await db.all(
      `
      SELECT
        beer_id AS beerId,
        COUNT(*) AS addedCount,
        AVG(score) AS addedAverage
      FROM ratings
      GROUP BY beer_id
      `,
    )

    const byBeer = {}

    for (const row of totals) {
      byBeer[row.beerId] = {
        addedCount: Number(row.addedCount),
        addedAverage: Number(row.addedAverage),
        userRating: null,
      }
    }

    if (clientId.length > 0) {
      const mine = await db.all(
        `
        SELECT r.beer_id AS beerId, r.score AS userRating
        FROM ratings r
        INNER JOIN (
          SELECT beer_id, MAX(id) AS maxId
          FROM ratings
          WHERE client_id = ?
          GROUP BY beer_id
        ) latest ON latest.maxId = r.id
        `,
        [clientId],
      )

      for (const row of mine) {
        const current = byBeer[row.beerId] ?? {
          addedCount: 0,
          addedAverage: 0,
          userRating: null,
        }

        byBeer[row.beerId] = {
          ...current,
          userRating: Number(row.userRating),
        }
      }
    }

    res.json({ byBeer })
  } catch (error) {
    console.error('Failed to load ratings summary', error)
    res.status(500).json({ message: 'Failed to load ratings summary' })
  }
})

app.post('/api/ratings', async (req, res) => {
  try {
    const beerId = Number(req.body?.beerId)
    const score = Number(req.body?.score)
    const clientId = String(req.body?.clientId ?? '').trim()

    if (!Number.isInteger(beerId) || beerId <= 0) {
      return res.status(400).json({ message: 'Invalid beerId' })
    }

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ message: 'Score must be an integer from 1 to 5' })
    }

    if (clientId.length < 8) {
      return res.status(400).json({ message: 'Invalid clientId' })
    }

    await db.run(
      `
      INSERT INTO ratings (beer_id, client_id, score)
      VALUES (?, ?, ?)
      `,
      [beerId, clientId, score],
    )

    const aggregate = await db.get(
      `
      SELECT COUNT(*) AS addedCount, AVG(score) AS addedAverage
      FROM ratings
      WHERE beer_id = ?
      `,
      [beerId],
    )

    const latestMine = await db.get(
      `
      SELECT score AS userRating
      FROM ratings
      WHERE beer_id = ? AND client_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [beerId, clientId],
    )

    return res.status(201).json({
      beerId,
      addedCount: Number(aggregate.addedCount),
      addedAverage: Number(aggregate.addedAverage),
      userRating: Number(latestMine.userRating),
    })
  } catch (error) {
    console.error('Failed to save rating', error)
    return res.status(500).json({ message: 'Failed to save rating' })
  }
})

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
  console.log(`Ratings API is running on http://localhost:${port}`)
})
