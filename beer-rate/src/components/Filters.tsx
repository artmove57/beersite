interface FiltersProps {
  search: string
  style: string
  country: string
  sort: string
  timeRange: string
  minRatings: number
  retiredFilter: string
  styleOptions: string[]
  countryOptions: string[]
  onSearchChange: (value: string) => void
  onStyleChange: (value: string) => void
  onCountryChange: (value: string) => void
  onSortChange: (value: string) => void
  onTimeRangeChange: (value: string) => void
  onMinRatingsChange: (value: number) => void
  onRetiredFilterChange: (value: string) => void
}

const ratingFloorOptions = [0, 250, 500, 750, 1000, 1500]

export function Filters({
  search,
  style,
  country,
  sort,
  timeRange,
  minRatings,
  retiredFilter,
  styleOptions,
  countryOptions,
  onSearchChange,
  onStyleChange,
  onCountryChange,
  onSortChange,
  onTimeRangeChange,
  onMinRatingsChange,
  onRetiredFilterChange,
}: FiltersProps) {
  return (
    <section className="filters" aria-label="Beer filters">
      <label className="filter-item filter-item--search" htmlFor="beer-search">
        <span className="filter-label">Search</span>
        <input
          id="beer-search"
          type="text"
          value={search}
          className="input"
          placeholder="Search beer, brewery, style"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      <label className="filter-item" htmlFor="time-range">
        <span className="filter-label">Ranking period</span>
        <select
          id="time-range"
          value={timeRange}
          className="select"
          onChange={(event) => onTimeRangeChange(event.target.value)}
        >
          <option value="all">All time</option>
          <option value="month">Last 30 days</option>
          <option value="week">Last 7 days</option>
        </select>
      </label>

      <label className="filter-item" htmlFor="style-filter">
        <span className="filter-label">Style</span>
        <select
          id="style-filter"
          value={style}
          className="select"
          onChange={(event) => onStyleChange(event.target.value)}
        >
          {styleOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-item" htmlFor="country-filter">
        <span className="filter-label">Country</span>
        <select
          id="country-filter"
          value={country}
          className="select"
          onChange={(event) => onCountryChange(event.target.value)}
        >
          {countryOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-item" htmlFor="sort-filter">
        <span className="filter-label">Sort by</span>
        <select
          id="sort-filter"
          value={sort}
          className="select"
          onChange={(event) => onSortChange(event.target.value)}
        >
          <option value="weighted">Weighted score</option>
          <option value="rating">Raw average rating</option>
          <option value="trending">Trending now</option>
          <option value="ratingsCount">Most ratings</option>
          <option value="name">Name A-Z</option>
        </select>
      </label>

      <label className="filter-item" htmlFor="rating-floor">
        <span className="filter-label">Minimum ratings</span>
        <select
          id="rating-floor"
          value={minRatings}
          className="select"
          onChange={(event) => onMinRatingsChange(Number(event.target.value))}
        >
          {ratingFloorOptions.map((item) => (
            <option key={item} value={item}>
              {item === 0 ? 'Any volume' : `${item}+ ratings`}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-item" htmlFor="retired-filter">
        <span className="filter-label">Catalog status</span>
        <select
          id="retired-filter"
          value={retiredFilter}
          className="select"
          onChange={(event) => onRetiredFilterChange(event.target.value)}
        >
          <option value="include">Include retired</option>
          <option value="active-only">Only active beers</option>
        </select>
      </label>
    </section>
  )
}
