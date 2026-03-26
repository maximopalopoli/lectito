export interface RecommendationCandidate {
  title: string;
  authors: string[];
  coverUrl: string | null;
  isbn13: string | null;
  isbn10: string | null;
  pageCount: number;
  subjects: string[];
  openLibraryKey: string;
}

export interface Recommendation extends RecommendationCandidate {
  reason: string;
  score: number;
}

export interface RecommendationsCache {
  recommendations: Recommendation[];
  generatedAt: string;
  basedOnBookIds: string[];
}
