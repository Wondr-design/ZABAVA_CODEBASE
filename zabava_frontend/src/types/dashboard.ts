export interface SubmissionRecord {
  id?: string;
  email?: string;
  Categories?: string;
  ticket?: string;
  numPeople?: number;
  totalPrice?: number;
  estimatedPoints?: number;
  used?: boolean;
  visited?: boolean;
  visitedAt?: string;
  createdAt?: string;
  cityCode?: string;
  attractionName?: string;
  partnerName?: string;
  partnerLabel?: string;
  // Redemption fields
  redemptionCode?: string;
  hasRedemption?: string;
  redemptionReward?: string;
  redemptionValue?: number;
  originalPayload?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface PartnerDashboardData {
  partner?: string;
  submissions?: SubmissionRecord[];
  totals?: {
    count?: number;
    used?: number;
    unused?: number;
    visited?: number;
    notVisited?: number;
    revenue?: number;
    points?: number;
    averageRevenue?: number;
    averagePoints?: number;
    [key: string]: number | undefined;
  };
  [key: string]: unknown;
}

export interface AnalyticsPartnerOption {
  id: string;
  label?: string;
  [key: string]: unknown;
}

export interface AdminPartnerSummary {
  id: string;
  label?: string;
  metrics: {
    count: number;
    used: number;
    revenue: number;
    [key: string]: number;
  };
  lastSubmissionAt?: string;
  [key: string]: unknown;
}

export interface AdminAnalyticsOverview {
  totals?: Record<string, number>;
  revenueTrend?: Array<{ date?: string; label?: string; revenue: number }>;
  latestSubmissions?: SubmissionRecord[];
  partners?: AdminPartnerSummary[];
  [key: string]: unknown;
}

export interface AdminOverviewResponse {
  totals?: Record<string, number>;
  quickActions?: Record<string, number>;
  [key: string]: unknown;
}

export interface AdminPartnerDirectoryItem {
  partnerId: string;
  status?: string;
  contract?: {
    monthlyFee?: number;
    discountRate?: number;
    commissionRate?: number;
    commissionBasis?: string;
  };
  ticketing?: {
    ticketTypes?: string[];
    familyRule?: string;
  };
  info?: {
    contactName?: string;
    contactEmail?: string;
    payments?: string[];
    facilities?: string[];
    website?: string;
  };
  bonusProgramEnabled?: boolean;
  notes?: string;
  updatedAt?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface PartnerFormState {
  partnerId: string;
  status: string;
  monthlyFee: string;
  discountRate: string;
  commissionRate: string;
  commissionBasis: string;
  ticketTypes: string;
  familyRule: string;
  contactName: string;
  contactEmail: string;
  payments: string;
  facilities: string;
  website: string;
  bonusProgramEnabled: boolean;
  notes: string;
  updatedAt: string | null;
  createdAt: string | null;
}

export interface AdminInvite {
  token: string;
  email?: string;
  name?: string;
  partnerId?: string;
  inviteUrl?: string;
  expiresAt?: string;
  createdAt?: string;
  usedAt?: string;
  used?: boolean;
  [key: string]: unknown;
}

export interface InviteSummaryMessage {
  type: "success" | "error";
  text: string;
}
