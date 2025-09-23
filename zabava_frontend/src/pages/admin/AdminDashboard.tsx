import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL, buildApiUrl } from "@/lib/config";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  AdminAnalyticsOverview,
  AdminOverviewResponse,
  AdminPartnerDirectoryItem,
  AdminPartnerSummary,
  PartnerFormState,
  SubmissionRecord,
} from "@/types/dashboard";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Sun, Moon } from "lucide-react";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type SearchVisitedFilter = "all" | "visited" | "unvisited";

interface PartnerDirectoryResponse {
  items?: AdminPartnerDirectoryItem[];
}

interface SubmissionSearchResponse {
  items?: SubmissionRecord[];
}

interface AnalyticsTotals {
  count: number;
  used: number;
  unused: number;
  visited: number;
  notVisited: number;
  revenue: number;
  points: number;
  bonusRedemptions: number;
  averageRevenue: number;
  averagePoints: number;
}

interface OverviewTotalsShape {
  activePartners?: number;
  qrsGeneratedToday?: number;
  qrsScannedToday?: number;
  monthlyVisitors?: number;
  totalRevenue?: number;
  unvisitedQRCodes?: number;
}

interface QuickActionsShape {
  pendingPartnerApprovals?: number;
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  className?: string;
  style?: CSSProperties;
}

