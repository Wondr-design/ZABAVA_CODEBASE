import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Gift,
  MapPin,
  Calendar,
  TrendingUp,
  AlertCircle,
  Check,
  Loader2,
  Star,
  Ticket,
  Clock,
} from "lucide-react";
import { getApiConfig } from "@/lib/config";
import { format } from "date-fns";

interface PartnerVisitSummary {
  partnerId: string;
  partnerName: string;
  totalVisits: number;
  pendingVisits: number;
  totalPoints: number;
  pendingPoints?: number;
}

interface PointsHistoryEntry {
  type: "earned" | "redemption" | "pending";
  points: number;
  timestamp?: string;
  rewardName?: string;
  partnerId?: string;
  partnerName?: string;
  ticketType?: string;
  status?: "pending" | "confirmed";
}

interface VisitRecord {
  partnerId: string;
  partnerName: string;
  visitDate: string;
  confirmedDate?: string | null;
  pointsEarned: number;
  status: "visited" | "pending";
  ticketType: string;
  numPeople?: number;
  transport?: string;
  busRental?: string;
  cityCode?: string;
  categories?: string;
  age?: string;
  totalPrice?: number;
}

interface RedemptionRecord {
  id: string;
  rewardName: string;
  pointsSpent: number;
  redeemedAt: string;
  status: string;
  expiresAt: string;
  remainingPoints?: number;
  code?: string;
}

const safeFormatDate = (
  value?: string | Date | null,
  dateFormat = "MMM dd, yyyy"
) => {
  if (!value) {
    return "Date unavailable";
  }

  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return "Date unavailable";
  }

  try {
    return format(dateValue, dateFormat);
  } catch (error) {
    return "Date unavailable";
  }
};

interface UserPoints {
  user: {
    email: string;
    totalPoints: number;
    redeemedPoints: number;
    availablePoints: number;
  };
  statistics: {
    totalVisits: number;
    pendingVisits: number;
    totalPartners: number;
    totalRedemptions: number;
    visitsByPartner: PartnerVisitSummary[];
  };
  visits: VisitRecord[];
  pointsHistory: PointsHistoryEntry[];
  redemptions: RedemptionRecord[];
  availableRewards: Array<{
    id: string;
    name: string;
    description: string;
    pointsCost: number;
    category: string;
    imageUrl?: string;
    canRedeem: boolean;
    availableFor: string[];
  }>;
}

