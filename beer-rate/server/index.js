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

const beerCatalog = [
  { id: 1, name: 'Northern Peak IPA', style: 'IPA' },
  { id: 2, name: 'Midnight Cask', style: 'Stout' },
  { id: 3, name: 'Amber Forge', style: 'Lager' },
  { id: 4, name: 'Cloudline Sour', style: 'Sour' },
  { id: 5, name: 'Iron Barrel Reserve', style: 'Barleywine' },
  { id: 6, name: 'Dockside Porter', style: 'Porter' },
  { id: 7, name: 'Baltic Glow', style: 'Stout' },
  { id: 8, name: 'Hop Classroom', style: 'IPA' },
  { id: 9, name: 'Royal Abbey Red', style: 'Lager' },
  { id: 10, name: 'Stone Route 9', style: 'Porter' },
  { id: 11, name: 'Wild Plum Current', style: 'Sour' },
  { id: 12, name: 'Gold Rail Pils', style: 'Lager' },
  { id: 13, name: 'Old Script Barrel', style: 'Barleywine' },
  { id: 14, name: 'Maple Night Shift', style: 'Stout' },
  { id: 15, name: 'Fresh Chalk IPA', style: 'IPA' },
]

await fs.mkdir(dataDir, { recursive: true })

const db = await open({
  filename: dbPath,
  driver: sqlite3.Database,
})

await db.exec('PRAGMA foreign_keys = ON;')

await db.exec(`
  CREATE TABLE IF NOT EXISTS beer_styles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS beers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    style_id INTEGER NOT NULL,
    FOREIGN KEY(style_id) REFERENCES beer_styles(id)
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    beer_id INTEGER NOT NULL,
    client_id TEXT NOT NULL,
    score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(beer_id) REFERENCES beers(id)
  );

  CREATE INDEX IF NOT EXISTS idx_beers_style_id ON beers (style_id);
  CREATE INDEX IF NOT EXISTS idx_ratings_beer_id ON ratings (beer_id);
  CREATE INDEX IF NOT EXISTS idx_ratings_client_id ON ratings (client_id);
`)

const styleIdByName = new Map()

for (const styleName of [...new Set(beerCatalog.map((beer) => beer.style))]) {
  const existing = await db.get(`SELECT id FROM beer_styles WHERE name = ?`, [styleName])

  if (existing?.id) {
    styleIdByName.set(styleName, Number(existing.id))
    continue
  }

  const inserted = await db.run(`INSERT INTO beer_styles (name) VALUES (?)`, [styleName])
  styleIdByName.set(styleName, Number(inserted.lastID))
}

for (const beer of beerCatalog) {
  const styleId = styleIdByName.get(beer.style)
  if (!styleId) {
    continue
  }

  await db.run(
    `
    INSERT INTO beers (id, name, style_id)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      style_id = excluded.style_id
    `,
    [beer.id, beer.name, styleId],
  )
}

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
        r.beer_id AS beerId,
        s.name AS styleName,
        COUNT(*) AS addedCount,
        AVG(score) AS addedAverage
      FROM ratings r
      LEFT JOIN beers b ON b.id = r.beer_id
      LEFT JOIN beer_styles s ON s.id = b.style_id
      GROUP BY r.beer_id, s.name
      `,
    )

    const byBeer = {}

    for (const row of totals) {
      byBeer[row.beerId] = {
        styleName: row.styleName ?? null,
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

    const beer = await db.get(
      `
      SELECT b.id, b.name, s.name AS styleName
      FROM beers b
      LEFT JOIN beer_styles s ON s.id = b.style_id
      WHERE b.id = ?
      `,
      [beerId],
    )

    if (!beer) {
      return res.status(400).json({ message: 'Unknown beerId' })
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
      beerName: String(beer.name),
      styleName: beer.styleName == null ? null : String(beer.styleName),
      addedCount: Number(aggregate.addedCount),
      addedAverage: Number(aggregate.addedAverage),
      userRating: Number(latestMine.userRating),
    })
  } catch (error) {
    console.error('Failed to save rating', error)
    return res.status(500).json({ message: 'Failed to save rating' })
  }
})

app.get('/api/styles', async (_req, res) => {
  try {
    const styles = await db.all(
      `
      SELECT
        s.id,
        s.name,
        COUNT(DISTINCT b.id) AS beersCount,
        COUNT(r.id) AS ratingsCount,
        AVG(r.score) AS averageScore
      FROM beer_styles s
      LEFT JOIN beers b ON b.style_id = s.id
      LEFT JOIN ratings r ON r.beer_id = b.id
      GROUP BY s.id, s.name
      ORDER BY s.name ASC
      `,
    )

    return res.json({
      styles: styles.map((row) => ({
        id: Number(row.id),
        name: String(row.name),
        beersCount: Number(row.beersCount),
        ratingsCount: Number(row.ratingsCount),
        averageScore: row.averageScore == null ? null : Number(row.averageScore),
      })),
    })
  } catch (error) {
    console.error('Failed to load beer styles', error)
    return res.status(500).json({ message: 'Failed to load beer styles' })
  }
})

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
  console.log(`Ratings API is running on http://localhost:${port}`)
})
