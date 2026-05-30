import { useMemo, useState } from 'react'
import { BeerCard } from './components/BeerCard'
import { Filters } from './components/Filters'
import { Header } from './components/Header'
import { Tabs } from './components/Tabs'
import { beers } from './data/beers'

type TabKey = 'beers' | 'breweries'
type SortKey = 'rating' | 'ratingsCount' | 'name'

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('beers')
  const [search, setSearch] = useState('')
  const [style, setStyle] = useState('Show All Styles')
  const [country, setCountry] = useState('Show All Countries')
  const [sort, setSort] = useState<SortKey>('rating')

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

    return result.sort((a, b) => {
      if (sort === 'name') {
        return a.name.localeCompare(b.name)
      }

      if (sort === 'ratingsCount') {
        return b.ratingsCount - a.ratingsCount
      }

      return b.rating - a.rating
    })
  }, [search, style, country, sort])

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
      <Header />
      <main className="page">
        <section className="intro">
          <h1>Top Rated Beers</h1>
          <p>
            This page shows highly rated beers based on average user ratings and number of
            reviews.
          </p>
          <p className="note">Demo project: all data is local mock data.</p>
        </section>

        <Tabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'beers' ? (
          <>
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

            <section className="list" aria-label="Beer list">
              {filteredBeers.length === 0 ? (
                <p className="empty">No beers found with the selected filters.</p>
              ) : (
                filteredBeers.map((beer, index) => <BeerCard key={beer.id} beer={beer} rank={index + 1} />)
              )}
            </section>
          </>
        ) : (
          <section className="breweries" aria-label="Brewery list">
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
      </main>
    </>
  )
}

export default App
