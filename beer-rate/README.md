# BeerRate

BeerRate is a small educational frontend project inspired by a beer rating page layout.
It shows top-rated beers using local mock data and simple client-side filters.

## Technologies

- Vite
- React
- TypeScript
- Plain CSS
- Express
- SQLite

## Features

- Header with project branding and navigation links
- Top Rated Beers page with short intro text
- Two tabs: Beers and Breweries
- Working filters for search, style, country, and sorting
- Local mock beer catalog plus persisted user ratings in SQLite
- Local API for posting and loading ratings (`/api/ratings`)
- SQLite schema with `beer_styles`, `beers`, and `ratings` tables
- Beer styles API endpoint (`/api/styles`) with rating aggregates per style
- Responsive card layout for mobile and desktop

## How to run

1. Install dependencies:

   npm install

2. Start frontend + API together:

   npm run dev:full

   This starts:
   - Vite app on http://localhost:5173
   - Ratings API on http://localhost:3001

3. Start frontend only (optional):

   npm run dev

4. Build production bundle:

   npm run build

## Notes

- Beer metadata is synchronized into SQLite on API start (`beers` and `beer_styles`).
- User ratings are persisted in `server/data/ratings.db` (`ratings` table).
- This is an educational frontend project inspired by a beer rating page.
