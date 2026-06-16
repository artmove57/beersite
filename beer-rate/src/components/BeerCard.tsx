import type { Beer } from '../types/beer'

interface BeerCardProps {
  beer: Beer
  rank: number
  displayRating: number
  displayRatingsCount: number
  userRating?: number
}

export function BeerCard({
  beer,
  rank,
  displayRating,
  displayRatingsCount,
  userRating,
}: BeerCardProps) {
  return (
    <article className="beer-card">
      <div className="rank">#{rank}</div>
      <div className="beer-info">
        <div className="beer-title-row">
          <span className="beer-icon" aria-hidden="true">BR</span>
          <h3>{beer.name}</h3>
        </div>
        <p className="meta">
          {beer.brewery} • {beer.style} • {beer.country}
        </p>
        <p className="description">{beer.description}</p>
        {beer.isRetired && <p className="retired">No longer produced</p>}
      </div>
      <div className="score-block">
        <div className="score">{displayRating.toFixed(2)}</div>
        <div className="ratings">{displayRatingsCount.toLocaleString()} ratings</div>
        {userRating ? <div className="my-rating">Your posted rating: {userRating}/5</div> : null}
      </div>
    </article>
  )
}
