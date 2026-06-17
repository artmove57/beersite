export interface Beer {
  id: number
  name: string
  brewery: string
  style: string
  country: string
  abv: number
  ibu: number
  rating: number
  ratingsCount: number
  description: string
  isRetired?: boolean
}
