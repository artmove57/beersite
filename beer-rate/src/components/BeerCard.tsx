import type { Beer } from '../types/beer'

interface BeerCardProps {
  beer: Beer
  rank: number
  displayRating: number
  displayRatingsCount: number
  weightedScore: number
  trendingScore: number
  addedCount: number
  userRating?: number
}

export function BeerCard({
  beer,
  rank,
  displayRating,
  displayRatingsCount,
  weightedScore,
  trendingScore,
  addedCount,
  userRating,
}: BeerCardProps) {
  return (
    <article className="beer-card">
      <div className="rank-block">
        <span className="rank">#{rank}</span>
        <span className="rank-subtitle">Top list</span>
      </div>

      <div className="beer-info">
        <div className="beer-title-row">
          <span className="beer-icon" aria-hidden="true">
            BR
          </span>
          <h3>{beer.name}</h3>
        </div>

        <p className="meta brewery">{beer.brewery}</p>
        <p className="meta tags">
          <span>{beer.style}</span>
          <span>{beer.country}</span>
          <span>{beer.abv.toFixed(1)}% ABV</span>
          <span>{beer.ibu} IBU</span>
        </p>

        <p className="description">{beer.description}</p>

        <p className="meta ranking-meta">
          Weighted score {weightedScore.toFixed(2)} / Trending {trendingScore.toFixed(2)}
        </p>

        {beer.isRetired && <p className="retired">No longer produced</p>}
      </div>

      <div className="score-block">
        <div className="score">{displayRating.toFixed(2)}</div>
        <div className="score-caption">Avg / 5</div>
        <div className="ratings">{displayRatingsCount.toLocaleString()} ratings</div>
        {addedCount > 0 ? <div className="recent-activity">+{addedCount} recent posts</div> : null}
        {userRating ? <div className="my-rating">Your posted rating: {userRating}/5</div> : null}
      </div>
    </article>
  )
}
