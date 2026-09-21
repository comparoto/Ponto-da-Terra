export interface Stats {
  label: string;
  value: string;
  description: string;
}

export interface FeaturedProduct {
  id: string;
  title: string;
  location: string;
  region: string;
  tag: string;
  imageUrl: string;
  verified: boolean;
}

export interface SearchState {
  query: string;
  category?: string;
}