export default function AdminDashboard() {
  // Theme (light default; toggles Tailwind 'dark' class on <html>)
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const primaryButtonClass =
    "bg-white text-slate-950 hover:bg-white/90 border border-white/80";
  const secondaryButtonClass =
    "bg-white/70 text-slate-950 hover:bg-white/60 border border-white/60";

  const [partners, setPartners] = useState<AdminPartnerSummary[]>([]);
  const [overviewPartner, setOverviewPartner] = useState<string>("all");
  const [overviewRefreshIndex, setOverviewRefreshIndex] = useState<number>(0);
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(false);
  const [overviewStats, setOverviewStats] =
    useState<AdminOverviewResponse | null>(null);
  const [loadingOverviewStats, setLoadingOverviewStats] =
    useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchPartner, setSearchPartner] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SubmissionRecord[]>([]);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [searchTicket, setSearchTicket] = useState<string>("all");
  const [searchVisited, setSearchVisited] =
    useState<SearchVisitedFilter>("all");
  const [searchStartDate, setSearchStartDate] = useState<string>("");
  const [searchEndDate, setSearchEndDate] = useState<string>("");
  const [partnerDirectory, setPartnerDirectory] = useState<
    AdminPartnerDirectoryItem[]
  >([]);
  const [loadingPartnerDirectory, setLoadingPartnerDirectory] =
    useState<boolean>(false);
  const [partnerSearchTerm, setPartnerSearchTerm] = useState<string>("");
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<string>("all");
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [partnerForm, setPartnerForm] = useState<PartnerFormState | null>(null);
  const [savingPartner, setSavingPartner] = useState<boolean>(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/login", { replace: true });
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    document.title = "Zabava";
    return () => {
      document.title = "Zabava";
    };
  }, []);

  useEffect(() => {
    if (!isAdmin || !token) return;

    let isActive = true;

    const fetchPartners = async () => {
      try {
        const response = await fetch(
          buildApiUrl("/api/admin/analytics", { mode: "metrics" }),
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error(`Partners fetch failed: ${response.status}`);
        }
        const payload: AdminAnalyticsOverview = await response.json();
        if (!isActive) {
          return;
        }
        const items = [...(payload.partners ?? [])];
        items.sort((a, b) => a.id.localeCompare(b.id));
        setPartners(items);
      } catch (err) {
        if (isActive) {
          console.error("Failed to load partners", err);
        }
      }
    };

    fetchPartners();
    return () => {
      isActive = false;
    };
  }, [isAdmin, token]);

  useEffect(() => {
    if (!isAdmin || !token) return;

    const controller = new AbortController();
    let isActive = true;

    const loadOverview = async () => {
      setLoadingOverview(true);
      try {
        const metricsUrl = buildApiUrl("/api/admin/analytics", {
          mode: "metrics",
          partnerId: overviewPartner !== "all" ? overviewPartner : undefined,
        });

        const response = await fetch(metricsUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Metrics fetch failed: ${response.status}`);
        }

        const payload: AdminAnalyticsOverview = await response.json();
        if (isActive) {
          setOverview(payload);
        }
      } catch (error) {
        const errorInstance = error as Error;
        if (errorInstance.name !== "AbortError") {
          console.error("Failed to load metrics", errorInstance);
        }
      } finally {
        if (isActive) {
          setLoadingOverview(false);
        }
      }
    };

    loadOverview();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [isAdmin, overviewPartner, overviewRefreshIndex, token]);

  const loadPartnerDirectory = useCallback(async () => {
    if (!isAdmin || !token) return;
    setLoadingPartnerDirectory(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/partners`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Partner directory fetch failed: ${response.status}`);
      }
      const payload: PartnerDirectoryResponse = await response.json();
      setPartnerDirectory(payload.items ?? []);
    } catch (err) {
      console.error("Failed to load partner directory", err);
    } finally {
      setLoadingPartnerDirectory(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    loadPartnerDirectory();
  }, [loadPartnerDirectory]);

  useEffect(() => {
    if (!isAdmin || !token) return;

    const controller = new AbortController();
    let isActive = true;

    const loadOverviewStats = async () => {
      setLoadingOverviewStats(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/overview`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Overview fetch failed: ${response.status}`);
        }
        const payload: AdminOverviewResponse = await response.json();
        if (isActive) {
          setOverviewStats(payload);
        }
      } catch (error) {
        const errorInstance = error as Error;
        if (errorInstance.name !== "AbortError") {
          console.error("Failed to load overview counters", errorInstance);
        }
      } finally {
        if (isActive) {
          setLoadingOverviewStats(false);
        }
      }
    };

    loadOverviewStats();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [isAdmin, token, overviewRefreshIndex]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    const term = searchTerm.trim();
    if (term.length < 2 && !searchPartner) {
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }

    const controller = new AbortController();
    let isActive = true;
    setLoadingSearch(true);
    const submissionsUrl = buildApiUrl("/api/admin/analytics", {
      mode: "submissions",
      search: term.length >= 2 ? term : undefined,
      partnerId: searchPartner || undefined,
    });

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(submissionsUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }
        const payload: SubmissionSearchResponse = await response.json();
        if (isActive) {
          setSearchResults(payload.items ?? []);
        }
      } catch (error) {
        const errorInstance = error as Error;
        if (errorInstance.name !== "AbortError") {
          console.error("Failed to run search", errorInstance);
        }
      } finally {
        if (isActive) {
          setLoadingSearch(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timeout);
      controller.abort();
      setLoadingSearch(false);
    };
  }, [isAdmin, token, searchTerm, searchPartner]);

  const refreshOverview = useCallback(() => {
    setOverviewRefreshIndex((prev) => prev + 1);
  }, []);

  const handleExport = async () => {
    if (!token) return;
    try {
      const term = searchTerm.trim();
      const exportUrl = buildApiUrl("/api/admin/analytics", {
        mode: "export",
        search: term.length >= 2 ? term : undefined,
        partnerId: searchPartner || undefined,
      });

      const response = await fetch(exportUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `lasermax-submissions-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Failed to export CSV", err);
    }
  };

  const resetSearchFilters = () => {
    setSearchTicket("all");
    setSearchVisited("all");
    setSearchStartDate("");
    setSearchEndDate("");
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

  const analyticsTotals = useMemo<AnalyticsTotals>(() => {
    const totals = (overview?.totals ?? {}) as Partial<AnalyticsTotals>;
    return {
      count: totals.count ?? 0,
      used: totals.used ?? 0,
      unused: totals.unused ?? 0,
      visited: totals.visited ?? 0,
      notVisited: totals.notVisited ?? 0,
      revenue: totals.revenue ?? 0,
      points: totals.points ?? 0,
      bonusRedemptions: totals.bonusRedemptions ?? 0,
      averageRevenue: totals.averageRevenue ?? 0,
      averagePoints: totals.averagePoints ?? 0,
    };
  }, [overview]);
  const conversionRate = analyticsTotals.count
    ? Math.round((analyticsTotals.used / analyticsTotals.count) * 100)
    : 0;
  const visitRate = analyticsTotals.count
    ? Math.round((analyticsTotals.visited / analyticsTotals.count) * 100)
    : 0;

  const searchTicketOptions = useMemo<string[]>(() => {
    const set = new Set<string>();
    searchResults.forEach((item) => {
      if (item.ticket) {
        set.add(item.ticket);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [searchResults]);

  const filteredSearchResults = useMemo<SubmissionRecord[]>(() => {
    return searchResults.filter((item) => {
      const createdTime = item.createdAt
        ? new Date(item.createdAt).getTime()
        : null;

      if (searchStartDate) {
        const startTime = new Date(searchStartDate).setHours(0, 0, 0, 0);
        if (!createdTime || createdTime < startTime) {
          return false;
        }
      }

      if (searchEndDate) {
        const endTime = new Date(searchEndDate).setHours(23, 59, 59, 999);
        if (!createdTime || createdTime > endTime) {
          return false;
        }
      }

      if (searchTicket !== "all") {
        const ticket = item.ticket || "N/A";
        if (ticket !== searchTicket) {
          return false;
        }
      }

      if (searchVisited === "visited" && !item.visited) {
        return false;
      }

      if (searchVisited === "unvisited" && item.visited) {
        return false;
      }

      return true;
    });
  }, [
    searchEndDate,
    searchResults,
    searchStartDate,
    searchTicket,
    searchVisited,
  ]);

  const filteredSearchCount = filteredSearchResults.length;

  const filteredPartners = useMemo<AdminPartnerDirectoryItem[]>(() => {
    const term = partnerSearchTerm.trim().toLowerCase();
    return partnerDirectory.filter((item) => {
      if (
        partnerStatusFilter !== "all" &&
        item.status !== partnerStatusFilter
      ) {
        return false;
      }
      if (term) {
        const haystack = [
          item.partnerId,
          item.info?.contactName,
          item.info?.contactEmail,
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
  }, [partnerDirectory, partnerSearchTerm, partnerStatusFilter]);

  const revenueTrend = useMemo(
    () =>
      (overview?.revenueTrend ?? []) as NonNullable<
        AdminAnalyticsOverview["revenueTrend"]
      >,
    [overview]
  );
  const latest = useMemo<SubmissionRecord[]>(
    () => overview?.latestSubmissions ?? [],
    [overview]
  );
  const partnerSummary = useMemo<AdminPartnerSummary[]>(
    () => overview?.partners ?? [],
    [overview]
  );

  const overviewTotals = useMemo(() => {
    const totals = (overviewStats?.totals ?? {}) as OverviewTotalsShape;
    return {
      activePartners: totals.activePartners ?? 0,
      qrsGeneratedToday: totals.qrsGeneratedToday ?? 0,
      qrsScannedToday: totals.qrsScannedToday ?? 0,
      monthlyVisitors: totals.monthlyVisitors ?? 0,
      totalRevenue: totals.totalRevenue ?? 0,
      unvisitedQRCodes: totals.unvisitedQRCodes ?? 0,
    };
  }, [overviewStats]);
  const quickActions = useMemo(() => {
    const actions = (overviewStats?.quickActions ?? {}) as QuickActionsShape;
    return {
      pendingPartnerApprovals: actions.pendingPartnerApprovals ?? 0,
    };
  }, [overviewStats]);

  const heroCards = useMemo(
    () => [
      {
        title: "Active partners",
        value: numberFormatter.format(overviewTotals.activePartners),
        subtitle: "Currently live on Lasermax",
      },
      {
        title: "QRs generated today",
        value: numberFormatter.format(overviewTotals.qrsGeneratedToday),
        subtitle: "New registrations received today",
      },
      {
        title: "QRs scanned today",
        value: numberFormatter.format(overviewTotals.qrsScannedToday),
        subtitle: "Visits confirmed so far today",
      },
      {
        title: "Monthly visitors",
        value: numberFormatter.format(overviewTotals.monthlyVisitors),
        subtitle: "Visits confirmed this month",
      },
      {
        title: "Revenue (month)",
        value: currencyFormatter.format(overviewTotals.totalRevenue),
        subtitle: "From confirmed visits",
      },
    ],
    [
      currencyFormatter,
      numberFormatter,
      overviewTotals.activePartners,
      overviewTotals.qrsGeneratedToday,
      overviewTotals.qrsScannedToday,
      overviewTotals.monthlyVisitors,
      overviewTotals.totalRevenue,
    ]
  );

  const quickActionItems = useMemo(
    () => [
      {
        id: "add-partner",
        label: "Add new partner",
        description: "Send an invite to onboard another attraction",
        action: () => navigate("/admin/invites"),
      },
      {
        id: "view-unvisited",
        label: `${numberFormatter.format(
          overviewTotals.unvisitedQRCodes
        )} unconfirmed visits`,
        description: "Follow up on partners to mark recent visitors",
        action: () => {
          const submissionsSection = document.getElementById("submissions");
          if (submissionsSection) {
            submissionsSection.scrollIntoView({ behavior: "smooth" });
          }
        },
      },
      {
        id: "pending-approvals",
        label: `${numberFormatter.format(
          quickActions.pendingPartnerApprovals
        )} partner approvals`,
        description: "Review pending accounts",
        action: () => navigate("/admin/invites"),
      },
    ],
    [
      navigate,
      numberFormatter,
      overviewTotals.unvisitedQRCodes,
      quickActions.pendingPartnerApprovals,
    ]
  );

  const createPartnerFormState = useCallback(
    (meta: AdminPartnerDirectoryItem): PartnerFormState => ({
      partnerId: meta.partnerId,
      status: meta.status ?? "active",
      monthlyFee:
        meta.contract?.monthlyFee !== undefined
          ? String(meta.contract.monthlyFee)
          : "",
      discountRate:
        meta.contract?.discountRate !== undefined
          ? String(meta.contract.discountRate)
          : "",
      commissionRate:
        meta.contract?.commissionRate !== undefined
          ? String(meta.contract.commissionRate)
          : "",
      commissionBasis: meta.contract?.commissionBasis ?? "discounted",
      ticketTypes: (meta.ticketing?.ticketTypes ?? []).join(", "),
      familyRule: meta.ticketing?.familyRule ?? "",
      contactName: meta.info?.contactName ?? "",
      contactEmail: meta.info?.contactEmail ?? "",
      payments: (meta.info?.payments ?? []).join(", "),
      facilities: (meta.info?.facilities ?? []).join(", "),
      website: meta.info?.website ?? "",
      bonusProgramEnabled: Boolean(meta.bonusProgramEnabled),
      notes: meta.notes ?? "",
      updatedAt: meta.updatedAt ?? null,
      createdAt: meta.createdAt ?? null,
    }),
    []
  );

  const openPartnerEditor = useCallback(
    (meta: AdminPartnerDirectoryItem) => {
      setEditingPartnerId(meta.partnerId);
      setPartnerForm(createPartnerFormState(meta));
    },
    [createPartnerFormState]
  );

  const closePartnerEditor = useCallback(() => {
    setEditingPartnerId(null);
    setPartnerForm(null);
    setSavingPartner(false);
  }, []);

  const handlePartnerFieldChange = useCallback(
    <Key extends keyof PartnerFormState>(
      field: Key,
      value: PartnerFormState[Key]
    ) => {
      setPartnerForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    []
  );

  const splitList = useCallback((value: string): string[] => {
    if (!value) return [];
    return value
      .split(/[,\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, []);

  const handleSavePartner = useCallback(async () => {
    if (!partnerForm || !editingPartnerId || !token) return;
    setSavingPartner(true);
    try {
      const parseNumber = (value: string): number => {
        if (!value.trim()) {
          return 0;
        }
        const numericValue = Number.parseFloat(value);
        return Number.isFinite(numericValue) ? numericValue : 0;
      };

      const payload = {
        status: partnerForm.status,
        contract: {
          monthlyFee: parseNumber(partnerForm.monthlyFee),
          discountRate: parseNumber(partnerForm.discountRate),
          commissionRate: parseNumber(partnerForm.commissionRate),
          commissionBasis: partnerForm.commissionBasis || "discounted",
        },
        ticketing: {
          ticketTypes: splitList(partnerForm.ticketTypes),
          familyRule: partnerForm.familyRule || "",
        },
        info: {
          contactName: partnerForm.contactName || "",
          contactEmail: partnerForm.contactEmail || "",
          payments: splitList(partnerForm.payments),
          facilities: splitList(partnerForm.facilities),
          website: partnerForm.website || "",
        },
        bonusProgramEnabled: Boolean(partnerForm.bonusProgramEnabled),
        notes: partnerForm.notes || "",
      };

      const response = await fetch(
        `${API_BASE_URL}/api/admin/partners/${editingPartnerId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        throw new Error(`Partner update failed: ${response.status}`);
      }
      const updated: AdminPartnerDirectoryItem = await response.json();
      setPartnerDirectory((prev) =>
        prev.map((item) =>
          item.partnerId === updated.partnerId ? updated : item
        )
      );
      closePartnerEditor();
    } catch (err) {
      console.error("Failed to update partner metadata", err);
    } finally {
      setSavingPartner(false);
    }
  }, [closePartnerEditor, editingPartnerId, partnerForm, splitList, token]);

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <>
<div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100 relative overflow-hidden">
        {/* Subtle background effects */}
<div className="hidden dark:block absolute inset-0 bg-gradient-to-br from-blue-900/5 via-transparent to-purple-900/5"></div>
        <div className="hidden dark:block absolute top-0 left-1/4 w-72 h-72 bg-blue-500/3 rounded-full blur-3xl"></div>
        <div className="hidden dark:block absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/3 rounded-full blur-3xl"></div>
        <div className="relative z-10">
<header className="bg-white dark:glass-card border-b border-gray-200 dark:border-white/10 backdrop-blur-xl sticky top-0">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">Z</span>
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/20 to-violet-600/20 rounded-xl blur opacity-75"></div>
                </div>
                <div>
<h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Admin Console
                  </h1>
<p className="text-xs text-gray-500 dark:text-muted-foreground">
                    Dashboard & Analytics
                  </p>
                </div>
              </div>
<div className="flex items-center gap-2">
                {/* Theme toggle */}
                <Button
                  onClick={toggleTheme}
                  size="icon"
                  variant="outline"
                  className="rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 dark:bg-transparent dark:text-white dark:border-white/20"
                  title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
<div className="rounded-xl px-3 py-2 text-center bg-gray-100 text-gray-900 dark:glass-card-light dark:text-white">
                  <p className="text-xs font-medium text-white">
                    {user?.email}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Admin
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/admin/invites")}
                  size="sm"
                  className="btn-minimal rounded-lg px-3 py-1.5 text-xs font-medium focus-ring"
                >
                  Partner invites
                </Button>
                <Button
                  onClick={refreshOverview}
                  disabled={loadingOverview}
                  size="sm"
className="rounded-lg px-3 py-1.5 text-xs font-medium focus-ring bg-gray-100 text-gray-900 hover:bg-gray-200 dark:btn-minimal disabled:opacity-50"
                >
                  {loadingOverview ? "Refreshing..." : "Refresh"}
                </Button>
                <Button
                  onClick={handleLogout}
                  size="sm"
className="rounded-lg px-3 py-1.5 text-xs font-medium focus-ring bg-white text-red-600 border border-red-200 hover:bg-red-50 dark:btn-minimal dark:text-red-200"
                >
                  Logout
                </Button>
              </div>
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {heroCards.map((card, index) => (
                <MetricCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  subtitle={card.subtitle}
                  className=""
                />
              ))}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {quickActionItems.map((action, index) => (
                <Card
                  key={action.id}
                  className="glass-card overflow-hidden rounded-xl"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-white">
                      {action.label}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      size="sm"
                      className="btn-minimal rounded-lg px-4 py-1.5 focus-ring text-xs"
                      onClick={action.action}
                      disabled={loadingOverviewStats}
                    >
                      {loadingOverviewStats ? "Loading..." : "View"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="space-y-4" id="partners">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    value={partnerSearchTerm}
                    onChange={(event) =>
                      setPartnerSearchTerm(event.target.value)
                    }
                    placeholder="Search partner or contact"
className="w-full max-w-sm bg-white text-gray-900 border border-gray-300 dark:bg-white/10 dark:text-white dark:border-white/10"
                  />
                  <select
                    value={partnerStatusFilter}
                    onChange={(event) =>
                      setPartnerStatusFilter(event.target.value)
                    }
className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-white/10 dark:bg-white/10 dark:text-white"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(secondaryButtonClass)}
                    onClick={loadPartnerDirectory}
                    disabled={loadingPartnerDirectory}
                  >
                    {loadingPartnerDirectory ? "Refreshing" : "Refresh list"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(primaryButtonClass)}
                    onClick={() => navigate("/admin/invites")}
                  >
                    Invite partner
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
<table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
<thead className="bg-gray-50 dark:bg-white/[0.04]">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                        Partner
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                        Monthly fee
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                        Commission
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                        Discount
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                        Tickets
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                        Updated
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                        Bonus
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 bg-white/[0.02]">
                    {loadingPartnerDirectory ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-3 py-4 text-sm text-slate-400"
                        >
                          Loading partner directory…
                        </td>
                      </tr>
                    ) : filteredPartners.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-3 py-4 text-sm text-slate-400"
                        >
                          {partnerDirectory.length === 0
                            ? "No partners yet."
                            : "No partners match the selected filters."}
                        </td>
                      </tr>
                    ) : (
                      filteredPartners.map((partner) => {
                        const statusStyles = {
                          active: "bg-emerald-500/15 text-emerald-200",
                          pending: "bg-amber-400/15 text-amber-200",
                          hidden: "bg-slate-500/20 text-slate-200",
                        };
                        const badgeClass =
                          statusStyles[
                            partner.status as keyof typeof statusStyles
                          ] || "bg-slate-500/20 text-slate-200";

                        return (
                          <tr key={partner.partnerId}>
                            <td className="px-3 py-3 text-sm text-slate-200">
                              <div>
                                <p className="font-semibold text-white">
                                  {partner.partnerId.toUpperCase()}
                                </p>
                                {partner.info?.contactName ? (
                                  <p className="text-xs text-slate-400">
                                    {partner.info.contactName}
                                  </p>
                                ) : null}
                                {partner.info?.contactEmail ? (
                                  <p className="text-xs text-slate-500">
                                    {partner.info.contactEmail}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-sm text-slate-300">
                              <Badge className={badgeClass}>
                                {partner.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 text-sm text-slate-300">
                              {currencyFormatter.format(
                                partner.contract?.monthlyFee || 0
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm text-slate-300">
                              {`${partner.contract?.commissionRate || 0}% (${
                                partner.contract?.commissionBasis === "original"
                                  ? "original"
                                  : "discounted"
                              })`}
                            </td>
                            <td className="px-3 py-3 text-sm text-slate-300">
                              {`${partner.contract?.discountRate || 0}%`}
                            </td>
                            <td className="px-3 py-3 text-sm text-slate-300">
                              {partner.ticketing?.ticketTypes?.length
                                ? partner.ticketing.ticketTypes.join(", ")
                                : "—"}
                            </td>
                            <td className="px-3 py-3 text-sm text-slate-400">
                              {partner.updatedAt
                                ? formatDate(partner.updatedAt)
                                : "—"}
                            </td>
                            <td className="px-3 py-3 text-sm text-slate-300">
                              {partner.bonusProgramEnabled
                                ? "Enabled"
                                : "Disabled"}
                            </td>
                            <td className="px-3 py-3 text-sm text-slate-300">
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(primaryButtonClass)}
                                onClick={() => openPartnerEditor(partner)}
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              id="submissions"
            >
              <MetricCard
                title="Total submissions"
                value={numberFormatter.format(analyticsTotals.count)}
                subtitle={`${numberFormatter.format(
                  analyticsTotals.used
                )} used • ${numberFormatter.format(
                  analyticsTotals.unused
                )} pending`}
              />
              <MetricCard
                title="Conversion rate"
                value={`${conversionRate}%`}
                subtitle="Usage of distributed tickets"
              />
              <MetricCard
                title="Total revenue"
                value={currencyFormatter.format(analyticsTotals.revenue)}
                subtitle={`Avg ${currencyFormatterDetailed.format(
                  analyticsTotals.averageRevenue
                )} per submission`}
              />
              <MetricCard
                title="Visits confirmed"
                value={`${numberFormatter.format(
                  analyticsTotals.visited
                )} (${visitRate}%)`}
                subtitle={`${numberFormatter.format(
                  analyticsTotals.notVisited
                )} awaiting confirmation`}
              />
            </section>

            <section className="flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase tracking-[0.25em] text-slate-500">
                Dataset
              </span>
              <select
                value={overviewPartner || "all"}
                onChange={(event) => setOverviewPartner(event.target.value)}
                className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white"
              >
                <option value="all">All partners</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.id}
                  </option>
                ))}
              </select>
            </section>

            <section className="grid gap-4 xl:grid-cols-5">
              <Card className="glass-card xl:col-span-2 rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gradient">
                    Global revenue trend
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Aggregated submissions by day
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px] px-0 pb-0">
                  {loadingOverview && !overview ? (
                    <Skeleton className="h-full w-full bg-white/10" />
                  ) : revenueTrend.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueTrend}>
                        <XAxis
                          dataKey="date"
                          stroke="rgba(148, 163, 184, 0.4)"
                          tickLine={false}
                          tick={{
                            fill: "rgba(226, 232, 240, 0.75)",
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
                            fill: "rgba(226, 232, 240, 0.75)",
                            fontSize: 12,
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(15, 23, 42, 0.92)",
                            borderRadius: 12,
                            border: "1px solid rgba(148, 163, 184, 0.25)",
                            color: "#e2e8f0",
                          }}
                          formatter={(value) =>
                            currencyFormatter.format(Number(value))
                          }
                        />
                        <Legend
                          wrapperStyle={{
                            color: "rgba(226, 232, 240, 0.8)",
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
              </Card>

              {/* Modern Partner Summary with fixed height and scroll */}
              <Card className="glass-card xl:col-span-3 rounded-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold text-gradient">
                        Partner summary
                      </CardTitle>
                      <CardDescription className="text-muted-foreground text-sm">
                        Snapshot of partner performance
                      </CardDescription>
                    </div>
                    {partnerSummary.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                        <span className="text-sm font-medium text-slate-300">
                          {partnerSummary.length} partner
                          {partnerSummary.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  {partnerSummary.length === 0 ? (
                    <div className="px-6 pb-6">
                      <p className="text-sm text-slate-400">
                        No partners available.
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Scroll container with fixed height */}
                      <div className="max-h-80 overflow-y-auto px-6 pb-6 partner-summary-scroll">
                        <div className="space-y-2">
                          {partnerSummary.map((item) => {
                            const hasRevenue = item.metrics.revenue > 0;
                            const conversionRate =
                              item.metrics.count > 0
                                ? Math.round(
                                    (item.metrics.used / item.metrics.count) *
                                      100
                                  )
                                : 0;

                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 sm:px-4"
                              >
                                <div className="flex items-center space-x-2 sm:space-x-3">
                                  {/* Partner Avatar/Initial */}
                                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-xs sm:text-sm font-semibold text-white">
                                    {item.id.substring(0, 2).toUpperCase()}
                                  </div>

                                  {/* Partner Info */}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center space-x-2">
                                      <p className="font-semibold text-white text-xs sm:text-sm">
                                        {item.id.toUpperCase()}
                                      </p>
                                      {conversionRate > 0 && (
                                        <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-xs font-medium text-emerald-200">
                                          {conversionRate}%
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                                      <span>
                                        {numberFormatter.format(
                                          item.metrics.count
                                        )}{" "}
                                        submissions
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {numberFormatter.format(
                                          item.metrics.used
                                        )}{" "}
                                        used
                                        {item.metrics.unused > 0 && (
                                          <span className="text-amber-300">
                                            {" "}
                                            ({item.metrics.unused} pending)
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Revenue and Date */}
                                <div className="text-right">
                                  <p
                                    className={`text-xs sm:text-sm font-medium ${
                                      hasRevenue
                                        ? "text-emerald-300"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    {currencyFormatter.format(
                                      item.metrics.revenue
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {item.lastSubmissionAt
                                      ? formatDate(item.lastSubmissionAt).split(
                                          ","
                                        )[0] // Show only date, not time
                                      : "—"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Scroll indicator gradients */}
                      {partnerSummary.length > 6 && (
                        <>
                          <div className="pointer-events-none absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-slate-950/20 to-transparent" />
                          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-950/20 to-transparent" />
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <Card className="border-white/20 bg-gradient-to-br from-white/[0.08] to-white/[0.12] backdrop-blur-xl shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-white">
                  Latest submissions
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Most recent activity across partners
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto px-0">
                <table className="min-w-full divide-y divide-white/20">
                  <thead className="bg-white/[0.08]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-200">
                        Partner
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-200">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-200">
                        Ticket
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-200">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-200">
                        QR Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-200">
                        Visit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-200">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 bg-white/[0.04]">
                    {latest.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-6 text-center text-sm text-slate-400"
                        >
                          No submissions yet.
                        </td>
                      </tr>
                    ) : (
                      latest.slice(0, 12).map((item, index) => (
                        <tr
                          key={`${item.partnerId}-${item.email}-${index}`}
                          className=""
                        >
                          <td className="px-4 py-3 text-sm font-medium text-slate-100">
                            {String(item.partnerId)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-200">
                            {item.email}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {item.ticket || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-200">
                            {currencyFormatter.format(item.totalPrice || 0)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {item.used ? "Used" : "Pending"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm ${
                                  item.visited
                                    ? "bg-emerald-500/20 text-emerald-100 border border-emerald-500/30"
                                    : "bg-amber-400/20 text-amber-100 border border-amber-400/30"
                                }`}
                              >
                                <div
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    item.visited
                                      ? "bg-emerald-400"
                                      : "bg-amber-400"
                                  }`}
                                ></div>
                                {item.visited ? "Visited" : "Unconfirmed"}
                              </span>
                              {item.visitedAt ? (
                                <span className="text-xs text-slate-400 font-medium">
                                  {formatDate(item.visitedAt)}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-400 font-medium">
                            {formatDate(item.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border-white/20 bg-gradient-to-br from-white/[0.08] to-white/[0.12] backdrop-blur-xl shadow-xl">
              <CardHeader className="flex flex-wrap items-center justify-between gap-4 pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-white">
                    Search submissions
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Filter by partner or email keyword and export results.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0 shadow-lg font-medium px-4 py-2.5 rounded-lg"
                >
                  Download CSV
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by email, ticket, partner..."
                    className="w-full max-w-sm bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg shadow-sm"
                  />
                  <select
                    className="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={searchPartner}
                    onChange={(event) => setSearchPartner(event.target.value)}
                  >
                    <option value="">All partners</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.id}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-500">
                    Type at least two characters to search globally.
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Ticket type
                    </label>
                    <select
                      className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white"
                      value={searchTicket}
                      onChange={(event) => setSearchTicket(event.target.value)}
                    >
                      <option value="all">All tickets</option>
                      {searchTicketOptions.map((ticket) => (
                        <option key={ticket} value={ticket}>
                          {ticket}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Visit status
                    </label>
                    <select
                      className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white"
                      value={searchVisited}
                      onChange={(event) =>
                        setSearchVisited(
                          event.target.value as SearchVisitedFilter
                        )
                      }
                    >
                      <option value="all">All</option>
                      <option value="visited">Visited</option>
                      <option value="unvisited">Awaiting visit</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      From
                    </label>
                    <Input
                      type="date"
                      value={searchStartDate}
                      onChange={(event) =>
                        setSearchStartDate(event.target.value)
                      }
                      className="bg-white/[0.08] text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      To
                    </label>
                    <Input
                      type="date"
                      value={searchEndDate}
                      onChange={(event) => setSearchEndDate(event.target.value)}
                      className="bg-white/[0.08] text-white"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>
                    Showing {numberFormatter.format(filteredSearchCount)}{" "}
                    results
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(secondaryButtonClass)}
                    onClick={resetSearchFilters}
                  >
                    Reset filters
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/[0.04]">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                          Partner
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                          Email
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                          Ticket
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-300">
                          Total
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                          QR Status
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                          Visit
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 bg-white/[0.02]">
                      {loadingSearch ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-4 text-center text-sm text-slate-400"
                          >
                            Searching…
                          </td>
                        </tr>
                      ) : filteredSearchResults.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-4 text-center text-sm text-slate-400"
                          >
                            {searchResults.length === 0
                              ? searchTerm.trim().length < 2 && !searchPartner
                                ? "Enter at least two characters to search."
                                : "No submissions matched your criteria."
                              : "No submissions match the selected filters."}
                          </td>
                        </tr>
                      ) : (
                        filteredSearchResults.map((item, index) => (
                          <tr key={`${item.partnerId}-${item.email}-${index}`}>
                            <td className="px-3 py-2 text-sm text-slate-200">
                              {String(item.partnerId)}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-300">
                              {item.email}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-300">
                              {item.ticket || "N/A"}
                            </td>
                            <td className="px-3 py-2 text-right text-sm text-slate-300">
                              {currencyFormatter.format(item.totalPrice || 0)}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-300">
                              {item.used ? "Used" : "Pending"}
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-300">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    item.visited
                                      ? "bg-emerald-500/15 text-emerald-200"
                                      : "bg-amber-400/15 text-amber-200"
                                  }`}
                                >
                                  {item.visited ? "Visited" : "Unconfirmed"}
                                </span>
                                {item.visitedAt ? (
                                  <span className="text-xs text-slate-400">
                                    {formatDate(item.visitedAt)}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-400">
                              {formatDate(item.createdAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      <Dialog
        open={Boolean(editingPartnerId)}
        onOpenChange={(open) => (open ? null : closePartnerEditor())}
      >
        {partnerForm ? (
          <DialogContent
            className="bg-slate-900 text-white"
            showCloseButton={false}
          >
            <DialogHeader>
              <DialogTitle>Edit partner settings</DialogTitle>
              <DialogDescription className="text-slate-400">
                Adjust contract terms and business details for{" "}
                {partnerForm.partnerId.toUpperCase()}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="partner-status">Status</Label>
                <select
                  id="partner-status"
                  value={partnerForm.status}
                  onChange={(event) =>
                    handlePartnerFieldChange("status", event.target.value)
                  }
                  className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="partner-monthly-fee">Monthly fee (CZK)</Label>
                  <Input
                    id="partner-monthly-fee"
                    value={partnerForm.monthlyFee}
                    onChange={(event) =>
                      handlePartnerFieldChange("monthlyFee", event.target.value)
                    }
                    placeholder="0"
                    className="bg-white/[0.08] text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="partner-discount">Discount %</Label>
                  <Input
                    id="partner-discount"
                    value={partnerForm.discountRate}
                    onChange={(event) =>
                      handlePartnerFieldChange(
                        "discountRate",
                        event.target.value
                      )
                    }
                    placeholder="0"
                    className="bg-white/[0.08] text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="partner-commission">Commission %</Label>
                  <Input
                    id="partner-commission"
                    value={partnerForm.commissionRate}
                    onChange={(event) =>
                      handlePartnerFieldChange(
                        "commissionRate",
                        event.target.value
                      )
                    }
                    placeholder="0"
                    className="bg-white/[0.08] text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="partner-commission-basis">
                    Commission basis
                  </Label>
                  <select
                    id="partner-commission-basis"
                    value={partnerForm.commissionBasis}
                    onChange={(event) =>
                      handlePartnerFieldChange(
                        "commissionBasis",
                        event.target.value
                      )
                    }
                    className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white"
                  >
                    <option value="discounted">Discounted price</option>
                    <option value="original">Original price</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="partner-ticket-types">
                  Ticket types (comma separated)
                </Label>
                <Input
                  id="partner-ticket-types"
                  value={partnerForm.ticketTypes}
                  onChange={(event) =>
                    handlePartnerFieldChange("ticketTypes", event.target.value)
                  }
                  placeholder="Adult, Child, Family"
                  className="bg-white/[0.08] text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner-family-rule">Family ticket rule</Label>
                <Input
                  id="partner-family-rule"
                  value={partnerForm.familyRule}
                  onChange={(event) =>
                    handlePartnerFieldChange("familyRule", event.target.value)
                  }
                  placeholder="e.g. Minimum 4 guests"
                  className="bg-white/[0.08] text-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="partner-contact-name">Contact name</Label>
                  <Input
                    id="partner-contact-name"
                    value={partnerForm.contactName}
                    onChange={(event) =>
                      handlePartnerFieldChange(
                        "contactName",
                        event.target.value
                      )
                    }
                    className="bg-white/[0.08] text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="partner-contact-email">Contact email</Label>
                  <Input
                    id="partner-contact-email"
                    value={partnerForm.contactEmail}
                    onChange={(event) =>
                      handlePartnerFieldChange(
                        "contactEmail",
                        event.target.value
                      )
                    }
                    className="bg-white/[0.08] text-white"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="partner-payments">
                  Accepted payments (comma or newline separated)
                </Label>
                <Textarea
                  id="partner-payments"
                  value={partnerForm.payments}
                  onChange={(event) =>
                    handlePartnerFieldChange("payments", event.target.value)
                  }
                  className="bg-white/[0.08] text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner-facilities">
                  Facilities (comma or newline separated)
                </Label>
                <Textarea
                  id="partner-facilities"
                  value={partnerForm.facilities}
                  onChange={(event) =>
                    handlePartnerFieldChange("facilities", event.target.value)
                  }
                  className="bg-white/[0.08] text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner-website">Website / booking URL</Label>
                <Input
                  id="partner-website"
                  value={partnerForm.website}
                  onChange={(event) =>
                    handlePartnerFieldChange("website", event.target.value)
                  }
                  placeholder="https://"
                  className="bg-white/[0.08] text-white"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.05] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    Bonus program
                  </p>
                  <p className="text-xs text-slate-400">
                    Toggle if this partner participates in the Lasermax bonus
                    program.
                  </p>
                </div>
                <Switch
                  checked={partnerForm.bonusProgramEnabled}
                  onCheckedChange={(value) =>
                    handlePartnerFieldChange("bonusProgramEnabled", value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="partner-notes">Internal notes</Label>
                <Textarea
                  id="partner-notes"
                  value={partnerForm.notes}
                  onChange={(event) =>
                    handlePartnerFieldChange("notes", event.target.value)
                  }
                  className="bg-white/[0.08] text-white"
                  rows={4}
                />
              </div>

              <p className="text-xs text-slate-500">
                Last updated:{" "}
                {partnerForm.updatedAt
                  ? formatDate(partnerForm.updatedAt)
                  : "—"}
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={closePartnerEditor}
                className={cn(secondaryButtonClass)}
                disabled={savingPartner}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePartner}
                className={cn(primaryButtonClass)}
                disabled={savingPartner}
              >
                {savingPartner ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  className = "",
  style,
}: MetricCardProps) {
  return (
    <Card
      className={`border-white/20 bg-gradient-to-br from-white/[0.06] to-white/[0.1] backdrop-blur-xl shadow-lg overflow-hidden relative rounded-xl ${className}`}
      style={style}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {title}
          </p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 leading-relaxed">{subtitle}</p>
          )}
        </div>
      </CardContent>
      <div className="absolute inset-0 rounded-xl ring-1 ring-white/10"></div>
    </Card>
  );
}
