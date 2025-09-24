import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Gift, Search, Check, X, AlertCircle, Calendar, User, MapPin, Ticket, Clock, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { format } from 'date-fns';

interface RedemptionData {
  redemption: {
    code: string;
    email: string;
    status: string;
    redeemedAt: string;
    appliedAt?: string;
    expiresAt: string;
    partnerId?: string;
  };
  reward: {
    name: string;
    description?: string;
    category?: string;
    pointsValue: number;
    instructions?: string;
  };
  booking?: {
    email: string;
    visitDate: string;
    partnerId?: string;
    partnerName?: string;
    ticketType?: string;
    numPeople?: number;
    preferredDateTime?: string;
    hasVisited: boolean;
    visitedAt?: string;
  };
  isValid: boolean;
  canProcess: boolean;
}

export function RedemptionProcessor({ partnerId, token }: { partnerId: string; token?: string | null }) {
  const [redemptionCode, setRedemptionCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [redemptionData, setRedemptionData] = useState<RedemptionData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const checkRedemption = async () => {
    if (!redemptionCode.trim()) {
      setError('Please enter a redemption code');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
    setRedemptionData(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/partner/check-redemption?code=${encodeURIComponent(redemptionCode)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check redemption');
      }

      const data = await response.json();
      setRedemptionData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to check redemption');
    } finally {
      setIsLoading(false);
    }
  };

  const processRedemption = async (action: 'process' | 'reject') => {
    if (!redemptionData) return;

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/partner/check-redemption`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          code: redemptionData.redemption.code,
          action
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process redemption');
      }

      const result = await response.json();
      
      if (action === 'process') {
        setSuccess(`Redemption ${redemptionData.redemption.code} has been successfully processed!`);
      } else {
        setSuccess(`Redemption ${redemptionData.redemption.code} has been rejected.`);
      }

      // Clear the form
      setRedemptionCode('');
      setRedemptionData(null);
    } catch (err: any) {
      setError(err.message || 'Failed to process redemption');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'applied': return 'secondary';
      case 'used': return 'success';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Process Customer Redemptions
        </CardTitle>
        <CardDescription>
          Enter a redemption code to view reward details and process customer rewards
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter redemption code (e.g., RDM-XXX)"
            value={redemptionCode}
            onChange={(e) => setRedemptionCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                checkRedemption();
              }
            }}
            className="font-mono"
          />
          <Button 
            onClick={checkRedemption}
            disabled={isLoading || !redemptionCode.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Check Code
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">{success}</AlertDescription>
          </Alert>
        )}

        {redemptionData && (
          <div className="space-y-4">
            <Separator />
            
            {/* Redemption Status */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Redemption Code</p>
                <p className="font-mono text-lg font-bold">{redemptionData.redemption.code}</p>
              </div>
              <Badge variant={getStatusColor(redemptionData.redemption.status) as any}>
                {redemptionData.redemption.status.toUpperCase()}
              </Badge>
            </div>

            {/* Reward Details */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Gift className="h-4 w-4" />
                {redemptionData.reward.name}
              </h4>
              {redemptionData.reward.description && (
                <p className="text-sm text-muted-foreground">{redemptionData.reward.description}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Category:</span>{' '}
                  <span className="font-medium">{redemptionData.reward.category || 'General'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Value:</span>{' '}
                  <span className="font-medium">{redemptionData.reward.pointsValue} points</span>
                </div>
              </div>
              {redemptionData.reward.instructions && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-sm">Processing Instructions</AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    {redemptionData.reward.instructions}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Customer Details */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Customer Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span>{redemptionData.redemption.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>Redeemed: {format(new Date(redemptionData.redemption.redeemedAt), 'MMM dd, yyyy')}</span>
                </div>
              </div>
            </div>

            {/* Booking Details (if applied to a booking) */}
            {redemptionData.booking && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Applied to Booking</h4>
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {redemptionData.booking.partnerName && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{redemptionData.booking.partnerName}</span>
                        </div>
                      )}
                      {redemptionData.booking.preferredDateTime && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{format(new Date(redemptionData.booking.preferredDateTime), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                      )}
                      {redemptionData.booking.ticketType && (
                        <div className="flex items-center gap-2">
                          <Ticket className="h-3 w-3 text-muted-foreground" />
                          <span>{redemptionData.booking.ticketType} × {redemptionData.booking.numPeople}</span>
                        </div>
                      )}
                      <div>
                        <Badge variant={redemptionData.booking.hasVisited ? 'success' : 'secondary'}>
                          {redemptionData.booking.hasVisited ? 'Visited' : 'Pending Visit'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Validity Check */}
            {!redemptionData.isValid && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Invalid Redemption</AlertTitle>
                <AlertDescription>
                  This redemption is either expired or has already been used.
                </AlertDescription>
              </Alert>
            )}

            {redemptionData.isValid && !redemptionData.canProcess && (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Cannot Process</AlertTitle>
                <AlertDescription>
                  This redemption is for a different partner.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>

      {redemptionData && redemptionData.isValid && redemptionData.canProcess && redemptionData.redemption.status === 'applied' && (
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => processRedemption('reject')}
            disabled={isProcessing}
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button
            onClick={() => processRedemption('process')}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Process Redemption
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}