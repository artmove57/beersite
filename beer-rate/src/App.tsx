import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { BeerCard } from './components/BeerCard'
import { Filters } from './components/Filters'
import { Header, type NavTarget } from './components/Header'
import { Tabs } from './components/Tabs'
import { beers } from './data/beers'

type TabKey = 'beers' | 'breweries'
type SortKey = 'rating' | 'ratingsCount' | 'name'

interface RatingSummaryEntry {
  addedCount: number
  addedAverage: number
  userRating: number | null
}

const sections: NavTarget[] = ['home', 'top-rated', 'breweries', 'help']
const clientIdStorageKey = 'beer-rate-client-id'

function getOrCreateClientId() {
  try {
    const saved = window.localStorage.getItem(clientIdStorageKey)
    if (saved) {
      return saved
    }

    const generated =
      typeof window.crypto?.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    window.localStorage.setItem(clientIdStorageKey, generated)
    return generated
  } catch {
    return `client-${Date.now()}-fallback`
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('beers')
  const [activeSection, setActiveSection] = useState<NavTarget>('home')
  const [search, setSearch] = useState('')
  const [style, setStyle] = useState('Show All Styles')
  const [country, setCountry] = useState('Show All Countries')
  const [sort, setSort] = useState<SortKey>('rating')
  const [clientId] = useState(() => getOrCreateClientId())
  const [ratingSummary, setRatingSummary] = useState<Record<number, RatingSummaryEntry>>({})
  const [selectedBeerId, setSelectedBeerId] = useState<number>(beers[0]?.id ?? 1)
  const [draftRating, setDraftRating] = useState<number>(5)
  const [postMessage, setPostMessage] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [isLoadingRatings, setIsLoadingRatings] = useState(true)
  const [apiError, setApiError] = useState('')

  const loadRatingsSummary = useCallback(async () => {
    try {
      const response = await fetch(`/api/ratings/summary?clientId=${encodeURIComponent(clientId)}`)
      if (!response.ok) {
        throw new Error('Unable to fetch ratings summary')
      }

      const payload = (await response.json()) as {
        byBeer?: Record<string, Partial<RatingSummaryEntry>>
      }

      const normalized: Record<number, RatingSummaryEntry> = {}

      for (const [beerId, raw] of Object.entries(payload.byBeer ?? {})) {
        const id = Number(beerId)
        if (!Number.isInteger(id) || id <= 0) {
          continue
        }

        const addedCount = Number(raw.addedCount ?? 0)
        const addedAverage = Number(raw.addedAverage ?? 0)
        const userRating = raw.userRating == null ? null : Number(raw.userRating)

        normalized[id] = {
          addedCount: Number.isFinite(addedCount) ? addedCount : 0,
          addedAverage: Number.isFinite(addedAverage) ? addedAverage : 0,
          userRating: Number.isFinite(userRating as number) ? (userRating as number) : null,
        }
      }

      setRatingSummary(normalized)
      setApiError('')
    } catch {
      setApiError('Ratings API is unavailable. Start it with npm run dev:full.')
    } finally {
      setIsLoadingRatings(false)
    }
  }, [clientId])

  const handlePostRating = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const selectedBeer = beers.find((beer) => beer.id === selectedBeerId)
      if (!selectedBeer) {
        return
      }

      setIsPosting(true)
      setPostMessage('')

      try {
        const response = await fetch('/api/ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            beerId: selectedBeerId,
            score: draftRating,
            clientId,
          }),
        })

        if (!response.ok) {
          throw new Error('Unable to post rating')
        }

        await loadRatingsSummary()
        setPostMessage(`Posted ${draftRating}/5 for ${selectedBeer.name}.`)
      } catch {
        setApiError('Could not post rating. Check that the API server is running.')
      } finally {
        setIsPosting(false)
      }
    },
    [clientId, draftRating, loadRatingsSummary, selectedBeerId],
  )

  const navigateToSection = useCallback((target: NavTarget) => {
    if (target === 'home' || target === 'top-rated') {
      setActiveTab('beers')
    }

    if (target === 'breweries') {
      setActiveTab('breweries')
    }

    window.requestAnimationFrame(() => {
      const targetSection = document.getElementById(target)
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setActiveSection(target)
      }
    })
  }, [])

  useEffect(() => {
    const updateActiveSection = () => {
      const offset = 120
      let currentSection: NavTarget = 'home'

      for (const section of sections) {
        const sectionEl = document.getElementById(section)
        if (!sectionEl) {
          continue
        }

        const sectionTop = sectionEl.getBoundingClientRect().top + window.scrollY
        if (window.scrollY + offset >= sectionTop) {
          currentSection = section
        }
      }

      setActiveSection(currentSection)
    }

    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })

    return () => window.removeEventListener('scroll', updateActiveSection)
  }, [activeTab])

  useEffect(() => {
    const hashValue = window.location.hash.replace('#', '')
    if (sections.includes(hashValue as NavTarget)) {
      navigateToSection(hashValue as NavTarget)
    }
  }, [navigateToSection])

  useEffect(() => {
    void loadRatingsSummary()
  }, [loadRatingsSummary])

  useEffect(() => {
    if (!postMessage) {
      return
    }

    const timer = window.setTimeout(() => {
      setPostMessage('')
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [postMessage])

  const beerOptions = useMemo(
    () => [...beers].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  )

  const filteredBeers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const result = beers.filter((beer) => {
      const searchMatch =
        normalizedSearch.length === 0 ||
        beer.name.toLowerCase().includes(normalizedSearch) ||
        beer.brewery.toLowerCase().includes(normalizedSearch)
      const styleMatch = style === 'Show All Styles' || beer.style === style
      const countryMatch = country === 'Show All Countries' || beer.country === country

      return searchMatch && styleMatch && countryMatch
    })

    const withApiRatings = result.map((beer) => {
      const summary = ratingSummary[beer.id]
      const addedCount = summary?.addedCount ?? 0
      const addedAverage = summary?.addedAverage ?? 0

      const displayRatingsCount = beer.ratingsCount + addedCount
      const totalScore = beer.rating * beer.ratingsCount + addedAverage * addedCount
      const displayRating = totalScore / displayRatingsCount

      return {
        ...beer,
        displayRating,
        displayRatingsCount,
        myRating: summary?.userRating ?? undefined,
      }
    })

    return withApiRatings.sort((a, b) => {
      if (sort === 'name') {
        return a.name.localeCompare(b.name)
      }

      if (sort === 'ratingsCount') {
        return b.displayRatingsCount - a.displayRatingsCount
      }

      return b.displayRating - a.displayRating
    })
  }, [search, style, country, sort, ratingSummary])

  const breweries = useMemo(() => {
    const grouped = new Map<string, { country: string; count: number }>()

    for (const beer of beers) {
      const current = grouped.get(beer.brewery)
      if (!current) {
        grouped.set(beer.brewery, { country: beer.country, count: 1 })
      } else {
        grouped.set(beer.brewery, { ...current, count: current.count + 1 })
      }
    }

    return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [])

  return (
    <>
      <Header activeSection={activeSection} onNavigate={navigateToSection} />
      <main className="page">
        <section className="intro" id="home">
          <h1>Top Rated Beers</h1>
          <p>
            This page shows highly rated beers based on average user ratings and number of
            reviews.
          </p>
          <p className="note">Your posted ratings are saved in a local SQLite database.</p>
        </section>

        <Tabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'beers' ? (
          <section id="top-rated" className="content-block" aria-label="Top rated beers">
            <Filters
              search={search}
              style={style}
              country={country}
              sort={sort}
              onSearchChange={setSearch}
              onStyleChange={setStyle}
              onCountryChange={setCountry}
              onSortChange={(value) => setSort(value as SortKey)}
            />

            <section className="rating-panel" aria-label="Post your own beer rating">
              <h2>Post your rating</h2>
              <form className="rating-form" onSubmit={handlePostRating}>
                <label className="field-label" htmlFor="beer-select">
                  Beer
                </label>
                <select
                  id="beer-select"
                  className="select"
                  value={selectedBeerId}
                  onChange={(event) => setSelectedBeerId(Number(event.target.value))}
                >
                  {beerOptions.map((beer) => (
                    <option key={beer.id} value={beer.id}>
                      {beer.name}
                    </option>
                  ))}
                </select>

                <label className="field-label" htmlFor="rating-select">
                  Your score
                </label>
                <select
                  id="rating-select"
                  className="select"
                  value={draftRating}
                  onChange={(event) => setDraftRating(Number(event.target.value))}
                >
                  <option value={1}>1 / 5</option>
                  <option value={2}>2 / 5</option>
                  <option value={3}>3 / 5</option>
                  <option value={4}>4 / 5</option>
                  <option value={5}>5 / 5</option>
                </select>

                <button type="submit" className="post-button" disabled={isPosting}>
                  {isPosting ? 'Posting...' : 'Post rating'}
                </button>
              </form>
              {postMessage ? <p className="post-message">{postMessage}</p> : null}
              {isLoadingRatings ? <p className="api-status">Loading ratings...</p> : null}
              {apiError ? <p className="api-error">{apiError}</p> : null}
            </section>

            <section className="list" aria-label="Beer list">
              {filteredBeers.length === 0 ? (
                <p className="empty">No beers found with the selected filters.</p>
              ) : (
                filteredBeers.map((beer, index) => (
                  <BeerCard
                    key={beer.id}
                    beer={beer}
                    rank={index + 1}
                    displayRating={beer.displayRating}
                    displayRatingsCount={beer.displayRatingsCount}
                    userRating={beer.myRating}
                  />
                ))
              )}
            </section>
          </section>
        ) : (
          <section id="breweries" className="breweries" aria-label="Brewery list">
            {breweries.map(([name, details]) => (
              <article className="brewery-item" key={name}>
                <h3>{name}</h3>
                <p>
                  {details.country} • {details.count} beer{details.count > 1 ? 's' : ''} in this list
                </p>
              </article>
            ))}
          </section>
        )}

        <section className="help" id="help" aria-label="Help and usage">
          <h2>How to use this page</h2>
          <p>
            Use the search and filters to find beers quickly. Switch tabs to see the brewery
            catalog and keep exploring the top-rated list.
          </p>
        </section>
      </main>
    </>
  )
}

export default App
