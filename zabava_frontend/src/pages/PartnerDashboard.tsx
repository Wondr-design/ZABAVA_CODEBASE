import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ComponentType,
  type RefObject,
} from "react";
import { useNavigate } from "react-router-dom";
import { SubmissionsTable } from "../components/SubmissionsTable";
import { usePartnerData } from "../hooks/usePartnerData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  Activity,
  Award,
  DollarSign,
  RefreshCcw,
  Ticket,
  Users,
  LogOut,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/MetricCard";
import { RedemptionProcessor } from "@/components/RedemptionProcessor";
import type { SubmissionRecord } from "@/types/dashboard";

const COLORS = ["#22d3ee", "#a855f7", "#f97316", "#4ade80", "#facc15"];

type VisitFilter = "all" | "visited" | "unvisited";

interface FiltersState {
  ticket: string;
  visited: VisitFilter;
  startDate: string;
  endDate: string;
  search: string;
}

interface NavigationItem {
  id: "overview" | "submissions" | "redemptions";
  label: string;
  active: boolean;
}

interface ChartPoint {
  date: string;
  revenue: number;
}

interface PieSlice {
  name: string;
  value: number;
}

interface MetricsSummary {
  count: number;
  used: number;
  unused: number;
  visited: number;
  notVisited: number;
  revenue: number;
  points: number;
  averageRevenue: number;
  averagePoints: number;
}

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const partnerId = user?.partnerId || "";
  const userEmail = user?.email || "";

  const primaryButtonClass =
    "border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700";
  const secondaryButtonClass =
    "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100";

  const { data, loading, error, refetch } = usePartnerData(partnerId, {
    token,
    onUnauthorized: logout,
    refreshIntervalMs: 15000,
  });
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<
    "overview" | "submissions" | "redemptions"
  >("overview");

  const overviewRef = useRef<HTMLDivElement | null>(null);
  const submissionsRef = useRef<HTMLDivElement | null>(null);
  const redemptionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!partnerId) {
      navigate("/login", { replace: true });
    }
  }, [partnerId, navigate]);

  const submissions = useMemo<SubmissionRecord[]>(() => {
    if (Array.isArray(data?.submissions)) {
      return data.submissions as SubmissionRecord[];
    }
    return [];
  }, [data?.submissions]);

  const partnerLabel = useMemo((): string => {
    const submissionWithAttraction = submissions.find((entry) => {
      return (
        entry?.attractionName ||
        entry?.partnerName ||
        entry?.partnerLabel ||
        entry?.originalPayload?.attractionName ||
        entry?.originalPayload?.partnerName ||
        entry?.originalPayload?.partnerLabel
      );
    });

    if (submissionWithAttraction) {
      return (
        String(submissionWithAttraction.attractionName || "") ||
        String(submissionWithAttraction.partnerName || "") ||
        String(submissionWithAttraction.partnerLabel || "") ||
        String(
          submissionWithAttraction.originalPayload?.attractionName || ""
        ) ||
        String(submissionWithAttraction.originalPayload?.partnerName || "") ||
        String(submissionWithAttraction.originalPayload?.partnerLabel || "") ||
        "Partner"
      );
    }

    if (data?.partner) {
      return data.partner;
    }

    if (partnerId) {
      return partnerId;
    }

    return "Partner";
  }, [submissions, data?.partner, partnerId]);

  useEffect(() => {
    const label = String(partnerLabel || "Partner");
    document.title = `${label} · Zabava`;
    return () => {
      document.title = "Zabava";
    };
  }, [partnerLabel]);

  const [filters, setFilters] = useState<FiltersState>({
    ticket: "all",
    visited: "all",
    startDate: "",
    endDate: "",
    search: "",
  });
  const [visitUpdating, setVisitUpdating] = useState<Record<string, boolean>>(
    {}
  );
  const [visitFeedback, setVisitFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  const metrics = useMemo<MetricsSummary>(() => {
    const count = submissions.length;
    let used = 0;
    let visited = 0;
    let revenue = 0;
    let points = 0;

    submissions.forEach((entry) => {
      if (entry.used) used += 1;
      if (entry.visited) visited += 1;
      revenue += Number(entry.totalPrice || 0);
      points += Number(entry.estimatedPoints || 0);
    });

    return {
      count,
      used,
      unused: count - used,
      visited,
      notVisited: count - visited,
      revenue,
      points,
      averageRevenue: count ? revenue / count : 0,
      averagePoints: count ? points / count : 0,
    };
  }, [submissions]);

  const conversionRate = useMemo(() => {
    if (!metrics.count) {
      return 0;
    }
    return (metrics.used / metrics.count) * 100;
  }, [metrics.count, metrics.used]);

  const visitRate = useMemo(() => {
    if (!metrics.count) {
      return 0;
    }
    return (metrics.visited / metrics.count) * 100;
  }, [metrics.count, metrics.visited]);

  const availableTickets = useMemo<string[]>(() => {
    const set = new Set<string>();
    submissions.forEach((submission) => {
      if (submission.ticket) {
        set.add(submission.ticket);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [submissions]);

  const filteredSubmissions = useMemo<SubmissionRecord[]>(() => {
    return submissions.filter((submission) => {
      const createdAtTime = submission.createdAt
        ? new Date(submission.createdAt).getTime()
        : null;

      if (filters.startDate) {
        const startTime = new Date(filters.startDate).setHours(0, 0, 0, 0);
        if (!createdAtTime || createdAtTime < startTime) {
          return false;
        }
      }

      if (filters.endDate) {
        const endTime = new Date(filters.endDate).setHours(23, 59, 59, 999);
        if (!createdAtTime || createdAtTime > endTime) {
          return false;
        }
      }

      if (filters.ticket !== "all") {
        const ticket = submission.ticket || "N/A";
        if (ticket !== filters.ticket) {
          return false;
        }
      }

      if (filters.visited === "visited" && !submission.visited) {
        return false;
      }

      if (filters.visited === "unvisited" && submission.visited) {
        return false;
      }

      if (filters.search) {
        const term = filters.search.trim().toLowerCase();
        const haystack = [
          submission.email,
          submission.Categories,
          submission.ticket,
          submission.cityCode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [filters, submissions]);

  const filteredCount = filteredSubmissions.length;

  const handleFilterChange = <K extends keyof FiltersState>(
    name: K,
    value: FiltersState[K]
  ) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      ticket: "all",
      visited: "all",
      startDate: "",
      endDate: "",
      search: "",
    });
  };

  const handleExport = () => {
    const rows = filteredSubmissions.length ? filteredSubmissions : submissions;
    if (!rows.length) {
      return;
    }

    const header = [
      "Email",
      "Category",
      "Ticket",
      "Number of People",
      "Total Price",
      "Estimated Points",
      "QR Status",
      "Visited",
      "Visited At",
      "Created At",
      "City Code",
    ];

    const escapeForCsv = (value: unknown) => {
      return `"${String(value ?? "").replace(/"/g, '""')}"`;
    };

    const lines = rows.map((row) =>
      [
        row.email || "",
        row.Categories || "",
        row.ticket || "",
        row.numPeople || "",
        row.totalPrice || 0,
        row.estimatedPoints || 0,
        row.used ? "Used" : "Pending",
        row.visited ? "Visited" : "Unconfirmed",
        row.visitedAt || "",
        row.createdAt || "",
        row.cityCode || "",
      ]
        .map(escapeForCsv)
        .join(",")
    );

    const headerRow = header.map(escapeForCsv).join(",");
    const csvContent = [headerRow, ...lines].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `partner-${partnerId || "data"}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!visitFeedback) {
      return;
    }
    const timer = window.setTimeout(() => setVisitFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [visitFeedback]);

  const handleToggleVisited = async (submission: SubmissionRecord) => {
    if (!token) return;
    const email = String(submission?.email || "").trim().toLowerCase();
    if (!email) {
      setVisitFeedback({
        type: "error",
        message: "Unable to confirm the visit because the submission is missing an email address.",
      });
      return;
    }
    setVisitUpdating((prev) => ({ ...prev, [email]: true }));
    setVisitFeedback(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/partner/visit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          partnerId,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const details =
          typeof payload?.error === "string"
            ? payload.error
            : `Status ${response.status}`;
        throw new Error(`Visit update failed: ${details}`);
      }

      await refetch();
      setVisitFeedback({
        type: "success",
        message: `${submission.email ?? "Guest"} has been marked as visited.`,
      });
    } catch (err) {
      console.error("Failed to update visit status", err);
      const errorMessage =
        err instanceof Error && err.message
          ? err.message
          : "An unexpected error occurred while confirming the visit.";
      setVisitFeedback({ type: "error", message: errorMessage });
    } finally {
      setVisitUpdating((prev) => {
        const next = { ...prev };
        delete next[email];
        return next;
      });
    }
  };

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

  const revenueTrend = useMemo<ChartPoint[]>(() => {
    if (!submissions.length) {
      return [];
    }

    return [...submissions]
      .filter((entry) => entry.createdAt)
      .sort(
        (a, b) =>
          new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
      )
      .map((submission) => ({
        date: new Date(submission.createdAt as string).toLocaleDateString(
          undefined,
          {
            month: "short",
            day: "numeric",
          }
        ),
        revenue: Number(submission.totalPrice || 0),
      }));
  }, [submissions]);

  const pieData = useMemo<PieSlice[]>(() => {
    if (!submissions.length) {
      return [];
    }

    const distribution = submissions.reduce<Record<string, number>>(
      (acc, submission) => {
        const key = submission.ticket || "N/A";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
    }));
  }, [submissions]);

  const topTicketTypes = useMemo<PieSlice[]>(() => {
    if (!pieData.length) {
      return [];
    }
    return [...pieData].sort((a, b) => b.value - a.value).slice(0, 3);
  }, [pieData]);

  const bestSubmission = useMemo<SubmissionRecord | null>(() => {
    if (!submissions.length) {
      return null;
    }

    return submissions.reduce<SubmissionRecord | null>((top, submission) => {
      const current = Number(submission.totalPrice || 0);
      const topValue = Number(top?.totalPrice || 0);
      return current > topValue ? submission : top;
    }, submissions[0] ?? null);
  }, [submissions]);

  const lastUpdatedLabel = useMemo(() => {
    if (!data?.lastUpdated) {
      return null;
    }
    const date = new Date(data.lastUpdated as string);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return `${date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })} • ${date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [data?.lastUpdated]);

  const totalRevenue = metrics.revenue || 0;
  const averageRevenue = metrics.averageRevenue || 0;
  const points = metrics.points || 0;

  const navigationItems = useMemo<NavigationItem[]>(
    () => [
      {
        id: "overview",
        label: "Overview",
        active: activeSection === "overview",
      },
      {
        id: "submissions",
        label: "Submissions",
        active: activeSection === "submissions",
      },
      {
        id: "redemptions",
        label: "Redemptions",
        active: activeSection === "redemptions",
      },
    ],
    [activeSection]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const sections: Array<{
      id: "overview" | "submissions" | "redemptions";
      ref: RefObject<HTMLDivElement | null>;
    }> = [
      { id: "overview", ref: overviewRef },
      { id: "submissions", ref: submissionsRef },
      { id: "redemptions", ref: redemptionsRef },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length) {
          const matching = sections.find(
            (section) => section.ref.current === visible[0].target
          );
          if (matching) {
            setActiveSection((prev) =>
              prev === matching.id ? prev : matching.id
            );
          }
        }
      },
      {
        rootMargin: "-40% 0px -40% 0px",
        threshold: [0.15, 0.3, 0.6],
      }
    );

    sections.forEach(({ ref }) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      sections.forEach(({ ref }) => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      });
      observer.disconnect();
    };
  }, []);

  const tooltipStyles = useMemo<CSSProperties>(
    () => ({
      background: "rgba(255, 255, 255, 0.95)",
      borderRadius: 12,
      border: "1px solid rgba(15, 23, 42, 0.08)",
      backdropFilter: "blur(10px)",
      color: "#0f172a",
    }),
    []
  );
  const tooltipLabelStyle = useMemo<CSSProperties>(
    () => ({ color: "#0f172a", fontWeight: 600 }),
    []
  );
  const tooltipItemStyle = useMemo<CSSProperties>(
    () => ({ color: "#047857", fontWeight: 500 }),
    []
  );

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <span className="text-lg font-semibold">
                  {partnerId ? partnerId.substring(0, 1).toUpperCase() : "P"}
                </span>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-slate-900">Partner Dashboard</h1>
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    Live
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {partnerLabel || partnerId || "Partner Console"}
                </p>
                {lastUpdatedLabel && (
                  <p className="text-xs text-slate-500">Last synced {lastUpdatedLabel}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {userEmail && (
                <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-center">
                  <p className="text-xs font-medium text-slate-900">{userEmail}</p>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Partner
                  </p>
                </div>
              )}
              <Button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                size="sm"
                variant="outline"
                className="gap-1.5"
              >
                <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                {refreshing ? "Refreshing" : "Refresh"}
              </Button>
              <Button
                onClick={handleLogout}
                size="sm"
                variant="outline"
                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error.message ||
                "Unable to load partner data. Please try again."}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2">
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant={item.active ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "rounded-full px-4 text-sm font-medium transition-colors",
                  item.active
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                )}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {activeSection === "overview" && (
            <section
              ref={overviewRef}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
            >
              <MetricCard
                title="Total submissions"
                value={numberFormatter.format(metrics.count)}
                subtitle={`${numberFormatter.format(
                  metrics.used
                )} used • ${numberFormatter.format(metrics.unused)} pending`}
              />
              <MetricCard
                title="Conversion rate"
                value={`${conversionRate.toFixed(0)}%`}
                subtitle="Usage of distributed tickets"
              />
              <MetricCard
                title="Total revenue"
                value={currencyFormatter.format(totalRevenue)}
                subtitle={`Avg ${currencyFormatterDetailed.format(
                  averageRevenue
                )} / submission`}
              />
              <MetricCard
                title="Total points"
                value={numberFormatter.format(points)}
                subtitle={`Avg ${numberFormatter.format(
                  metrics.averagePoints
                )} pts per submission`}
              />
              <MetricCard
                title="Visits confirmed"
                value={`${numberFormatter.format(
                  metrics.visited
                )} (${visitRate.toFixed(0)}%)`}
                subtitle={`${numberFormatter.format(
                  metrics.notVisited
                )} awaiting confirmation`}
              />
            </section>
          )}

          {activeSection === "overview" && (
            <section className="grid gap-6 xl:grid-cols-3">
              <Card className="xl:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    Revenue trend
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Tracking submissions over time
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px] px-0 pb-0">
                  {loading && revenueTrend.length === 0 ? (
                    <Skeleton className="h-full w-full bg-slate-200" />
                  ) : revenueTrend.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueTrend}>
                        <XAxis
                          dataKey="date"
                          stroke="rgba(148, 163, 184, 0.4)"
                          tickLine={false}
                          tick={{
                            fill: "rgba(71, 85, 105, 0.9)",
                            fontSize: 12,
                          }}
                        />
                        <YAxis
                          stroke="rgba(148, 163, 184, 0.4)"
                          tickFormatter={(value) =>
                            currencyFormatter.format(value).replace("$", "")
                          }
                          width={60}
                          tickLine={false}
                          tick={{
                            fill: "rgba(71, 85, 105, 0.9)",
                            fontSize: 12,
                          }}
                        />
                        <Tooltip
                          contentStyle={tooltipStyles}
                          labelStyle={tooltipLabelStyle}
                          itemStyle={tooltipItemStyle}
                          formatter={(value) =>
                            currencyFormatter.format(Number(value))
                          }
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend
                          wrapperStyle={{
                            color: "#475569",
                            paddingTop: 12,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#38bdf8"
                          strokeWidth={3}
                          dot={false}
                          name="Revenue"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      Not enough data yet.
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-6 border-t border-slate-200 bg-slate-50 py-4 text-sm text-slate-600">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Highest booking
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {bestSubmission
                        ? currencyFormatter.format(
                            bestSubmission.totalPrice || 0
                          )
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Average value
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {currencyFormatterDetailed.format(averageRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Total revenue
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {currencyFormatter.format(totalRevenue)}
                    </p>
                  </div>
                </CardFooter>
              </Card>

              <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    Ticket distribution
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Breakdown of submissions by ticket type
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px] px-0 pb-0">
                  {loading && pieData.length === 0 ? (
                    <Skeleton className="h-full w-full bg-slate-200" />
                  ) : pieData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipStyles}
                          labelStyle={tooltipLabelStyle}
                          itemStyle={{ color: "#047857" }}
                          formatter={(value, name) => [
                            `${value} submissions`,
                            name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      Not enough data yet.
                    </div>
                  )}
                </CardContent>
                {topTicketTypes.length ? (
                  <CardFooter className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 py-4 text-sm text-slate-600">
                    {topTicketTypes.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="size-2.5 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span className="font-medium text-slate-900">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {metrics.count
                            ? `${((item.value / metrics.count) * 100).toFixed(
                                0
                              )}%`
                            : "0%"}{" "}
                          • {numberFormatter.format(item.value)} submissions
                        </span>
                      </div>
                    ))}
                  </CardFooter>
                ) : null}
              </Card>
            </section>
          )}

          {activeSection === "submissions" && (
            <section ref={submissionsRef} className="">
              <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="flex flex-wrap items-center justify-between gap-4 space-y-0 pb-4">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">
                      Latest submissions
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">
                      Complete feed of partner activity and ticket scans
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <BadgeWithIcon
                      icon={Users}
                      label={`${numberFormatter.format(metrics.count)} total`}
                    />
                    <BadgeWithIcon
                      icon={Activity}
                      label={`${numberFormatter.format(metrics.used)} used`}
                    />
                    <BadgeWithIcon
                      icon={Ticket}
                      label={`${numberFormatter.format(
                        metrics.unused
                      )} pending`}
                    />
                    <BadgeWithIcon
                      icon={Award}
                      label={`${numberFormatter.format(
                        metrics.visited
                      )} visited`}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-0">
                  <div className="space-y-3 border-b border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Search
                        </label>
                        <Input
                          value={filters.search}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            handleFilterChange("search", event.target.value)
                          }
                          placeholder="Search email, category, ticket"
                          className="border border-slate-200 bg-white text-slate-900"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Ticket type
                        </label>
                        <select
                          value={filters.ticket}
                          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                            handleFilterChange("ticket", event.target.value)
                          }
                          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          <option value="all">All tickets</option>
                          {availableTickets.map((ticket) => (
                            <option key={ticket} value={ticket}>
                              {ticket}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Visit status
                        </label>
                        <select
                          value={filters.visited}
                          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                            handleFilterChange(
                              "visited",
                              event.target.value as VisitFilter
                            )
                          }
                          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          <option value="all">All</option>
                          <option value="visited">Visited</option>
                          <option value="unvisited">Awaiting visit</option>
                        </select>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            From
                          </label>
                          <Input
                            type="date"
                            value={filters.startDate}
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              handleFilterChange(
                                "startDate",
                                event.target.value
                              )
                            }
                            className="border border-slate-200 bg-white text-slate-900"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            To
                          </label>
                          <Input
                            type="date"
                            value={filters.endDate}
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              handleFilterChange("endDate", event.target.value)
                            }
                            className="border border-slate-200 bg-white text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-slate-500">
                        Showing {numberFormatter.format(filteredCount)} of{" "}
                        {numberFormatter.format(metrics.count)} submissions
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn("gap-1", secondaryButtonClass)}
                          onClick={handleResetFilters}
                        >
                          Reset filters
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn("gap-2", primaryButtonClass)}
                          onClick={handleExport}
                          disabled={filteredSubmissions.length === 0}
                        >
                          <Download className="size-4" /> Export CSV
                        </Button>
                      </div>
                    </div>
                  </div>

                  {visitFeedback ? (
                    <div
                      className={cn(
                        "mb-4 rounded-md border px-3 py-2 text-sm",
                        visitFeedback.type === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-red-200 bg-red-50 text-red-700"
                      )}
                    >
                      {visitFeedback.message}
                    </div>
                  ) : null}

                  <SubmissionsTable
                    submissions={filteredSubmissions}
                    isLoading={loading && submissions.length === 0}
                    onToggleVisited={handleToggleVisited}
                    visitUpdating={visitUpdating}
                    emptyState={
                      visitFeedback?.type === "error"
                        ? visitFeedback.message
                        : undefined
                    }
                  />
                </CardContent>
              </Card>
            </section>
          )}

          {/* Redemptions Section */}
          {activeSection === "redemptions" && (
            <section ref={redemptionsRef}>
              <RedemptionProcessor partnerId={partnerId} token={token} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function BadgeWithIcon({
  icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  const Icon = icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
      <Icon className="h-3.5 w-3.5 text-emerald-600" />
      {label}
    </span>
  );
}
