import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { BeerCard } from './components/BeerCard'
import { Filters } from './components/Filters'
import { Header, type NavTarget } from './components/Header'
import { Tabs } from './components/Tabs'
import { beers } from './data/beers'

type TabKey = 'beers' | 'breweries'
type SortKey = 'weighted' | 'rating' | 'trending' | 'ratingsCount' | 'name'
type TimeRangeKey = 'all' | 'month' | 'week'
type RetiredFilter = 'include' | 'active-only'

interface RatingSummaryEntry {
  addedCount: number
  addedAverage: number
  userRating: number | null
}

interface RankedBeer {
  id: number
  name: string
  brewery: string
  style: string
  country: string
  abv: number
  ibu: number
  description: string
  rating: number
  ratingsCount: number
  isRetired?: boolean
  displayRating: number
  displayRatingsCount: number
  weightedScore: number
  trendingScore: number
  recentMomentum: number
  timeAdjustedRating: number
  addedCount: number
  myRating?: number
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

function getSortLabel(sort: SortKey) {
  if (sort === 'weighted') {
    return 'Sorted by weighted score'
  }

  if (sort === 'trending') {
    return 'Sorted by trending momentum'
  }

  if (sort === 'ratingsCount') {
    return 'Sorted by number of ratings'
  }

  if (sort === 'name') {
    return 'Sorted alphabetically'
  }

  return 'Sorted by raw average rating'
}

function getTimeRangeLabel(timeRange: TimeRangeKey) {
  if (timeRange === 'month') {
    return 'Signal: last 30 days'
  }

  if (timeRange === 'week') {
    return 'Signal: last 7 days'
  }

  return 'Signal: all time'
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('beers')
  const [activeSection, setActiveSection] = useState<NavTarget>('home')
  const [search, setSearch] = useState('')
  const [style, setStyle] = useState('All styles')
  const [country, setCountry] = useState('All countries')
  const [sort, setSort] = useState<SortKey>('weighted')
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('all')
  const [minRatings, setMinRatings] = useState(500)
  const [retiredFilter, setRetiredFilter] = useState<RetiredFilter>('include')
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

  const styleOptions = useMemo(
    () => ['All styles', ...new Set(beers.map((beer) => beer.style))],
    [],
  )

  const countryOptions = useMemo(
    () => ['All countries', ...new Set(beers.map((beer) => beer.country))],
    [],
  )

  const enrichedBeers = useMemo<RankedBeer[]>(() => {
    const base = beers.map((beer) => {
      const summary = ratingSummary[beer.id]
      const addedCount = summary?.addedCount ?? 0
      const addedAverage = summary?.addedAverage ?? 0
      const displayRatingsCount = beer.ratingsCount + addedCount
      const totalScore = beer.rating * beer.ratingsCount + addedAverage * addedCount
      const displayRating =
        displayRatingsCount > 0 ? totalScore / displayRatingsCount : Number(beer.rating.toFixed(2))

      return {
        ...beer,
        displayRating,
        displayRatingsCount,
        addedCount,
        myRating: summary?.userRating ?? undefined,
      }
    })

    const totalRatings = base.reduce((acc, beer) => acc + beer.displayRatingsCount, 0)
    const weightedTotal = base.reduce((acc, beer) => acc + beer.displayRating * beer.displayRatingsCount, 0)
    const globalAverage = totalRatings > 0 ? weightedTotal / totalRatings : 0
    const confidenceFloor = 800

    return base.map((beer) => {
      const recentMomentum = Math.min(1, (beer.addedCount + (beer.id % 4) * 3) / 36)

      let timeMultiplier = 1
      if (timeRange === 'month') {
        timeMultiplier = 0.94 + recentMomentum * 0.1
      }

      if (timeRange === 'week') {
        timeMultiplier = 0.88 + recentMomentum * 0.18
      }

      const timeAdjustedRating = Math.min(5, beer.displayRating * timeMultiplier)
      const volume = beer.displayRatingsCount

      const weightedScore =
        volume > 0
          ? (volume / (volume + confidenceFloor)) * timeAdjustedRating +
            (confidenceFloor / (volume + confidenceFloor)) * globalAverage
          : globalAverage

      const trendingScore = Math.min(
        5,
        weightedScore + recentMomentum * 0.32 + (beer.addedCount > 0 ? 0.05 : 0),
      )

      return {
        ...beer,
        timeAdjustedRating,
        weightedScore,
        trendingScore,
        recentMomentum,
      }
    })
  }, [ratingSummary, timeRange])

  const filteredBeers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const result = enrichedBeers.filter((beer) => {
      const searchMatch =
        normalizedSearch.length === 0 ||
        beer.name.toLowerCase().includes(normalizedSearch) ||
        beer.brewery.toLowerCase().includes(normalizedSearch) ||
        beer.style.toLowerCase().includes(normalizedSearch) ||
        beer.country.toLowerCase().includes(normalizedSearch)
      const styleMatch = style === 'All styles' || beer.style === style
      const countryMatch = country === 'All countries' || beer.country === country
      const ratingsVolumeMatch = beer.displayRatingsCount >= minRatings
      const retiredMatch = retiredFilter === 'include' || !beer.isRetired

      return searchMatch && styleMatch && countryMatch && ratingsVolumeMatch && retiredMatch
    })

    return result.sort((a, b) => {
      if (sort === 'name') {
        return a.name.localeCompare(b.name)
      }

      if (sort === 'ratingsCount') {
        return b.displayRatingsCount - a.displayRatingsCount
      }

      if (sort === 'weighted') {
        return b.weightedScore - a.weightedScore
      }

      if (sort === 'trending') {
        return b.trendingScore - a.trendingScore
      }

      return b.timeAdjustedRating - a.timeAdjustedRating
    })
  }, [search, style, country, sort, enrichedBeers, minRatings, retiredFilter])

  const catalogStats = useMemo(() => {
    const top = [...enrichedBeers].sort((a, b) => b.weightedScore - a.weightedScore)[0]
    const totalVotes = enrichedBeers.reduce((acc, beer) => acc + beer.displayRatingsCount, 0)
    const livePosts = enrichedBeers.reduce((acc, beer) => acc + beer.addedCount, 0)
    const breweryCount = new Set(enrichedBeers.map((beer) => beer.brewery)).size

    return {
      topName: top?.name ?? 'No beer selected',
      topScore: top?.weightedScore ?? 0,
      totalVotes,
      livePosts,
      breweryCount,
    }
  }, [enrichedBeers])

  const breweries = useMemo(() => {
    const grouped = new Map<
      string,
      { country: string; count: number; totalWeightedScore: number; totalRatings: number }
    >()

    for (const beer of enrichedBeers) {
      const current = grouped.get(beer.brewery)
      if (!current) {
        grouped.set(beer.brewery, {
          country: beer.country,
          count: 1,
          totalWeightedScore: beer.weightedScore,
          totalRatings: beer.displayRatingsCount,
        })
      } else {
        grouped.set(beer.brewery, {
          country: current.country,
          count: current.count + 1,
          totalWeightedScore: current.totalWeightedScore + beer.weightedScore,
          totalRatings: current.totalRatings + beer.displayRatingsCount,
        })
      }
    }

    return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [enrichedBeers])

  return (
    <>
      <Header activeSection={activeSection} onNavigate={navigateToSection} />
      <main className="page">
        <section className="intro hero" id="home">
          <p className="eyebrow">Community ranking board</p>
          <h1>Top rated beers with weighted community confidence</h1>
          <p className="note">Your posted ratings are saved in a local SQLite database.</p>

          <div className="hero-metrics" aria-label="Catalog statistics">
            <article className="metric-card">
              <span className="metric-label">Current top weighted beer</span>
              <strong>{catalogStats.topName}</strong>
              <span>{catalogStats.topScore.toFixed(2)} weighted score</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">Catalog activity</span>
              <strong>{catalogStats.totalVotes.toLocaleString()} ratings</strong>
              <span>{catalogStats.livePosts.toLocaleString()} user posts from this workspace</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">Brewery coverage</span>
              <strong>{catalogStats.breweryCount} breweries</strong>
              <span>Switch to the brewery tab for portfolio details</span>
            </article>
          </div>
        </section>

        <Tabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'beers' ? (
          <section id="top-rated" className="content-block" aria-label="Top rated beers">
            <Filters
              search={search}
              style={style}
              country={country}
              sort={sort}
              timeRange={timeRange}
              minRatings={minRatings}
              retiredFilter={retiredFilter}
              styleOptions={styleOptions}
              countryOptions={countryOptions}
              onSearchChange={setSearch}
              onStyleChange={setStyle}
              onCountryChange={setCountry}
              onSortChange={(value) => setSort(value as SortKey)}
              onTimeRangeChange={(value) => setTimeRange(value as TimeRangeKey)}
              onMinRatingsChange={setMinRatings}
              onRetiredFilterChange={(value) => setRetiredFilter(value as RetiredFilter)}
            />

            <div className="catalog-grid">
              <section className="list-panel" aria-label="Beer list">
                <header className="list-toolbar">
                  <p>{filteredBeers.length} beers match your filters</p>
                  <p>
                    {getSortLabel(sort)} • {getTimeRangeLabel(timeRange)}
                  </p>
                </header>

                <section className="list" aria-label="Ranked beer list">
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
                        weightedScore={beer.weightedScore}
                        trendingScore={beer.trendingScore}
                        addedCount={beer.addedCount}
                        userRating={beer.myRating}
                      />
                    ))
                  )}
                </section>
              </section>

              <aside className="rating-panel" aria-label="Post your own beer rating">
                <h2>Log your rating</h2>
                <p className="panel-text">
                  Rate any beer from this list to influence weighted and trending positions.
                </p>

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
              </aside>
            </div>
          </section>
        ) : (
          <section id="breweries" className="breweries" aria-label="Brewery list">
            {breweries.map(([name, details]) => (
              <article className="brewery-item" key={name}>
                <h3>{name}</h3>
                <p>
                  {details.country} • {details.count} beer{details.count > 1 ? 's' : ''} in this list
                </p>
                <p>{(details.totalWeightedScore / details.count).toFixed(2)} average weighted score</p>
                <p>{details.totalRatings.toLocaleString()} total ratings in catalog</p>
              </article>
            ))}
          </section>
        )}

        <section className="help" id="help" aria-label="Help and usage">
          <h2>How ranking works</h2>
          <p>Weighted score balances average rating with vote volume to avoid small-sample bias.</p>
          <p>
            Trending mode boosts beers with stronger recent posting activity from this workspace.
          </p>
          <p>
            Use ranking period, minimum ratings, and status filters to mimic discovery flows from
            major beer communities.
          </p>
        </section>
      </main>
    </>
  )
}

export default App
