import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Link2, Loader2, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL, buildApiUrl } from "@/lib/config";
import { cn } from "@/lib/utils";
import type {
  AdminInvite,
  AnalyticsPartnerOption,
  InviteSummaryMessage,
} from "@/types/dashboard";

const PRIMARY_BUTTON_CLASS = "bg-blue-600 text-white hover:bg-blue-700 border border-blue-600";
const SECONDARY_BUTTON_CLASS = "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300";

interface InviteRowProps {
  invite: AdminInvite;
  onCopyLink: (invite: AdminInvite) => void;
  onCopyToken: (token: string) => void;
}

interface InviteDetailProps {
  title: string;
  value: string;
  highlight?: boolean;
}

interface SummaryStatProps {
  label: string;
  value: string;
  tone: "pending" | "used" | "warning";
}

interface RefreshInvitesOptions {
  silent?: boolean;
  signal?: AbortSignal;
}

interface PartnerOption extends AnalyticsPartnerOption {
  metrics?: { count?: number };
  lastSubmissionAt?: string | null;
}

function formatDate(iso?: string | Date | null): string {
  if (!iso) return "—";
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCountdown(iso?: string | null): string {
  if (!iso) return "—";
  const expires = new Date(iso).getTime();
  if (Number.isNaN(expires)) return "—";
  const diff = expires - Date.now();
  if (diff <= 0) return "Expired";
  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function InviteRow({ invite, onCopyLink, onCopyToken }: InviteRowProps): JSX.Element {
  const isUsed = invite.used;
  const statusStyles = isUsed
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-yellow-200 bg-yellow-50 text-yellow-700";
  const statusLabel = isUsed ? "Used" : "Pending";
  const expiresSoon = !isUsed && invite.expiresAt && new Date(invite.expiresAt) - Date.now() < 86_400_000;
  const expiresLabel = formatCountdown(invite.expiresAt);

  return (
    <div className="group grid gap-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
        <div className="min-w-0 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
            <span className="text-gray-700 font-bold text-lg">
              {invite.email ? invite.email.charAt(0).toUpperCase() : "?"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {invite.email || "(no email)"}
            </p>
            <p className="truncate text-sm text-gray-500 group-hover:text-gray-600 transition-colors">
              {invite.name ? invite.name : "Partner contact"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm ${statusStyles}`}>
            <div className={`inline-block h-1.5 w-1.5 rounded-full mr-2 ${isUsed ? "bg-green-500" : "bg-yellow-500"}`}></div>
            {statusLabel}
          </span>
          <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-700 font-medium px-3 py-1">
            {(invite.partnerId || "").toString().toUpperCase() || "—"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
        <InviteDetail title="Created" value={formatDate(invite.createdAt)} />
        <InviteDetail title="Expires" value={formatDate(invite.expiresAt)} highlight={expiresSoon} />
        <InviteDetail title="Time remaining" value={expiresLabel} highlight={expiresSoon && !isUsed} />
        <InviteDetail
          title="Used on"
          value={isUsed ? formatDate(invite.usedAt) : "Not yet"}
          highlight={isUsed}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 relative z-10">
        <Button
          size="sm"
          variant="outline"
          className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm font-medium px-4 py-2 rounded-lg transition-all duration-200"
          onClick={() => onCopyLink(invite)}
        >
          <Link2 className="size-4 mr-2" /> Copy invite link
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 shadow-sm font-medium px-4 py-2 rounded-lg transition-all duration-200"
          onClick={() => onCopyToken(invite.token)}
        >
          <Copy className="size-4 mr-2" /> Copy token
        </Button>
        {invite.inviteUrl ? (
          <a
            href={invite.inviteUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline transition-colors font-medium"
          >
            Open invite
          </a>
        ) : null}
      </div>
    </div>
  );
}

function InviteDetail({ title, value, highlight }: InviteDetailProps): JSX.Element {
  return (
    <div className={`rounded-lg border px-4 py-3 text-xs shadow-sm transition-all duration-200 ${
      highlight 
        ? "border-green-200 bg-green-50 text-green-700" 
        : "border-gray-200 bg-gray-50 text-gray-600"
    }`}>
      <p className={`uppercase tracking-widest font-semibold ${
        highlight ? "text-green-600" : "text-gray-500"
      }`}>{title}</p>
      <p
        className={`mt-2 truncate text-sm font-medium ${
          highlight ? "text-green-800" : "text-gray-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function InviteManager(): JSX.Element {
  const navigate = useNavigate();
  const { isAuthenticated, user, token } = useAuth();
  const isAdmin = user?.role === "admin";

  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [useCustomPartner, setUseCustomPartner] = useState<boolean>(false);
  const [customPartnerId, setCustomPartnerId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [expiresIn, setExpiresIn] = useState<string>("10080");
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loadingPartners, setLoadingPartners] = useState<boolean>(false);
  const [loadingInvites, setLoadingInvites] = useState<boolean>(false);
  const [refreshingInvites, setRefreshingInvites] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<InviteSummaryMessage | null>(null);
  const [partnersRefreshIndex, setPartnersRefreshIndex] = useState<number>(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  const inviteStats = useMemo(() => {
    const pending = invites.filter((invite) => !invite.used).length;
    const used = invites.length - pending;
    const expiringSoon = invites.filter((invite) => {
      if (invite.used) return false;
      if (!invite.expiresAt) return false;
      const diff = new Date(invite.expiresAt).getTime() - Date.now();
      return diff > 0 && diff < 86_400_000;
    }).length;
    return { pending, used, expiringSoon };
  }, [invites]);

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const refreshInvites = useCallback(
    async ({ silent = false, signal }: RefreshInvitesOptions = {}): Promise<void> => {
      if (!isAdmin || !token) return;
      if (silent) {
        setRefreshingInvites(true);
      } else {
        setLoadingInvites(true);
      }
      try {
        const response = await fetch(buildApiUrl("/api/admin/invites"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load invites: ${response.status}`);
        }
        const payload = (await response.json()) as { items?: AdminInvite[] };
        const list = (payload.items || [])
          .map((item) => ({ ...item }))
          .sort(
            (a, b) =>
              new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
          );
        setInvites(list);
        setLastFetchedAt(new Date());
      } catch (unknownError) {
        const err = unknownError as Error & { name?: string };
        if (err.name === "AbortError") return;
        console.error(err);
        setMessage({ type: "error", text: err.message || "Failed to load invites." });
      } finally {
        if (silent) {
          setRefreshingInvites(false);
        } else {
          setLoadingInvites(false);
        }
      }
    },
    [isAdmin, token]
  );

  useEffect(() => {
    if (!isAdmin || !token) return;
    let abort = false;
    const controller = new AbortController();
    async function fetchPartners(): Promise<void> {
      setLoadingPartners(true);
      try {
        const response = await fetch(buildApiUrl("/api/admin/analytics", { mode: "metrics" }), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load partners: ${response.status}`);
        }
        const payload = (await response.json()) as { partners?: AnalyticsPartnerOption[] };
        if (abort) return;
        const items = (payload.partners || []).map((record) => ({
          id: (record.id || "").toLowerCase(),
          metrics: record.metrics || {},
          lastSubmissionAt: record.lastSubmissionAt || null,
        }));
        items.sort((a, b) => a.id.localeCompare(b.id));
        setPartners(items);
        if (!useCustomPartner && items.length && !selectedPartner) {
          setSelectedPartner(items[0].id);
        }
      } catch (unknownError) {
        const err = unknownError as Error & { name?: string };
        if (err.name === "AbortError") return;
        console.error(err);
        setMessage({ type: "error", text: err.message || "Failed to load partners." });
      } finally {
        if (!abort) {
          setLoadingPartners(false);
        }
      }
    }
    void fetchPartners();
    return () => {
      abort = true;
      controller.abort();
    };
  }, [isAdmin, token, partnersRefreshIndex, useCustomPartner, selectedPartner]);

  useEffect(() => {
    const controller = new AbortController();
    refreshInvites({ signal: controller.signal });
    return () => controller.abort();
  }, [refreshInvites]);

  useEffect(() => {
    if (!message) return undefined;
    const timeout = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (!invites.length) return undefined;
    if (!invites.some((invite) => !invite.used)) return undefined;
    const interval = setInterval(() => {
      refreshInvites({ silent: true });
    }, 15000);
    return () => clearInterval(interval);
  }, [invites, refreshInvites]);

  const handleCopy = (value) => {
    navigator.clipboard
      .writeText(value)
      .then(() => setMessage({ type: "success", text: "Copied to clipboard." }))
      .catch(() => setMessage({ type: "error", text: "Failed to copy." }));
  };

  const handleLinkCopy = (invite) => {
    const params = new URLSearchParams({ token: invite.token });
    if (invite.email) params.set("email", invite.email);
    if (invite.name) params.set("name", invite.name);
    const fallbackUrl = `${window.location.origin}/signup?${params.toString()}`;
    handleCopy(invite.inviteUrl || fallbackUrl);
  };

  const createInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const partnerIdToUse = useCustomPartner
      ? customPartnerId.trim()
      : selectedPartner;
    if (!partnerIdToUse) {
      setMessage({ type: "error", text: "Specify a partner ID." });
      return;
    }
    if (!email.trim()) {
      setMessage({ type: "error", text: "Enter an email." });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          partnerId: partnerIdToUse,
          role: "partner",
          name: name.trim() || undefined,
          expiresInMinutes: Number(expiresIn) || undefined,
        }),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || "Failed to create invite");
      }
      setEmail("");
      setName("");
      if (useCustomPartner) {
        setCustomPartnerId("");
      }
      setMessage({ type: "success", text: "Invite created." });
      await refreshInvites({ silent: true });
    } catch (unknownError) {
      const err = unknownError as Error;
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to create invite." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusAlert = message ? (
    <div
      className={`rounded-xl border px-5 py-4 text-sm font-medium shadow-lg backdrop-blur-sm animate-in fade-in-0 slide-in-from-top-2 duration-300 ${
        message.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${
          message.type === "success" ? "bg-emerald-500" : "bg-red-500"
        } animate-pulse`}></div>
        {message.text}
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 relative overflow-hidden">
      {/* Subtle background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-purple-50"></div>
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-100/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl"></div>
      <div className="relative z-10 py-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Partner invites</h1>
            </div>
            <p className="max-w-2xl text-sm text-gray-600">
              Generate one-time signup links for partner contacts. Invites automatically switch to
              <span className="text-green-600"> “used”</span> once the partner completes their registration.
            </p>
            {lastFetchedAt ? (
              <p className="text-xs text-gray-500">
                Last updated {formatDate(lastFetchedAt.toISOString())}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="bg-blue-600 text-white border-0 hover:bg-blue-700 shadow-lg font-medium px-4 py-2.5 rounded-lg transition-all duration-200"
              onClick={() => refreshInvites()}
              disabled={loadingInvites || refreshingInvites}
            >
              <RefreshCw className={`size-4 ${loadingInvites || refreshingInvites ? "animate-spin" : ""}`} />
              Refresh invites
            </Button>
            <Button
              variant="outline"
              className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 shadow-md font-medium px-4 py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50"
              onClick={() => setPartnersRefreshIndex((prev) => prev + 1)}
              disabled={loadingPartners}
            >
              <RefreshCw className={`size-4 ${loadingPartners ? "animate-spin" : ""}`} />
              Refresh partners
            </Button>
            <Button
              variant="outline"
              className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 shadow-md font-medium px-4 py-2.5 rounded-lg transition-all duration-200"
              onClick={() => navigate("/admin/dashboard")}
            >
              View analytics
            </Button>
          </div>
        </header>

        {statusAlert}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="group border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:border-gray-300 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-xl font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">Create invite</CardTitle>
              <CardDescription className="text-gray-600 group-hover:text-gray-700 transition-colors">
                Complete the form to issue a single-use signup link. You can pre-select partners or input a custom ID.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <form className="grid gap-6" onSubmit={createInvite}>
                <div className="grid gap-4">
                  <Label className="text-sm font-semibold uppercase tracking-widest text-gray-700">Partner</Label>
                  <div className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-inner">
                    <div className="flex flex-col gap-2">
                      <select
                        value={selectedPartner}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                          setSelectedPartner(event.target.value)
                        }
                        disabled={loadingPartners || !partners.length || useCustomPartner}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 disabled:cursor-not-allowed disabled:text-gray-400 disabled:opacity-60"
                      >
                        {partners.length === 0 ? (
                          <option value="">
                            {loadingPartners ? "Loading partners..." : "No partners yet"}
                          </option>
                        ) : (
                          partners.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                              {partner.id.toUpperCase()} · {numberFormatter.format(partner.metrics?.count ?? 0)} submissions
                            </option>
                          ))
                        )}
                      </select>
                      <p className="text-xs text-gray-500">
                        Partners appear automatically after the first verified submission that uses their
                        <code className="mx-1 text-gray-700 bg-gray-100 px-1 rounded">partner_id</code>.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          checked={useCustomPartner}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setUseCustomPartner(event.target.checked)
                          }
                        />
                        Enter custom partner ID
                      </label>
                      <Input
                        value={customPartnerId}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setCustomPartnerId(event.target.value.toUpperCase())
                        }
                        placeholder="e.g. LZ001"
                        disabled={!useCustomPartner}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 rounded-lg shadow-sm disabled:cursor-not-allowed disabled:text-gray-400 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="invite-email" className="text-sm font-semibold text-gray-700">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="partner@example.com"
                    value={email}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setEmail(event.target.value)
                    }
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 rounded-lg shadow-sm py-3"
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="invite-name" className="text-sm font-semibold text-gray-700">Contact name (optional)</Label>
                  <Input
                    id="invite-name"
                    type="text"
                    placeholder="Contact name"
                    value={name}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setName(event.target.value)
                    }
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 rounded-lg shadow-sm py-3"
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="invite-expiry" className="text-sm font-semibold text-gray-700">Expires in minutes</Label>
                  <Input
                    id="invite-expiry"
                    type="number"
                    min="30"
                    max="43200"
                    value={expiresIn}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setExpiresIn(event.target.value)
                    }
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 rounded-lg shadow-sm py-3"
                  />
                  <p className="text-xs text-gray-500">
                    Default is 7 days (10,080 minutes). Shorten this for sensitive access windows.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || loadingPartners}
                  className="bg-green-600 text-white border-0 hover:bg-green-700 shadow-lg font-semibold px-6 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" /> Generating invite…
                    </>
                  ) : (
                    "Generate invite"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="text-xs text-gray-500 relative z-10">
              Invites are single-use. When the partner finishes signup, the row below flips to “Used” automatically.
            </CardFooter>
          </Card>

          <Card className="group border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:border-gray-300 overflow-hidden relative p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardHeader className="relative z-10 -m-6 mb-0 p-6">
              <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">Invite activity</CardTitle>
              <CardDescription className="text-gray-600 group-hover:text-gray-700 transition-colors">Monitor pending access and quick stats.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 relative z-10 -m-6 mt-0 p-6">
              <SummaryStat
                label="Pending"
                value={numberFormatter.format(inviteStats.pending)}
                tone="pending"
              />
              <SummaryStat
                label="Used"
                value={numberFormatter.format(inviteStats.used)}
                tone="used"
              />
              <SummaryStat
                label="Expiring soon (24h)"
                value={numberFormatter.format(inviteStats.expiringSoon)}
                tone="warning"
              />
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600 shadow-inner">
                <p className="font-semibold text-gray-800 mb-2">Need to resend?</p>
                <p className="leading-relaxed">
                  You can reuse an invite token until it is marked “used”. For a fresh link, generate a new invite—old
                  links automatically expire after their cutoff.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Recent invites</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {refreshingInvites || loadingInvites ? (
                <span className="flex items-center gap-1 text-green-600">
                  <RefreshCw className="size-3 animate-spin" /> Updating…
                </span>
              ) : null}
              <span>
                Showing {numberFormatter.format(invites.length)} {invites.length === 1 ? "result" : "results"}
              </span>
            </div>
          </div>
          {loadingInvites && !invites.length ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
              Loading invites…
            </div>
          ) : invites.length ? (
            <div className="grid gap-3">
              {invites.map((invite) => (
                <InviteRow
                  key={invite.token}
                  invite={invite}
                  onCopyLink={handleLinkCopy}
                  onCopyToken={handleCopy}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
              No invites yet. Generate one above to see it tracked here.
            </div>
          )}
        </section>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, tone }: SummaryStatProps): JSX.Element {
  const toneClasses = {
    pending: "border-amber-200 bg-amber-50 text-amber-800",
    used: "border-green-200 bg-green-50 text-green-800",
    warning: "border-red-200 bg-red-50 text-red-800",
  };
  
  const iconClasses = {
    pending: "bg-amber-500",
    used: "bg-green-500",
    warning: "bg-red-500",
  };
  
  return (
    <div className={`group rounded-xl border px-5 py-5 text-sm font-medium shadow-md transition-all duration-200 hover:shadow-lg ${toneClasses[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest font-semibold">{label}</p>
        <div className={`h-2 w-2 rounded-full ${iconClasses[tone]} animate-pulse`}></div>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}
