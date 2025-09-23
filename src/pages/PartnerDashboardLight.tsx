import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePartnerData } from '@/hooks/usePartnerData';
import { Sidebar } from '@/components/Sidebar';
import { SubmissionsTable } from '@/components/SubmissionsTable';
import { RedemptionProcessor } from '@/components/RedemptionProcessor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Package,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { SubmissionRecord } from '@/types/dashboard';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function PartnerDashboardLight() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, logout } = useAuth();
  const partnerId = user?.partnerId || '';
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  
  const { data, loading, error, refetch } = usePartnerData(partnerId, {
    token,
    onUnauthorized: logout,
  });

  // Handle hash navigation
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && ['overview', 'submissions', 'redemptions', 'analytics'].includes(hash)) {
      setActiveSection(hash);
    }
  }, [location.hash]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const submissions = useMemo(() => {
    return Array.isArray(data?.submissions) ? data.submissions as SubmissionRecord[] : [];
  }, [data?.submissions]);

  const metrics = useMemo(() => {
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

    const averageRevenue = count > 0 ? revenue / count : 0;
    const conversionRate = count > 0 ? (used / count) * 100 : 0;

    return {
      count,
      used,
      unused: count - used,
      visited,
      notVisited: count - visited,
      revenue,
      points,
      averageRevenue,
      conversionRate,
    };
  }, [submissions]);

  const revenueData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: format(date, 'MMM dd'),
        revenue: Math.floor(Math.random() * 5000) + 1000,
      };
    }).reverse();
    return last7Days;
  }, []);

  const ticketDistribution = useMemo(() => {
    const distribution = submissions.reduce<Record<string, number>>((acc, sub) => {
      const ticket = sub.ticket || 'Unknown';
      acc[ticket] = (acc[ticket] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
      percentage: (value / submissions.length) * 100,
    }));
  }, [submissions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <Sidebar
          user={user!}
          onLogout={handleLogout}
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
                {activeSection === 'overview' && 'Dashboard Overview'}
                {activeSection === 'submissions' && 'Submissions'}
                {activeSection === 'redemptions' && 'Redemptions'}
                {activeSection === 'analytics' && 'Analytics'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
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
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <Button variant="outline" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <Button size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error.message || 'Unable to load data. Please try again.'}
            </div>
          )}

          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-sm font-medium">Total Revenue</CardDescription>
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(metrics.revenue)}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600 font-medium">+12.5%</span>
                      <span className="text-sm text-gray-500">from last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-sm font-medium">Total Submissions</CardDescription>
                      <Users className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(metrics.count)}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-blue-600 font-medium">{metrics.used} used</span>
                      <span className="text-sm text-gray-500">• {metrics.unused} pending</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-sm font-medium">Conversion Rate</CardDescription>
                      <Activity className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600 font-medium">-2.3%</span>
                      <span className="text-sm text-gray-500">from last week</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-sm font-medium">Total Points</CardDescription>
                      <Package className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(metrics.points)}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-sm text-gray-500">Avg</span>
                      <span className="text-sm text-gray-700 font-medium">
                        {(metrics.points / Math.max(metrics.count, 1)).toFixed(0)} pts/submission
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>Daily revenue over the past week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Distribution</CardTitle>
                    <CardDescription>Breakdown by ticket type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={ticketDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {ticketDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {ticketDistribution.slice(0, 3).map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            />
                            <span className="text-sm text-gray-600">{item.name}</span>
                          </div>
                          <span className="text-sm font-medium">{item.percentage.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Submissions</CardTitle>
                      <CardDescription>Latest customer activity</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setActiveSection('submissions')}>
                      View All
                      <ArrowUpRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {submissions.slice(0, 5).map((submission, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {submission.email?.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{submission.email}</p>
                            <p className="text-xs text-gray-500">
                              {submission.ticket} • {submission.numPeople} people
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(submission.totalPrice || 0)}</p>
                          <Badge
                            variant={submission.visited ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {submission.visited ? 'Visited' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'submissions' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Submissions</CardTitle>
                    <CardDescription>Complete list of partner submissions</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <SubmissionsTable
                  submissions={submissions}
                  isLoading={loading}
                />
              </CardContent>
            </Card>
          )}

          {activeSection === 'redemptions' && (
            <div>
              <RedemptionProcessor partnerId={partnerId} token={token} />
            </div>
          )}

          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Overview</CardTitle>
                  <CardDescription>Detailed performance metrics and insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Analytics features coming soon...</p>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}