export interface BusinessProfile {
  title: string;
  price: string | null;
  categoryName: string;
  address: string;
  neighborhood: string | null;
  street: string;
  city: string;
  postalCode: string;
  state: string;
  countryCode: string;
  phone: string;
  phoneUnformatted: string;
  website: string;
  claimThisBusiness: boolean;
  averageStarRating?: number;
  totalScore: number;
  permanentlyClosed: boolean;
  temporarilyClosed: boolean;
  placeId: string;
  reviewsCount: number;
  reviewsDistribution: ReviewsDistribution;
  imagesCount: number;
  imageCategories: string[];
  imageUrl: string;
  imageUrls: string[];
  location: {
    lat: number;
    lng: number;
  };
  plusCode: string;
  fid: string;
  cid: string;
  categories: string[];
  openingHours: { day: string; hours: string }[];
  reviews: Review[];
  reviewsTags: ReviewTag[];
  additionalInfo: AdditionalInfo;
  peopleAlsoSearch: PeopleAlsoSearch[];
  ownerUpdates: OwnerUpdate[];
  bookingLinks: BookingLink[];
  url: string;
  searchPageUrl: string;
  searchString: string;
  language: string;
  rank: number;
  isAdvertisement: boolean;
  kgmid: string;
}

export interface ReviewsDistribution {
  oneStar: number;
  twoStar: number;
  threeStar: number;
  fourStar: number;
  fiveStar: number;
}

export interface Review {
  reviewerId: string;
  reviewerUrl: string;
  name: string;
  reviewerNumberOfReviews: number;
  isLocalGuide: boolean;
  reviewerPhotoUrl: string;
  text: string | null;
  textTranslated: string | null;
  publishAt: string;
  publishedAtDate: string;
  likesCount: number;
  reviewId: string;
  reviewUrl: string;
  reviewOrigin: string;
  stars: number;
  rating: number | null;
  responseFromOwnerDate: string | null;
  responseFromOwnerText: string | null;
  reviewImageUrls: string[];
  reviewContext: Record<string, unknown>;
  reviewDetailedRating: Record<string, unknown>;
  visitedIn: string | null;
  originalLanguage: string | null;
  translatedLanguage: string | null;
}

export interface ReviewTag {
  title: string;
  count: number;
}

export interface AdditionalInfo {
  "From the business"?: { [key: string]: boolean }[];
  "Service options"?: { [key: string]: boolean }[];
  Accessibility?: { [key: string]: boolean }[];
  Amenities?: { [key: string]: boolean }[];
  Planning?: { [key: string]: boolean }[];
  Payments?: { [key: string]: boolean }[];
  Parking?: { [key: string]: boolean }[];
}

export interface PeopleAlsoSearch {
  category: string;
  title: string;
  reviewsCount: number;
  totalScore: number;
}

export interface OwnerUpdate {
  text: string;
  buttonText: string;
  buttonLink: string | null;
  date: string;
  imageUrl: string;
}

export interface BookingLink {
  name: string;
  url: string;
}

export interface Competitor {
  title: string;
  price: string | null;
  categoryName: string;
  address: string;
  neighborhood: string | null;
  street: string;
  city: string;
  postalCode: string;
  state: string;
  countryCode: string;
  website: string;
  phone: string;
  phoneUnformatted: string;
  claimThisBusiness: boolean;
  totalScore: number;
  permanentlyClosed: boolean;
  temporarilyClosed: boolean;
  placeId: string | null;
  categories: string[];
  fid: string;
  cid: string;
  reviewsCount: number;
  reviewsDistribution?: ReviewsDistribution;
  imagesCount: number | null;
  imageCategories: string[];
  openingHours: { day: string; hours: string }[];
  additionalInfo?: AdditionalInfo;
  url: string;
  searchPageUrl: string;
  searchString: string;
  language: string;
  rank: number;
  isAdvertisement: boolean;
  imageUrl: string;
  kgmid: string | null;
  location: {
    lat: number;
    lng: number;
  };
}

export interface WebsiteAnalysis {
  overall_score: number;
  overall_grade: string;
  pillars: AnalysisPillar[];
}

export interface GBPAnalysis {
  gbp_readiness_score: number;
  gbp_grade: string;
  sync_audit: {
    nap_match: boolean;
    mismatched_fields: string[];
    trust_gap_severity: string;
  };
  pillars: AnalysisPillar[];
}

export interface AnalysisPillar {
  category: string;
  score: number | string;
  key_finding: string;
  executive_recommendation?: string;
  action_items?: string[];
}

export interface NAPDetails {
  businessName: string;
  addresses: string[];
  phoneNumbers: string[];
  emails: string[];
}

export interface WebsiteMetadata {
  isSecure: boolean;
  loadTime: number;
  brokenLinks: string[];
  napDetails: NAPDetails;
}

export type AuditStage =
  | "input"
  | "scanning_website"
  | "analyzing_gbp"
  | "competitor_map"
  | "dashboard";

// Selected GBP from search dropdown
export interface SelectedGBP {
  placeId: string;
  name: string;
  formattedAddress: string;
  city: string;
  state: string;
  displayString: string; // "Business Name, City, State"
  practiceSearchString: string; // "Business Name, Full Address" for n8n webhook
  domain: string; // Extracted from websiteUri
  websiteUri: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number;
  category: string;
}

// API response types for Places search
export interface PlacesSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

export interface PlacesAutocompleteResponse {
  success: boolean;
  suggestions: PlacesSuggestion[];
  error?: string;
}

export interface PlacesDetailsResponse {
  success: boolean;
  place: SelectedGBP;
  error?: string;
}

// Audit process types for polling
export interface AuditStatusResponse {
  success: boolean;
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  realtime_status: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;

  screenshots: {
    mobile_url: string;
    desktop_url: string;
  } | null;

  website_analysis: WebsiteAnalysis | null;
  self_gbp: BusinessProfile | null;
  competitors: Competitor[] | null;
  gbp_analysis: GBPAnalysis | null;
}

export interface StartAuditResponse {
  success: boolean;
  audit_id: string;
  created_at: string;
  error?: string;
}
