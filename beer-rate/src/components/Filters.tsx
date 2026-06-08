interface FiltersProps {
  search: string
  style: string
  country: string
  sort: string
  onSearchChange: (value: string) => void
  onStyleChange: (value: string) => void
  onCountryChange: (value: string) => void
  onSortChange: (value: string) => void
}

const styles = ['Show All Styles', 'IPA', 'Stout', 'Barleywine', 'Sour', 'Lager', 'Porter']

const countries = [
  'Show All Countries',
  'United States',
  'Belgium',
  'Estonia',
  'Germany',
  'United Kingdom',
  'Netherlands',
]

export function Filters({
  search,
  style,
  country,
  sort,
  onSearchChange,
  onStyleChange,
  onCountryChange,
  onSortChange,
}: FiltersProps) {
  return (
    <section className="filters" aria-label="Beer filters">
      <input
        type="text"
        value={search}
        className="input"
        placeholder="Search by beer or brewery"
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <select value={style} className="select" onChange={(event) => onStyleChange(event.target.value)}>
        {styles.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select value={country} className="select" onChange={(event) => onCountryChange(event.target.value)}>
        {countries.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select value={sort} className="select" onChange={(event) => onSortChange(event.target.value)}>
        <option value="rating">Rating high to low</option>
        <option value="ratingsCount">Most ratings</option>
        <option value="name">Name A-Z</option>
      </select>
    </section>
  )
}
