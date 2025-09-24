import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Sidebar } from "@/components/Sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InviteManager from "./InviteManager";
import RewardsManagement from "./RewardsManagement";
import { SubmissionsTable } from "@/components/SubmissionsTable";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  RefreshCw,
  Download,
  ArrowUpRight,
  Bell,
  UserPlus,
  Gift,
  FileText,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { buildApiUrl } from "@/lib/config";
import { AdminPartnerSummary, SubmissionRecord } from "@/types/dashboard";

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

// Format date function - same as original AdminDashboard
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Interface definitions
interface ChartDataPoint {
  date: string;
  partners: number;
  users: number;
  revenue: number;
}

interface PieDataPoint {
  name: string;
  value: number;
  revenue: number;
}

interface RecentActivityItem {
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

type Submission = SubmissionRecord & {
  partnerId: string;
  partnerName?: string;
};

const getSubmissionTimestamp = (value?: string | null): number => {
  if (!value) {
    return 0;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const sortSubmissionsByCreatedAt = <T extends { createdAt?: string | null }>(
  entries: T[]
): T[] => {
  return [...entries].sort(
    (a, b) => getSubmissionTimestamp(b.createdAt) - getSubmissionTimestamp(a.createdAt)
  );
};

// Format relative time for notifications
const formatRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  return format(date, "MMM d, yyyy");
};

function toDisplayDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function buildPartnerGrowthDataset(submissions: Submission[]): ChartDataPoint[] {
  if (!Array.isArray(submissions) || submissions.length === 0) {
    return [];
  }

  const aggregation = new Map<
    string,
    { revenue: number; users: number; partners: Set<string> }
  >();

  submissions.forEach((submission) => {
    if (!submission.createdAt) {
      return;
    }
    const timestamp = new Date(submission.createdAt);
    if (Number.isNaN(timestamp.getTime())) {
      return;
    }
    const key = timestamp.toISOString().slice(0, 10);
    if (!aggregation.has(key)) {
      aggregation.set(key, {
        revenue: 0,
        users: 0,
        partners: new Set<string>(),
      });
    }
    const entry = aggregation.get(key)!;
    entry.revenue += Number(submission.totalPrice || 0);
    entry.users += 1;
    if (submission.partnerId) {
      entry.partners.add(submission.partnerId);
    }
  });

  return Array.from(aggregation.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([iso, value]) => ({
      date: toDisplayDate(iso),
      partners: value.partners.size,
      users: value.users,
      revenue: value.revenue,
    }));
}

function buildRevenueByPartnerDataset(
  partners: AdminPartnerSummary[] | undefined
): PieDataPoint[] {
  if (!Array.isArray(partners)) {
    return [];
  }

  return partners
    .map((partner) => {
      const revenue = Number(partner.metrics?.revenue ?? 0);
      return {
        name: partner.id,
        value: revenue,
        revenue,
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function buildRecentActivityItems(submissions: Submission[]): RecentActivityItem[] {
  if (!Array.isArray(submissions) || submissions.length === 0) {
    return [];
  }

  return submissions.slice(0, 6).map((submission) => {
    const email = submission.email || "Guest";
    const ticket = submission.ticket || submission.Categories || "Submission";
    const description = submission.partnerName
      ? `${submission.partnerName} • ${ticket}`
      : ticket;
    return {
      type: submission.visited ? "submission" : "system",
      title: submission.visited ? "Visit confirmed" : "New submission received",
      description: `${email} · ${description}`,
      timestamp: submission.createdAt || new Date().toISOString(),
    };
  });
}

interface AdminMetrics {
  totalPartners: number;
  totalUsers: number;
  totalRevenue: number;
  totalRedemptions: number;
  recentActivity: RecentActivityItem[];
  partnerGrowth: ChartDataPoint[];
  revenueByPartner: PieDataPoint[];
  revenueTrend: Array<{ date: string; value: number }>;
  partners: AdminPartnerSummary[];
  submissions?: Submission[];
  analyticsTotals?: Record<string, number>;
  generatedAt?: string;
}

interface OverviewData {
  totals?: {
    activePartners?: number;
    users?: number;
    totalRevenue?: number;
    redemptions?: number;
    qrsGeneratedToday?: number;
    monthlyVisitors?: number;
  };
  recentActivity?: RecentActivityItem[];
  quickActions?: {
    pendingPartnerApprovals?: number;
  };
}

interface AnalyticsData {
  totals?: Record<string, number>;
  revenueTrend?: Array<{ date?: string; value?: number }>;
  latestSubmissions?: SubmissionRecord[];
  partners?: AdminPartnerSummary[];
  generatedAt?: string;
}

export default function AdminDashboardLight() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    fetchNotifications,
  } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeView, setActiveView] = useState("overview");
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalPartners: 0,
    totalUsers: 0,
    totalRevenue: 0,
    totalRedemptions: 0,
    recentActivity: [],
    partnerGrowth: [],
    revenueByPartner: [],
    revenueTrend: [],
    partners: [],
    submissions: [],
    analyticsTotals: {},
  });
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Formatters - same as original AdminDashboard
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    []
  );
  const currencyFormatterDetailed = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }),
    []
  );
  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  // Simple formatting helpers used by child views
  const formatNumber = (value: number): string => numberFormatter.format(value);
  const formatCurrency = (value: number): string => currencyFormatter.format(value);
  const formatCurrencyDetailed = (value: number): string =>
    currencyFormatterDetailed.format(value);

  // Admin access check - same as original AdminDashboard
  useEffect(() => {
    if (!isAdmin) {
      navigate("/admin/login", { replace: true });
    }
  }, [isAdmin, navigate]);

  const loadSubmissions = useCallback(async (): Promise<Submission[]> => {
    if (!isAdmin || !token) {
      return [];
    }

    try {
      const adminSecret = import.meta.env.VITE_ADMIN_SECRET || "zabava";
      const response = await fetch(
        buildApiUrl("/api/admin/analytics", { mode: "submissions", limit: 500 }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-admin-secret": adminSecret,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Submissions fetch failed: ${response.status}`);
      }

      const payload: SubmissionSearchResponse = await response.json();
      const items = Array.isArray(payload.items) ? payload.items : [];
      const mapped = items.map((item) => ({
        ...item,
        partnerId:
          (item as Submission).partnerId ||
          (item as SubmissionRecord & { partnerId?: string }).partnerId ||
          "",
      }));
      return sortSubmissionsByCreatedAt(mapped);
    } catch (error) {
      console.error("Failed to fetch submissions dataset", error);
      return [];
    }
  }, [isAdmin, token]);

  const fetchAdminData = useCallback(async () => {
    if (!isAdmin || !token) {
      return;
    }

    setLoading(true);
    setLoadingSubmissions(true);

    try {
      const adminSecret = import.meta.env.VITE_ADMIN_SECRET || "zabava";
      const headers = {
        Authorization: `Bearer ${token}`,
        "x-admin-secret": adminSecret,
      } as const;

      const [overviewResponse, analyticsResponse, submissionsList] =
        await Promise.all([
          fetch(buildApiUrl("/api/admin/overview"), { headers }),
          fetch(buildApiUrl("/api/admin/analytics", { mode: "metrics" }), {
            headers,
          }),
          loadSubmissions(),
        ]);

      const overviewData: OverviewData = overviewResponse.ok
        ? await overviewResponse.json()
        : {};
      const analyticsData: AnalyticsData = analyticsResponse.ok
        ? await analyticsResponse.json()
        : {};

      const latestSubmissions = Array.isArray(analyticsData.latestSubmissions)
        ? analyticsData.latestSubmissions.map((item) => ({
            ...item,
            partnerId:
              (item as Submission).partnerId ||
              (item as SubmissionRecord & { partnerId?: string }).partnerId ||
              "",
          }))
        : [];

      const activitySource =
        latestSubmissions.length > 0 ? latestSubmissions : submissionsList;
      const sortedActivity = sortSubmissionsByCreatedAt(activitySource);

      const analyticsTotals = analyticsData.totals ?? {};
      const partnersFromAnalytics = Array.isArray(analyticsData.partners)
        ? analyticsData.partners
        : [];
      const revenueTrendDataset = Array.isArray(analyticsData.revenueTrend)
        ? analyticsData.revenueTrend
        : [];

      setMetrics({
        totalPartners:
          overviewData.totals?.activePartners ??
          analyticsTotals.activePartners ??
          partnersFromAnalytics.length ??
          0,
        totalUsers:
          analyticsTotals.count ??
          analyticsTotals.totalUsers ??
          overviewData.totals?.users ??
          0,
        totalRevenue:
          overviewData.totals?.totalRevenue ??
          analyticsTotals.revenue ??
          0,
        totalRedemptions:
          analyticsTotals.bonusRedemptions ??
          analyticsTotals.totalRedemptions ??
          overviewData.totals?.redemptions ??
          0,
        recentActivity: buildRecentActivityItems(sortedActivity),
        partnerGrowth: buildPartnerGrowthDataset(submissionsList),
        revenueByPartner: buildRevenueByPartnerDataset(partnersFromAnalytics),
        revenueTrend: revenueTrendDataset,
        partners: partnersFromAnalytics,
        submissions: submissionsList,
        analyticsTotals,
        generatedAt: analyticsData.generatedAt,
      });
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
      setLoadingSubmissions(false);
    }
  }, [isAdmin, loadSubmissions, token]);

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAdminData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchAdminData]);

  const fetchAllSubmissions = useCallback(async () => {
    if (!isAdmin || !token) {
      return;
    }
    setLoadingSubmissions(true);
    try {
      const submissionsList = await loadSubmissions();
      setMetrics((prev) => ({ ...prev, submissions: submissionsList }));
    } finally {
      setLoadingSubmissions(false);
    }
  }, [isAdmin, loadSubmissions, token]);

  useEffect(() => {
    void fetchAdminData();
    // Notifications are handled by the NotificationContext
  }, [fetchAdminData]);

  useEffect(() => {
    const path = location.pathname.split("/").pop();
    const view =
      path && path !== "admin" ? (path === "dashboard" ? "overview" : path) : "overview";
    setActiveView(view);

    if (
      view === "submissions" &&
      (!metrics.submissions || metrics.submissions.length === 0)
    ) {
      void fetchAllSubmissions();
    }
  }, [fetchAllSubmissions, location.pathname, metrics.submissions]);

  // Trigger manual notification check (useful for testing)
  const triggerTestNotification = () => {
    addNotification({
      type: "system",
      title: "Test Notification",
      message: "This is a test notification from the admin dashboard",
      priority: "medium",
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await Promise.all([fetchAdminData(), fetchNotifications()]);
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Notification permission is handled by NotificationContext

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };


  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <Sidebar
          user={user!}
          onLogout={handleLogout}
          activeView={activeView === "dashboard" ? "overview" : activeView}
          className="h-full"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {(activeView === "overview" || activeView === "dashboard") &&
                  "Admin Dashboard"}
                {activeView === "submissions" && "All Submissions"}
                {activeView === "partners" && "Partner Management"}
                {activeView === "invites" && "Invite Manager"}
                {activeView === "rewards" && "Rewards Management"}
                {activeView === "analytics" && "Analytics"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="gap-2"
              >
                <RefreshCw
                  className={cn("h-4 w-4", refreshing && "animate-spin")}
                />
                Refresh
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications && unreadCount > 0) {
                      markAllAsRead();
                    }
                  }}
                  className="relative"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Notifications
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {unreadCount > 0
                              ? `${unreadCount} unread`
                              : "All caught up"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={markAllAsRead}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Mark all read
                          </button>
                          <button
                            onClick={triggerTestNotification}
                            className="text-sm text-green-600 hover:text-green-700"
                          >
                            Test
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 text-sm">
                            No notifications yet
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            We'll notify you when something happens
                          </p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notif) => (
                          <div
                            key={notif.id}
                            className={cn(
                              "p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors",
                              !notif.read && "bg-blue-50 hover:bg-blue-100"
                            )}
                            onClick={() => {
                              if (!notif.read) markAsRead(notif.id);
                              if (notif.actionUrl) {
                                navigate(notif.actionUrl);
                                setShowNotifications(false);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="relative">
                                <div
                                  className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                    notif.type === "partner" && "bg-blue-100",
                                    notif.type === "user" && "bg-green-100",
                                    notif.type === "redemption" &&
                                      "bg-purple-100",
                                    notif.type === "submission" &&
                                      "bg-yellow-100",
                                    notif.type === "system" && "bg-gray-100"
                                  )}
                                >
                                  {notif.type === "partner" && (
                                    <UserPlus className="h-5 w-5 text-blue-600" />
                                  )}
                                  {notif.type === "user" && (
                                    <Users className="h-5 w-5 text-green-600" />
                                  )}
                                  {notif.type === "redemption" && (
                                    <Gift className="h-5 w-5 text-purple-600" />
                                  )}
                                  {notif.type === "submission" && (
                                    <FileText className="h-5 w-5 text-yellow-600" />
                                  )}
                                  {notif.type === "system" && (
                                    <Bell className="h-5 w-5 text-gray-600" />
                                  )}
                                </div>
                                {!notif.read && (
                                  <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {notif.title}
                                </p>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                  {notif.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                  {formatRelativeTime(notif.timestamp)}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notif.id);
                                }}
                                className="text-gray-400 hover:text-gray-600 p-1"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 10 && (
                      <div className="p-3 border-t border-gray-200 text-center">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                          View all notifications ({notifications.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {(activeView === "overview" || activeView === "dashboard") && (
                <Button size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route
              index
              element={
                <AdminOverview
                  metrics={metrics}
                  formatNumber={formatNumber}
                  formatCurrency={formatCurrency}
                />
              }
            />
            <Route
              path="dashboard"
              element={
                <AdminOverview
                  metrics={metrics}
                  formatNumber={formatNumber}
                  formatCurrency={formatCurrency}
                />
              }
            />
            <Route path="invites" element={<InviteManager />} />
            <Route path="rewards" element={<RewardsManagement />} />
            <Route
              path="submissions"
              element={
                <AdminSubmissions
                  metrics={metrics}
                  loading={loadingSubmissions}
                  onRefresh={fetchAllSubmissions}
                />
              }
            />
            <Route
              path="partners"
              element={
                <AdminPartners
                  partners={metrics.partners}
                  loading={loading}
                  refreshing={refreshing}
                  onRefresh={handleManualRefresh}
                  formatNumber={formatNumber}
                  formatCurrency={formatCurrency}
                  formatCurrencyDetailed={formatCurrencyDetailed}
                />
              }
            />
            <Route
              path="analytics"
              element={
                <AdminAnalytics
                  metrics={metrics}
                  loading={loading}
                  refreshing={refreshing}
                  onRefresh={handleManualRefresh}
                  formatNumber={formatNumber}
                  formatCurrency={formatCurrency}
                  formatCurrencyDetailed={formatCurrencyDetailed}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

interface AdminOverviewProps {
  metrics: AdminMetrics;
  formatNumber: (value: number) => string;
  formatCurrency: (value: number) => string;
}

const AdminOverview = ({ metrics, formatNumber, formatCurrency }: AdminOverviewProps) => {
  const getActivityVisuals = (type: RecentActivityItem["type"]) => {
    switch (type) {
      case "partner":
        return { Icon: UserPlus, container: "bg-blue-100", icon: "text-blue-600" };
      case "user":
        return { Icon: Users, container: "bg-green-100", icon: "text-green-600" };
      case "redemption":
        return { Icon: Gift, container: "bg-purple-100", icon: "text-purple-600" };
      case "submission":
        return { Icon: FileText, container: "bg-yellow-100", icon: "text-yellow-600" };
      default:
        return { Icon: Bell, container: "bg-gray-100", icon: "text-gray-600" };
    }
  };

  return (
    <div className="space-y-6">
    {/* Metrics Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-sm font-medium">
              Total Partners
            </CardDescription>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(metrics.totalPartners)}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 font-medium">+3</span>
            <span className="text-sm text-gray-500">this month</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-sm font-medium">
              Total Users
            </CardDescription>
            <Activity className="h-4 w-4 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(metrics.totalUsers)}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 font-medium">+245</span>
            <span className="text-sm text-gray-500">this week</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-sm font-medium">
              Total Revenue
            </CardDescription>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 font-medium">+18.2%</span>
            <span className="text-sm text-gray-500">from last month</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-sm font-medium">
              Total Redemptions
            </CardDescription>
            <Gift className="h-4 w-4 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(metrics.totalRedemptions)}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-sm text-gray-500">Active rewards:</span>
            <span className="text-sm text-gray-700 font-medium">12</span>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Growth Overview</CardTitle>
          <CardDescription>
            Partners, users, and revenue over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.partnerGrowth.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.partnerGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Submissions"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
              No submissions available for the selected period.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Partners</CardTitle>
          <CardDescription>By revenue contribution</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.revenueByPartner.length ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.revenueByPartner}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {metrics.revenueByPartner.map((entry: PieDataPoint, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {metrics.revenueByPartner
                  .slice(0, 4)
                  .map((item: PieDataPoint, index: number) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                        <span className="text-sm text-gray-600">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
              Revenue data will appear once partners start reporting submissions.
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Recent Activity */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            View All
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.recentActivity.length ? (
            metrics.recentActivity.map((activity, index) => {
              const visuals = getActivityVisuals(activity.type);
              const Icon = visuals.Icon;
              return (
                <div
                  key={`${activity.title}-${activity.timestamp}-${index}`}
                  className={cn(
                    "flex items-center justify-between py-3",
                    index < metrics.recentActivity.length - 1 && "border-b"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        visuals.container
                      )}
                    >
                      <Icon className={cn("h-5 w-5", visuals.icon)} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      {activity.description ? (
                        <p className="text-xs text-gray-500">
                          {activity.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-sm text-gray-500">
              Activity will appear here once submissions start flowing in.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  </div>
  );
};

interface AdminSubmissionsProps {
  metrics: AdminMetrics;
  loading: boolean;
  onRefresh: () => Promise<void> | void;
}

const AdminSubmissions = ({ metrics, loading, onRefresh }: AdminSubmissionsProps) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle>All System Submissions</CardTitle>
          <CardDescription>
            Complete overview of all partner submissions
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <SubmissionsTable
          submissions={metrics.submissions || []}
          isLoading={loading}
          emptyState="No submissions have been recorded yet."
        />
      )}
    </CardContent>
  </Card>
);

interface AdminPartnersProps {
  partners: AdminPartnerSummary[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void> | void;
  formatNumber: (value: number) => string;
  formatCurrency: (value: number) => string;
  formatCurrencyDetailed: (value: number) => string;
}

const AdminPartners = ({
  partners,
  loading,
  refreshing,
  onRefresh,
  formatNumber,
  formatCurrency,
  formatCurrencyDetailed,
}: AdminPartnersProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const summary = useMemo(
    () =>
      partners.reduce(
        (acc, partner) => {
          const partnerMetrics = partner.metrics ?? {};
          const count = partnerMetrics.count ?? 0;
          const used = partnerMetrics.used ?? 0;
          const revenue = partnerMetrics.revenue ?? 0;

          if (count > 0) {
            acc.active += 1;
          }

          acc.submissions += count;
          acc.used += used;
          acc.revenue += revenue;
          return acc;
        },
        {
          total: partners.length,
          active: 0,
          submissions: 0,
          used: 0,
          revenue: 0,
        }
      ),
    [partners]
  );

  const conversionRate = summary.submissions
    ? (summary.used / summary.submissions) * 100
    : 0;
  const averageRevenue =
    summary.submissions > 0 ? summary.revenue / summary.submissions : 0;

  const filteredPartners = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const sorted = [...partners].sort((a, b) => {
      const byDate =
        getSubmissionTimestamp(b.lastSubmissionAt) -
        getSubmissionTimestamp(a.lastSubmissionAt);
      if (byDate !== 0) {
        return byDate;
      }
      return (b.metrics?.revenue ?? 0) - (a.metrics?.revenue ?? 0);
    });

    if (!normalized) {
      return sorted;
    }

    return sorted.filter((partner) => {
      const label = `${partner.label || partner.id}`.toLowerCase();
      return (
        label.includes(normalized) ||
        partner.id.toLowerCase().includes(normalized)
      );
    });
  }, [partners, searchTerm]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Partner Management</CardTitle>
              <CardDescription>
                Track partner performance and activity in real time
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => void onRefresh()}
              disabled={loading || refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing" : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-muted-foreground">Total Partners</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatNumber(summary.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(summary.active)} active this month
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-muted-foreground">Total Submissions</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatNumber(summary.submissions)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(summary.used)} confirmed redemptions
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatCurrency(summary.revenue)}
              </p>
              <p className="text-xs text-muted-foreground">
                Avg {formatCurrencyDetailed(averageRevenue)} per submission
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="mt-2 text-2xl font-semibold">
                {conversionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                Across {formatNumber(summary.submissions || 0)} submissions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Partner Directory</CardTitle>
              <CardDescription>
                Submission, conversion, and revenue performance by partner
              </CardDescription>
            </div>
            <Input
              value={searchTerm}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search partners..."
              className="w-full md:w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading && partners.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Loading partner data...
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No partners match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Partner
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500">
                      Submissions
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500">
                      Conversion
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                      Revenue
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                      Last Submission
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredPartners.map((partner) => {
                    const partnerMetrics = partner.metrics ?? {};
                    const count = partnerMetrics.count ?? 0;
                    const used = partnerMetrics.used ?? 0;
                    const revenue = partnerMetrics.revenue ?? 0;
                    const conversion = count ? (used / count) * 100 : 0;
                    const displayName = partner.label || partner.id;

                    return (
                      <tr key={partner.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <div className="font-medium text-gray-900">
                            {displayName}
                          </div>
                          <div className="text-xs uppercase text-gray-500">
                            {partner.id}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-center text-sm text-gray-600">
                          <div className="font-medium text-gray-900">
                            {formatNumber(count)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Used: {formatNumber(used)}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-center">
                          <Badge
                            variant={count ? "success" : "secondary"}
                            className="justify-center px-3"
                          >
                            {count ? `${conversion.toFixed(1)}%` : "No activity"}
                          </Badge>
                        </td>
                        <td className="px-3 py-4 text-right text-sm font-medium text-gray-900">
                          {formatCurrencyDetailed(revenue)}
                        </td>
                        <td className="px-3 py-4 text-right text-sm text-gray-500">
                          {partner.lastSubmissionAt
                            ? formatDate(partner.lastSubmissionAt)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface AdminAnalyticsProps {
  metrics: AdminMetrics;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void> | void;
  formatNumber: (value: number) => string;
  formatCurrency: (value: number) => string;
  formatCurrencyDetailed: (value: number) => string;
}

const AdminAnalytics = ({
  metrics,
  loading,
  refreshing,
  onRefresh,
  formatNumber,
  formatCurrency,
  formatCurrencyDetailed,
}: AdminAnalyticsProps) => {
  const analyticsTotals = metrics.analyticsTotals ?? {};
  const submissionCount =
    analyticsTotals.count ?? metrics.submissions?.length ?? 0;
  const usedCount = analyticsTotals.used ?? 0;
  const visitedCount = analyticsTotals.visited ?? 0;
  const conversionRate = submissionCount
    ? (usedCount / submissionCount) * 100
    : 0;
  const visitRate = submissionCount
    ? (visitedCount / submissionCount) * 100
    : 0;
  const totalRevenue = analyticsTotals.revenue ?? metrics.totalRevenue ?? 0;
  const totalPoints = analyticsTotals.points ?? 0;
  const totalRedemptions =
    analyticsTotals.totalRedemptions ?? metrics.totalRedemptions ?? 0;
  const averageRevenue =
    analyticsTotals.averageRevenue ??
    (submissionCount ? totalRevenue / submissionCount : 0);
  const averagePoints =
    analyticsTotals.averagePoints ??
    (submissionCount ? totalPoints / submissionCount : 0);

  const revenueTrendData = metrics.revenueTrend ?? [];
  const partnerGrowthData = metrics.partnerGrowth ?? [];
  const revenueByPartnerData = metrics.revenueByPartner ?? [];
  const topPartners = useMemo(
    () => metrics.partners.slice(0, 6),
    [metrics.partners]
  );
  const recentActivity = metrics.recentActivity ?? [];

  const updatedLabel = metrics.generatedAt
    ? `Updated ${formatRelativeTime(metrics.generatedAt)}`
    : undefined;

  const getActivityVisuals = (type: RecentActivityItem["type"]) => {
    switch (type) {
      case "partner":
        return { Icon: UserPlus, container: "bg-blue-100", icon: "text-blue-600" };
      case "user":
        return { Icon: Users, container: "bg-green-100", icon: "text-green-600" };
      case "redemption":
        return { Icon: Gift, container: "bg-purple-100", icon: "text-purple-600" };
      case "submission":
        return { Icon: FileText, container: "bg-yellow-100", icon: "text-yellow-600" };
      default:
        return { Icon: Bell, container: "bg-gray-100", icon: "text-gray-600" };
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>Detailed analytics and insights</CardDescription>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              {updatedLabel ? (
                <span className="text-xs text-muted-foreground">{updatedLabel}</span>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => void onRefresh()}
                disabled={loading || refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing" : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-muted-foreground">Total Submissions</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatNumber(submissionCount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(usedCount)} redemptions · {formatNumber(visitedCount)} visits
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="mt-2 text-2xl font-semibold">
                {conversionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                Visit rate {visitRate.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">
                Avg {formatCurrencyDetailed(averageRevenue)} per submission
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-muted-foreground">Total Points Awarded</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatNumber(Math.round(totalPoints))}
              </p>
              <p className="text-xs text-muted-foreground">
                Avg {formatNumber(Math.round(averagePoints))} pts per visit
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-muted-foreground">Total Redemptions</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatNumber(totalRedemptions)}
              </p>
              <p className="text-xs text-muted-foreground">
                Includes bonus rewards and partner perks
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-muted-foreground">Active Partners</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatNumber(metrics.partners.length)}
              </p>
              <p className="text-xs text-muted-foreground">
                Reporting data in the current period
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Engagement Trend</CardTitle>
            <CardDescription>Daily submissions and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {partnerGrowthData.length ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={partnerGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    name="Submissions"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                Waiting for submission activity...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Last 30 days of partner revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueTrendData.length ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={revenueTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    formatter={(value: number) => formatCurrencyDetailed(value)}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Revenue"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No revenue data recorded for this range.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Partner</CardTitle>
            <CardDescription>Share of overall program revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueByPartnerData.length ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={revenueByPartnerData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {revenueByPartnerData.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrencyDetailed(value),
                      name,
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                Revenue data will appear once partners begin reporting.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Partners</CardTitle>
            <CardDescription>Leaders by revenue and conversion</CardDescription>
          </CardHeader>
          <CardContent>
            {topPartners.length ? (
              <div className="space-y-3">
                {topPartners.map((partner) => {
                  const partnerMetrics = partner.metrics ?? {};
                  const count = partnerMetrics.count ?? 0;
                  const used = partnerMetrics.used ?? 0;
                  const revenue = partnerMetrics.revenue ?? 0;
                  const conversion = count ? (used / count) * 100 : 0;

                  return (
                    <div
                      key={partner.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {partner.label || partner.id}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatNumber(count)} submissions · {conversion.toFixed(1)}% conversion
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrencyDetailed(revenue)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Last {partner.lastSubmissionAt
                            ? formatRelativeTime(partner.lastSubmissionAt)
                            : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                Partner performance data will appear here once submissions arrive.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest submissions, rewards, and partner updates</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => {
                const visuals = getActivityVisuals(activity.type);
                const Icon = visuals.Icon;
                return (
                  <div
                    key={`${activity.title}-${activity.timestamp}-${index}`}
                    className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full",
                          visuals.container
                        )}
                      >
                        <Icon className={cn("h-5 w-5", visuals.icon)} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </p>
                        {activity.description ? (
                          <p className="text-xs text-gray-500">
                            {activity.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Activity will appear here once submissions start flowing in.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
