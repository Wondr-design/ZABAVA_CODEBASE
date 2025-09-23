import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import { getApiConfig } from '@/lib/config';
import { format } from 'date-fns';

const safeFormatDate = (value?: string | Date | null, dateFormat = 'MMM dd, yyyy') => {
  if (!value) {
    return 'Date unavailable';
  }

  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return 'Date unavailable';
  }

  try {
    return format(dateValue, dateFormat);
  } catch (error) {
    return 'Date unavailable';
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
    visitsByPartner: Array<{
      partnerId: string;
      partnerName: string;
      totalVisits: number;
      pendingVisits: number;
      totalPoints: number;
    }>;
  };
  visits: Array<{
    partnerId: string;
    partnerName: string;
    visitDate: string;
    pointsEarned: number;
    status: 'visited' | 'pending';
    ticketType: string;
  }>;
  pointsHistory: Array<{
    type: 'earned' | 'redemption';
    points: number;
    timestamp: string;
    rewardName?: string;
    partnerId?: string;
  }>;
  redemptions: Array<{
    id: string;
    rewardName: string;
    pointsSpent: number;
    redeemedAt: string;
    status: string;
    expiresAt: string;
  }>;
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
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState<UserPoints | null>(null);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState<any>(null);

  const fetchUserPoints = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/bonus/user-points?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch your bonus points');
      }

      const data = await response.json();
      setUserData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load bonus information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeemReward = async (reward: any) => {
    // Validate inputs before making the request
    if (!userData?.user?.email) {
      setError('User email not found. Please refresh the page.');
      return;
    }
    
    if (!reward?.id) {
      setError('Invalid reward selected. Please try again.');
      return;
    }
    
    setIsRedeeming(true);
    setError('');

    try {
      const apiConfig = getApiConfig();
      if (import.meta.env.VITE_DEBUG) {
        console.log('Redeeming reward:', { email: userData.user.email, rewardId: reward.id });
      }
      
      const response = await fetch(`${apiConfig.baseUrl}/api/bonus/redeem-reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userData.user.email,
          rewardId: reward.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to redeem reward');
      }

      const result = await response.json();
      setRedemptionSuccess(result.redemption);
      setSelectedReward(null);
      
      // Refresh user data
      await fetchUserPoints();
    } catch (err: any) {
      setError(err.message || 'Failed to redeem reward');
    } finally {
      setIsRedeeming(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'discount': return '🏷️';
      case 'freebie': return '🎁';
      case 'experience': return '🎢';
      case 'merchandise': return '🛍️';
      default: return '⭐';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'visited': return 'success';
      case 'pending': return 'warning';
      case 'delivered': return 'success';
      default: return 'secondary';
    }
  };

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

  const partnerStats = userData.statistics?.visitsByPartner || [];
  const pointsHistory = userData.pointsHistory || [];

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
            <CardTitle className="text-sm font-medium">Available Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {userData.user.availablePoints}
            </div>
            <p className="text-xs text-muted-foreground">Ready to redeem</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userData.user.totalPoints}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime points</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Partners Visited</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userData.statistics.totalPartners}
            </div>
            <p className="text-xs text-muted-foreground">Unique locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rewards Redeemed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userData.statistics.totalRedemptions}
            </div>
            <p className="text-xs text-muted-foreground">Total redemptions</p>
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
              Track how many confirmed points you have earned at each partner location.
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
                        {partner.totalPoints} pts
                      </p>
                    </div>
                    <Badge variant="secondary">{partner.totalVisits} visits</Badge>
                  </div>
                  <Separator className="my-3" />
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Pending visits: {partner.pendingVisits}</p>
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
              <Card key={reward.id} className={!reward.canRedeem ? 'opacity-60' : ''}>
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
                      <span className="font-bold text-lg">{reward.pointsCost} points</span>
                    </div>
                    <Badge variant={reward.canRedeem ? 'default' : 'secondary'}>
                      {reward.canRedeem ? 'Available' : 'Insufficient Points'}
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
                <div className="space-y-4">
                  {userData.visits.map((visit, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{visit.partnerName}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(visit.visitDate), 'MMM dd, yyyy')}
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
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Points History Tab */}
        <TabsContent value="points" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Points History</CardTitle>
              <CardDescription>
                Your points earned and redeemed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {pointsHistory.length > 0 ? (
                  <div className="space-y-4">
                    {pointsHistory.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          {entry.type === 'earned' ? (
                            <TrendingUp className="h-5 w-5 text-green-500" />
                          ) : (
                            <Gift className="h-5 w-5 text-blue-500" />
                          )}
                          <div>
                            <p className="font-medium">
                              {entry.type === 'earned' ? 'Points Earned' : 'Reward Redeemed'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {entry.rewardName || 'Partner visit'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className={`font-bold ${entry.type === 'earned' ? 'text-green-500' : 'text-red-500'}`}>
                          {entry.type === 'earned' ? '+' : '-'}{entry.points} pts
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[200px] items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      No points history found yet. Earn points by visiting partners or redeem rewards to see activity here.
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
          {userData.redemptions.filter(r => r.status === 'pending' || r.status === 'applied').length > 0 && (
            <Alert className="border-primary">
              <Star className="h-4 w-4" />
              <AlertTitle>How to use your redemption codes</AlertTitle>
              <AlertDescription>
                When booking your next visit on our website, enter the redemption code in the "Redemption Code" field. 
                The partner will see your reward details and process it when you arrive.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4">
            {userData.redemptions.map((redemption) => {
              const isActive = redemption.status === 'pending' || redemption.status === 'applied';
              const isUsed = redemption.status === 'used';
              const isExpired = new Date(redemption.expiresAt) < new Date();
              
              return (
                <Card key={redemption.id} className={!isActive ? 'opacity-75' : ''}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Gift className="h-5 w-5" />
                          {redemption.rewardName}
                        </CardTitle>
                        <div className="mt-2 p-3 bg-muted rounded-md">
                          <p className="text-xs text-muted-foreground mb-1">Redemption Code:</p>
                          <p className="font-mono text-lg font-bold">{redemption.id}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge variant={getStatusColor(redemption.status) as any}>
                          {redemption.status === 'pending' ? 'Ready to Use' : 
                           redemption.status === 'applied' ? 'Applied to Booking' :
                           redemption.status === 'used' ? 'Used' : redemption.status}
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
                            <strong>To use this reward:</strong> Enter code <span className="font-mono font-bold">{redemption.id}</span> 
                            when making your next booking on our website.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Redeemed</p>
                          <p className="font-medium">
                            {safeFormatDate(redemption.redeemedAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Points Spent</p>
                          <p className="font-medium">{redemption.pointsSpent} pts</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expires</p>
                          <p className="font-medium">
                            {safeFormatDate(redemption.expiresAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {userData.redemptions.length === 0 && (
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
      <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
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
                <p className="text-sm text-muted-foreground mb-3">{selectedReward.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Points Cost:</span>
                  <span className="font-bold">{selectedReward.pointsCost} pts</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm">Your Balance After:</span>
                  <span className="font-bold">
                    {userData.user.availablePoints - selectedReward.pointsCost} pts
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
                'Confirm Redemption'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!redemptionSuccess} onOpenChange={() => setRedemptionSuccess(null)}>
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
                  <strong>Points Spent:</strong> {redemptionSuccess.pointsSpent} pts
                </p>
                <p className="text-sm">
                  <strong>Remaining Balance:</strong> {redemptionSuccess.remainingPoints} pts
                </p>
                <p className="text-sm">
                  <strong>Valid Until:</strong> {safeFormatDate(redemptionSuccess.expiresAt, 'MMMM dd, yyyy')}
                </p>
              </div>

              <Alert className="border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-sm">How to use this code</AlertTitle>
                <AlertDescription className="text-sm mt-2">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to our booking website</li>
                    <li>Fill out the appointment form</li>
                    <li>Enter code <span className="font-mono font-bold">{redemptionSuccess.code}</span> in the "Redemption Code" field</li>
                    <li>The partner will apply your reward when you arrive</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setRedemptionSuccess(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}