export default function BonusPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userData, setUserData] = useState<UserPoints | null>(null);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState<any>(null);

  const fetchUserPoints = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const apiConfig = getApiConfig();
      const response = await fetch(
        `${apiConfig.baseUrl}/api/bonus/user-points?email=${encodeURIComponent(
          email
        )}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch your bonus points");
      }

      const data = await response.json();
      setUserData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load bonus information");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeemReward = async (reward: any) => {
    // Validate inputs before making the request
    if (!userData?.user?.email) {
      setError("User email not found. Please refresh the page.");
      return;
    }

    if (!reward?.id) {
      setError("Invalid reward selected. Please try again.");
      return;
    }

    setIsRedeeming(true);
    setError("");

    try {
      const apiConfig = getApiConfig();
      if (import.meta.env.VITE_DEBUG) {
        console.log("Redeeming reward:", {
          email: userData.user.email,
          rewardId: reward.id,
        });
      }

      const response = await fetch(
        `${apiConfig.baseUrl}/api/bonus/redeem-reward`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userData.user.email,
            rewardId: reward.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to redeem reward");
      }

      const result = await response.json();
      setRedemptionSuccess(result.redemption);
      setSelectedReward(null);

      // Refresh user data
      await fetchUserPoints();
    } catch (err: any) {
      setError(err.message || "Failed to redeem reward");
    } finally {
      setIsRedeeming(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "discount":
        return "🏷️";
      case "freebie":
        return "🎁";
      case "experience":
        return "🎢";
      case "merchandise":
        return "🛍️";
      default:
        return "⭐";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "visited":
        return "success";
      case "pending":
        return "warning";
      case "delivered":
        return "success";
      default:
        return "secondary";
    }
  };

  const normalizePoints = (value: unknown) => {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };
  const visits = useMemo(() => {
    const visitList = userData?.visits ?? [];

    if (visitList.length === 0) {
      return [] as VisitRecord[];
  if (!userData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              Bonus Points Portal
            </CardTitle>
            <CardDescription>
              Enter your email to view your points and available rewards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && fetchUserPoints()}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={fetchUserPoints}
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "View My Points"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const safeFormatDate = (
    value: string | null | undefined,
    dateFormat: string
  ) => {
    if (!value) return "Date unavailable";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "Date unavailable";
    }

    return visitList.map((visit) => {
      const pointsEarned = normalizePoints(
        (visit as VisitRecord).pointsEarned ?? (visit as any).estimatedPoints
      );
      const normalizedStatus =
        (visit.status || "").toLowerCase() === "visited"
          ? "visited"
          : "pending";
      const partnerId =
        visit.partnerId || (visit as any).partner_id || "unknown-partner";
      const fallbackVisitDate =
        visit.visitDate ||
        (visit as any).confirmedDate ||
        (visit as any).preferredDateTime ||
        (visit as any).createdAt ||
        (visit as any).scannedAt ||
        new Date().toISOString();

      return {
        ...visit,
        partnerId,
        partnerName:
          visit.partnerName ||
          (visit as any).attractionName ||
          partnerId.toString().toUpperCase(),
        pointsEarned,
        status: normalizedStatus,
        confirmedDate: visit.confirmedDate || (visit as any).visitedAt || null,
        ticketType: visit.ticketType || (visit as any).ticket || "Standard",
        visitDate: fallbackVisitDate,
      } as VisitRecord;
    });
  }, [userData]);

  const redemptions = useMemo(
    () =>
      (userData?.redemptions ?? []).map((redemption) => ({
        ...redemption,
        pointsSpent: normalizePoints(redemption.pointsSpent),
      })),
    [userData]
  );

  const partnerStatsFromServer = useMemo(
    () => userData?.statistics?.visitsByPartner ?? [],
    [userData]
  );

  const derivedVisitData = useMemo(() => {
    if (visits.length === 0) {
      return {
        derivedPartnerStats: [] as PartnerVisitSummary[],
        confirmedPoints: 0,
        pendingPoints: 0,
        confirmedVisits: 0,
        pendingVisits: 0,
        partnerCount: 0,
      };
    }

    const partnerMap = new Map<string, PartnerVisitSummary>();
    let confirmedPoints = 0;
    let pendingPoints = 0;
    let confirmedVisits = 0;
    let pendingVisits = 0;

    visits.forEach((visit) => {
      const partnerId =
        visit.partnerId || visit.partnerName || "unknown-partner";
      const existing = partnerMap.get(partnerId) || {
        partnerId,
        partnerName: visit.partnerName || partnerId.toUpperCase(),
        totalVisits: 0,
        pendingVisits: 0,
        totalPoints: 0,
        pendingPoints: 0,
      };

      existing.totalVisits += 1;

      if (visit.status === "visited") {
        confirmedVisits += 1;
        const earned = normalizePoints(visit.pointsEarned);
        confirmedPoints += earned;
        existing.totalPoints += earned;
      } else {
        pendingVisits += 1;
        const pending = normalizePoints(visit.pointsEarned);
        pendingPoints += pending;
        existing.pendingVisits += 1;
        existing.pendingPoints = (existing.pendingPoints || 0) + pending;
      }

      partnerMap.set(partnerId, existing);
    });

    const derivedPartnerStats = Array.from(partnerMap.values()).sort(
      (a, b) => b.totalPoints - a.totalPoints
    );

    return {
      derivedPartnerStats,
      confirmedPoints,
      pendingPoints,
      confirmedVisits,
      pendingVisits,
      partnerCount: partnerMap.size,
    };
  }, [visits]);

  const partnerStats: PartnerVisitSummary[] = useMemo(() => {
    if (partnerStatsFromServer.length === 0) {
      return derivedVisitData.derivedPartnerStats;
    }

    const derivedLookup = new Map(
      derivedVisitData.derivedPartnerStats.map((summary) => [
        summary.partnerId,
        summary,
      ])
    );

    return partnerStatsFromServer.map((partner) => {
      const partnerId =
        partner.partnerId || (partner as any).partner_id || "unknown-partner";
      const derived = derivedLookup.get(partnerId);
      return {
        partnerId,
        partnerName:
          partner.partnerName ||
          derived?.partnerName ||
          partnerId.toUpperCase(),
        totalVisits: Math.max(
          0,
          Math.round(
            normalizePoints(partner.totalVisits ?? derived?.totalVisits ?? 0)
          )
        ),
        pendingVisits: Math.max(
          0,
          Math.round(
            normalizePoints(
              partner.pendingVisits ?? derived?.pendingVisits ?? 0
            )
          )
        ),
        totalPoints: normalizePoints(
          partner.totalPoints ?? derived?.totalPoints ?? 0
        ),
        pendingPoints: normalizePoints(
          (partner as any).pendingPoints ?? derived?.pendingPoints ?? 0
        ),
      };
    });
  }, [partnerStatsFromServer, derivedVisitData]);

  const derivedRedemptionPoints = useMemo(
    () =>
      redemptions.reduce(
        (sum, redemption) => sum + normalizePoints(redemption.pointsSpent),
        0
      ),
    [redemptions]
  );


  const serverTotalPoints = normalizePoints(userData?.user?.totalPoints ?? 0);
  const serverAvailablePoints = normalizePoints(userData?.user?.availablePoints ?? 0);
  const serverTotalPartners = Math.max(0, Math.round(normalizePoints(userData?.statistics?.totalPartners ?? 0)));
  const serverTotalRedemptions = Math.max(0, Math.round(normalizePoints(userData?.statistics?.totalRedemptions ?? 0)));
  const serverTotalVisits = Math.max(0, Math.round(normalizePoints(userData?.statistics?.totalVisits ?? 0)));
  const serverPendingVisits = Math.max(0, Math.round(normalizePoints(userData?.statistics?.pendingVisits ?? 0)));

  const totalPointsEarned =
    serverTotalPoints > 0
      ? serverTotalPoints
      : derivedVisitData.confirmedPoints;

  const availablePoints =
    serverAvailablePoints > 0
      ? serverAvailablePoints
      : Math.max(0, derivedVisitData.confirmedPoints - derivedRedemptionPoints);

  const totalPartnersVisited =
    serverTotalPartners > 0
      ? serverTotalPartners
      : derivedVisitData.partnerCount;

  const totalRedemptions =
    serverTotalRedemptions > 0 ? serverTotalRedemptions : redemptions.length;

  const totalVisits =
    serverTotalVisits > 0
      ? serverTotalVisits
      : derivedVisitData.confirmedVisits;

  const pendingVisitCount =
    serverPendingVisits > 0
      ? serverPendingVisits
      : derivedVisitData.pendingVisits;

  const pointsHistory = useMemo(() => {
    const historyFromServer: PointsHistoryEntry[] = (userData?.pointsHistory || []).map((entry) => {
      const normalizedType: PointsHistoryEntry['type'] =
        entry.type === 'redemption'
          ? 'redemption'
          : entry.type === 'pending'
            ? 'pending'
            : 'earned';
      const statusValue = (entry.status || '').toString().toLowerCase();
      const normalizedStatus =
        ['pending', 'awaiting', 'in review', 'applied'].includes(statusValue)
          ? 'pending'
          : statusValue
            ? 'confirmed'
            : normalizedType === 'earned'
              ? 'confirmed'
              : undefined;

      return {
        ...entry,
        type: normalizedType,
        points: normalizePoints(entry.points),
        status: normalizedStatus,
      };
    });

    const fallbackHistory: PointsHistoryEntry[] = [
      ...visits.map((visit) => {
        const baseEntry = {
          points: normalizePoints(visit.pointsEarned),
          partnerId: visit.partnerId,
          partnerName: visit.partnerName,
          rewardName: visit.partnerName,
          timestamp:
            visit.status === "visited"
              ? visit.confirmedDate || visit.visitDate
              : visit.visitDate,
          ticketType: visit.ticketType,
        };

        if (visit.status === "visited") {
          return {
            ...baseEntry,
            type: "earned" as const,
            status: "confirmed" as const,
          };
        }

        return {
          ...baseEntry,
          type: "pending" as const,
          status: "pending" as const,
        };
      }),
      ...redemptions.map((redemption) => {
        const redemptionStatus = (redemption.status || "").toLowerCase();
        const isPendingStatus = ["pending", "applied"].includes(
          redemptionStatus
        );

        return {
          type: "redemption" as const,
          points: normalizePoints(redemption.pointsSpent),
          rewardName: redemption.rewardName,
          timestamp: redemption.redeemedAt,
          status: isPendingStatus ? "pending" : "confirmed",
        } satisfies PointsHistoryEntry;
      }),
    ];

    if (historyFromServer.length === 0) {
      return fallbackHistory.sort((a, b) => {
        const aDate = new Date(a.timestamp || "").getTime();
        const bDate = new Date(b.timestamp || "").getTime();
        return Number.isNaN(bDate)
          ? -1
          : Number.isNaN(aDate)
          ? 1
          : bDate - aDate;
      });
    }

    const existingKeys = new Set(
      historyFromServer.map(
        (entry) =>
          `${entry.type}-${entry.status || ""}-${entry.points}-${
            entry.timestamp
          }-${entry.partnerId || entry.rewardName || ""}`
      )
    );

    const mergedHistory = [...historyFromServer];

    fallbackHistory.forEach((entry) => {
      const key = `${entry.type}-${entry.status || ""}-${entry.points}-${
        entry.timestamp
      }-${entry.partnerId || entry.rewardName || ""}`;
      if (!existingKeys.has(key)) {
        mergedHistory.push(entry);
      }
    });

    return mergedHistory.sort((a, b) => {
      const aDate = new Date(a.timestamp || "").getTime();
      const bDate = new Date(b.timestamp || "").getTime();
      return Number.isNaN(bDate) ? -1 : Number.isNaN(aDate) ? 1 : bDate - aDate;
    });
  }, [userData, visits, redemptions]);

  if (!userData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              Bonus Points Portal
            </CardTitle>
            <CardDescription>
              Enter your email to view your points and available rewards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchUserPoints()}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={fetchUserPoints}
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'View My Points'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  //const partnerStats = userData.statistics?.visitsByPartner || [];
  //const pointsHistory = userData.pointsHistory || [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Points Overview */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-muted-foreground">{userData.user.email}</p>
      </div>

      {/* Points Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Available Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {availablePoints}
            </div>
            <p className="text-xs text-muted-foreground">Ready to redeem</p>
            {derivedVisitData.pendingPoints > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {derivedVisitData.pendingPoints} pts awaiting partner
                confirmation
              </p>
            )}
            {derivedVisitData.pendingPoints > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Total potential:{" "}
                {availablePoints + derivedVisitData.pendingPoints} pts
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPointsEarned}</div>
            <p className="text-xs text-muted-foreground">Lifetime points</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Partners Visited
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPartnersVisited}</div>
            <p className="text-xs text-muted-foreground">Unique locations</p>
            {totalVisits > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {totalVisits} visits confirmed
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Rewards Redeemed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRedemptions}</div>
            <p className="text-xs text-muted-foreground">Total redemptions</p>
            {pendingVisitCount > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {pendingVisitCount} visit{pendingVisitCount === 1 ? "" : "s"}{" "}
                pending confirmation
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {partnerStats.length > 0 && (
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Points by Partner
            </CardTitle>
            <CardDescription>
              Track how many confirmed points you have earned at each partner
              location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {partnerStats.map((partner) => (
                <div
                  key={partner.partnerId}
                  className="rounded-lg border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {partner.partnerName}
                      </p>
                      <p className="text-2xl font-semibold text-primary">
                        {partner.totalPoints + (partner.pendingPoints || 0)} pts
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {partner.totalPoints} confirmed
                        {partner.pendingPoints
                          ? ` • ${partner.pendingPoints} pending`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary">
                        {(partner.totalVisits || 0) -
                          (partner.pendingVisits || 0)}{" "}
                        confirmed
                      </Badge>
                      {partner.pendingVisits > 0 && (
                        <Badge variant="outline">
                          {partner.pendingVisits} pending
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Pending visits: {partner.pendingVisits}</p>
                    <p>Pending points: {partner.pendingPoints || 0}</p>
                    <p>Partner code: {partner.partnerId.toUpperCase()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="rewards" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rewards">Available Rewards</TabsTrigger>
          <TabsTrigger value="visits">Visit History</TabsTrigger>
          <TabsTrigger value="points">Points History</TabsTrigger>
          <TabsTrigger value="redemptions">My Redemptions</TabsTrigger>
        </TabsList>

        {/* Available Rewards Tab */}
        <TabsContent value="rewards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userData.availableRewards.map((reward) => (
              <Card
                key={reward.id}
                className={!reward.canRedeem ? "opacity-60" : ""}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span>{getCategoryIcon(reward.category)}</span>
                        {reward.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {reward.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="font-bold text-lg">
                        {reward.pointsCost} points
                      </span>
                    </div>
                    <Badge variant={reward.canRedeem ? "default" : "secondary"}>
                      {reward.canRedeem ? "Available" : "Insufficient Points"}
                    </Badge>
                  </div>

                  {reward.imageUrl && (
                    <img
                      src={reward.imageUrl}
                      alt={reward.name}
                      className="w-full h-32 object-cover rounded-md mb-4"
                    />
                  )}

                  <Button
                    className="w-full"
                    disabled={!reward.canRedeem}
                    onClick={() => setSelectedReward(reward)}
                  >
                    Redeem Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {userData.availableRewards.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No rewards available</AlertTitle>
              <AlertDescription>
                Visit more partners to unlock rewards!
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Visit History Tab */}
        <TabsContent value="visits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Visits</CardTitle>
              <CardDescription>
                Track your visits to partner locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {visits.length > 0 ? (
                  <div className="space-y-4">
                    {visits.map((visit, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-3 border-b last:border-0"
                      >
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{visit.partnerName}</p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {safeFormatDate(visit.visitDate, "MMM dd, yyyy")}
                              {visit.status === "visited" &&
                                visit.confirmedDate && (
                                  <>
                                    <span>•</span>
                                    <Check className="h-3 w-3" />
                                    Confirmed{" "}
                                    {safeFormatDate(
                                      visit.confirmedDate,
                                      "MMM dd, yyyy"
                                    )}
                                  </>
                                )}
                              <span>•</span>
                              <Ticket className="h-3 w-3" />
                              {visit.ticketType}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={getStatusColor(visit.status) as any}>
                            {visit.status}
                          </Badge>
                          <p className="text-sm font-medium mt-1">
                            +{visit.pointsEarned} pts
                            {visit.status === "pending" ? " pending" : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[200px] items-center justify-center">
                    <p className="text-center text-sm text-muted-foreground">
                      We couldn't find any visits for this email yet.
                      Double-check that you registered or checked in with this
                      address, or check back after a partner confirms your
                      visit.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Points History Tab */}
        <TabsContent value="points" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Points History</CardTitle>
              <CardDescription>Your points earned and redeemed</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {pointsHistory.length > 0 ? (
                  <div className="space-y-4">
                    {pointsHistory.map((entry, index) => {
                      const amountClass =
                        entry.type === "redemption"
                          ? "text-red-500"
                          : entry.type === "pending"
                          ? "text-amber-500"
                          : "text-green-500";
                      const amountPrefix =
                        entry.type === "redemption" ? "-" : "+";
                      const amountSuffix =
                        entry.type === "pending" ? "pts pending" : "pts";
                      const amountValue = Math.abs(entry.points);
                      const title =
                        entry.type === "earned"
                          ? "Points Confirmed"
                          : entry.type === "pending"
                          ? "Points Pending Confirmation"
                          : "Reward Redeemed";

                      return (
                        <div
                          key={index}
                          className="flex flex-col gap-3 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-start gap-3">
                            {entry.type === "earned" ? (
                              <TrendingUp className="mt-0.5 h-5 w-5 text-green-500" />
                            ) : entry.type === "pending" ? (
                              <Clock className="mt-0.5 h-5 w-5 text-amber-500" />
                            ) : (
                              <Gift className="mt-0.5 h-5 w-5 text-blue-500" />
                            )}
                            <div>
                              <p className="font-medium">{title}</p>
                              <p className="text-sm text-muted-foreground">
                                {entry.rewardName ||
                                  entry.partnerName ||
                                  "Partner activity"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {safeFormatDate(
                                  entry.timestamp,
                                  "MMM dd, yyyy HH:mm"
                                )}
                              </p>
                              {entry.status === "pending" && (
                                <p className="mt-1 text-xs font-medium text-amber-600">
                                  Awaiting partner confirmation
                                </p>
                              )}
                            </div>
                          </div>
                          <div className={`text-sm font-bold ${amountClass}`}>
                            {amountPrefix}
                            {amountValue} {amountSuffix}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[200px] items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      No points history found yet. Earn points by visiting
                      partners or redeem rewards to see activity here.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Redemptions Tab */}
        <TabsContent value="redemptions" className="space-y-4">
          {/* Active Redemptions Info Box */}
          {redemptions.filter(
            (r) => r.status === "pending" || r.status === "applied"
          ).length > 0 && (
            <Alert className="border-primary">
              <Star className="h-4 w-4" />
              <AlertTitle>How to use your redemption codes</AlertTitle>
              <AlertDescription>
                When booking your next visit on our website, enter the
                redemption code in the "Redemption Code" field. The partner will
                see your reward details and process it when you arrive.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4">
            {redemptions.map((redemption) => {
              const isActive =
                redemption.status === "pending" ||
                redemption.status === "applied";
              const isUsed = redemption.status === "used";
              const expiryDate = redemption.expiresAt
                ? new Date(redemption.expiresAt)
                : null;
              const isExpired =
                !!expiryDate &&
                !Number.isNaN(expiryDate.getTime()) &&
                expiryDate < new Date();

              return (
                <Card
                  key={redemption.id}
                  className={!isActive ? "opacity-75" : ""}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Gift className="h-5 w-5" />
                          {redemption.rewardName}
                        </CardTitle>
                        <div className="mt-2 p-3 bg-muted rounded-md">
                          <p className="text-xs text-muted-foreground mb-1">
                            Redemption Code:
                          </p>
                          <p className="font-mono text-lg font-bold">
                            {redemption.id}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge
                          variant={getStatusColor(redemption.status) as any}
                        >
                          {redemption.status === "pending"
                            ? "Ready to Use"
                            : redemption.status === "applied"
                            ? "Applied to Booking"
                            : redemption.status === "used"
                            ? "Used"
                            : redemption.status}
                        </Badge>
                        {isExpired && !isUsed && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {isActive && !isExpired && (
                        <Alert className="bg-blue-50 border-blue-200">
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-sm">
                            <strong>To use this reward:</strong> Enter code{" "}
                            <span className="font-mono font-bold">
                              {redemption.id}
                            </span>
                            when making your next booking on our website.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Redeemed</p>
                          <p className="font-medium">
                            {safeFormatDate(
                              redemption.redeemedAt,
                              "MMM dd, yyyy"
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Points Spent</p>
                          <p className="font-medium">
                            {redemption.pointsSpent} pts
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expires</p>
                          <p className="font-medium">
                            {safeFormatDate(
                              redemption.expiresAt,
                              "MMM dd, yyyy"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {redemptions.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No redemptions yet</AlertTitle>
                <AlertDescription>
                  Start redeeming your points for exciting rewards!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Redemption Dialog */}
      <Dialog
        open={!!selectedReward}
        onOpenChange={() => setSelectedReward(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Redemption</DialogTitle>
            <DialogDescription>
              Are you sure you want to redeem this reward?
            </DialogDescription>
          </DialogHeader>

          {selectedReward && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">{selectedReward.name}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedReward.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Points Cost:</span>
                  <span className="font-bold">
                    {selectedReward.pointsCost} pts
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm">Your Balance After:</span>
                  <span className="font-bold">
                    {userData.user.availablePoints - selectedReward.pointsCost}{" "}
                    pts
                  </span>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReward(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleRedeemReward(selectedReward)}
              disabled={isRedeeming}
            >
              {isRedeeming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redeeming...
                </>
              ) : (
                "Confirm Redemption"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        open={!!redemptionSuccess}
        onOpenChange={() => setRedemptionSuccess(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Redemption Successful!
            </DialogTitle>
          </DialogHeader>

          {redemptionSuccess && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <Trophy className="h-4 w-4 text-green-600" />
                <AlertTitle>Your Redemption Code</AlertTitle>
                <AlertDescription className="mt-3">
                  <div className="text-center p-3 bg-white rounded-md border-2 border-dashed border-green-300">
                    <p className="text-2xl font-mono font-bold text-green-600">
                      {redemptionSuccess.code}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm">
                  <strong>Reward:</strong> {redemptionSuccess.rewardName}
                </p>
                <p className="text-sm">
                  <strong>Points Spent:</strong> {redemptionSuccess.pointsSpent}{" "}
                  pts
                </p>
                <p className="text-sm">
                  <strong>Remaining Balance:</strong>{" "}
                  {redemptionSuccess.remainingPoints} pts
                </p>
                <p className="text-sm">
                  <strong>Valid Until:</strong>{" "}
                  {safeFormatDate(redemptionSuccess.expiresAt, "MMMM dd, yyyy")}
                </p>
              </div>

              <Alert className="border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-sm">
                  How to use this code
                </AlertTitle>
                <AlertDescription className="text-sm mt-2">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to our booking website</li>
                    <li>Fill out the appointment form</li>
                    <li>
                      Enter code{" "}
                      <span className="font-mono font-bold">
                        {redemptionSuccess.code}
                      </span>{" "}
                      in the "Redemption Code" field
                    </li>
                    <li>The partner will apply your reward when you arrive</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setRedemptionSuccess(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
