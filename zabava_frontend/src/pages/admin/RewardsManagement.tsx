import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Gift, 
  TrendingUp,
  Users,
  Package,
  AlertCircle,
  Loader2,
  Save,
  X
} from 'lucide-react';
import { getApiConfig } from '@/lib/config';
import { format } from 'date-fns';

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: 'discount' | 'freebie' | 'experience' | 'merchandise' | 'other';
  availableFor: string[];
  stock?: number;
  imageUrl?: string;
  redemptionInstructions?: string;
  validUntil?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Partner {
  partnerId: string;
  name?: string;
  status?: string;
}

export default function RewardsManagement() {
  const { user, token } = useAuth();
  const adminSecret = import.meta.env.VITE_ADMIN_SECRET || 'zabava';
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pointsCost: 0,
    category: 'discount' as const,
    availableFor: [] as string[],
    stock: undefined as number | undefined,
    imageUrl: '',
    redemptionInstructions: '',
    validUntil: ''
  });

  useEffect(() => {
    fetchRewards();
    fetchPartners();
  }, []);

  const fetchRewards = async () => {
    try {
      setIsLoading(true);
      const apiConfig = getApiConfig();
      // Debug: fetching rewards
      if (import.meta.env.VITE_DEBUG) {
        console.log('Fetching rewards from:', `${apiConfig.baseUrl}/api/admin/rewards`);
      }
      
      const response = await fetch(`${apiConfig.baseUrl}/api/admin/rewards`, {
        headers: {
          'x-admin-secret': adminSecret,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch rewards: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (import.meta.env.VITE_DEBUG) {
        console.log('Rewards response:', data);
      }
      
      // Handle both empty arrays and null/undefined
      const rewardsList = data.rewards || [];
      if (import.meta.env.VITE_DEBUG) {
        console.log('Setting rewards:', rewardsList);
      }
      
      setRewards(rewardsList);
      setStatistics(data.statistics || {
        totalRewards: rewardsList.length,
        activeRewards: rewardsList.filter((r: any) => r.status === 'active').length,
        categories: [],
        totalStock: 0
      });
    } catch (err: any) {
      console.error('Error fetching rewards:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const apiConfig = getApiConfig();
      if (import.meta.env.VITE_DEBUG) {
        console.log('Fetching partners from:', `${apiConfig.baseUrl}/api/admin/partners`);
      }
      
      const response = await fetch(`${apiConfig.baseUrl}/api/admin/partners`, {
        headers: {
          'x-admin-secret': adminSecret,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch partners');
      }

      const data = await response.json();
      if (import.meta.env.VITE_DEBUG) {
        console.log('Partners response:', data);
      }
      
      // The API returns 'items' not 'partners'
      const partnersList = data.items || data.partners || [];
      if (import.meta.env.VITE_DEBUG) {
        console.log('Partners list:', partnersList);
      }
      setPartners(partnersList);
    } catch (err) {
      console.error('Failed to fetch partners:', err);
      // Set some mock partners for testing if the API fails
      setPartners([
        { partnerId: 'OSM001', name: 'LaserMaxx', status: 'active' },
        { partnerId: 'ZOO001', name: 'Adventure Park', status: 'active' },
        { partnerId: 'BW001', name: 'Bowling Center', status: 'active' }
      ]);
    }
  };

  const handleCreateReward = () => {
    setIsCreating(true);
    setSelectedReward(null);
    setFormData({
      name: '',
      description: '',
      pointsCost: 0,
      category: 'discount',
      availableFor: [],
      stock: undefined,
      imageUrl: '',
      redemptionInstructions: '',
      validUntil: ''
    });
    setIsDialogOpen(true);
  };

  const handleEditReward = (reward: Reward) => {
    setIsCreating(false);
    setSelectedReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description,
      pointsCost: reward.pointsCost,
      category: reward.category,
      availableFor: reward.availableFor,
      stock: reward.stock,
      imageUrl: reward.imageUrl || '',
      redemptionInstructions: reward.redemptionInstructions || '',
      validUntil: reward.validUntil || ''
    });
    setIsDialogOpen(true);
  };

  const handleSaveReward = async () => {
    setIsSaving(true);
    setError('');

    try {
      const apiConfig = getApiConfig();
      const url = isCreating 
        ? `${apiConfig.baseUrl}/api/admin/rewards`
        : `${apiConfig.baseUrl}/api/admin/rewards/${selectedReward?.id}`;
      
      const method = isCreating ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...formData,
          pointsCost: Number(formData.pointsCost),
          stock: formData.stock ? Number(formData.stock) : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save reward');
      }

      await fetchRewards();
      setIsDialogOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!confirm('Are you sure you want to delete this reward?')) {
      return;
    }

    try {
      const apiConfig = getApiConfig();
      const response = await fetch(`${apiConfig.baseUrl}/api/admin/rewards/${rewardId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-secret': adminSecret,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete reward');
      }

      await fetchRewards();
    } catch (err: any) {
      setError(err.message);
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

  const togglePartner = (partnerId: string) => {
    setFormData(prev => ({
      ...prev,
      availableFor: prev.availableFor.includes(partnerId)
        ? prev.availableFor.filter(id => id !== partnerId)
        : [...prev.availableFor, partnerId]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Rewards Management</h1>
          <p className="text-muted-foreground">Create and manage rewards for the bonus program</p>
        </div>
        <Button onClick={handleCreateReward}>
          <Plus className="mr-2 h-4 w-4" />
          Create Reward
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalRewards}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.activeRewards}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.categories?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalStock || '∞'}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Rewards Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Rewards</CardTitle>
          <CardDescription>
            Manage your rewards catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reward</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Available For</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rewards.map((reward) => (
                <TableRow key={reward.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{reward.name}</p>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span>{getCategoryIcon(reward.category)}</span>
                      <span className="capitalize">{reward.category}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">{reward.pointsCost}</TableCell>
                  <TableCell>
                    {reward.availableFor.length === 0 ? (
                      <Badge variant="default">All Partners</Badge>
                    ) : (
                      <Badge variant="outline">
                        {reward.availableFor.length} Partner{reward.availableFor.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {reward.stock ? (
                      <span>{reward.stock}</span>
                    ) : (
                      <span className="text-muted-foreground">Unlimited</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={reward.status === 'active' ? 'default' : 'secondary'}>
                      {reward.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditReward(reward)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteReward(reward.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {rewards.length === 0 && (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No rewards created yet</p>
              <Button onClick={handleCreateReward} className="mt-4">
                Create Your First Reward
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-white/20">
          <DialogHeader className="pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {isCreating ? 'Create New Reward' : 'Edit Reward'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {isCreating ? 'Add a new reward to the catalog' : 'Update reward details'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Reward Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 20% Discount Coupon"
                  className="bg-gray-50 border-gray-300 focus:bg-white transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-gray-700">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="bg-gray-50 border-gray-300 focus:bg-white transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="discount">🏷️ Discount</SelectItem>
                    <SelectItem value="freebie">🎁 Freebie</SelectItem>
                    <SelectItem value="experience">🎢 Experience</SelectItem>
                    <SelectItem value="merchandise">🛍️ Merchandise</SelectItem>
                    <SelectItem value="other">⭐ Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this reward offers..."
                rows={3}
                className="bg-gray-50 border-gray-300 focus:bg-white transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pointsCost" className="text-sm font-medium text-gray-700">Points Cost</Label>
                <Input
                  id="pointsCost"
                  type="number"
                  value={formData.pointsCost}
                  onChange={(e) => setFormData({ ...formData, pointsCost: parseInt(e.target.value) || 0 })}
                  placeholder="100"
                  className="bg-gray-50 border-gray-300 focus:bg-white transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock" className="text-sm font-medium text-gray-700">Stock (Optional)</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock || ''}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Leave empty for unlimited"
                  className="bg-gray-50 border-gray-300 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-sm font-medium text-gray-700">Image URL (Optional)</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="bg-gray-50 border-gray-300 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="redemptionInstructions" className="text-sm font-medium text-gray-700">Redemption Instructions</Label>
              <Textarea
                id="redemptionInstructions"
                value={formData.redemptionInstructions}
                onChange={(e) => setFormData({ ...formData, redemptionInstructions: e.target.value })}
                placeholder="How to redeem this reward..."
                rows={2}
                className="bg-gray-50 border-gray-300 focus:bg-white transition-colors resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUntil" className="text-sm font-medium text-gray-700">Valid Until (Optional)</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="bg-gray-50 border-gray-300 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Available For Partners {partners.length > 0 && `(${partners.length} available)`}
              </Label>
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                  <ScrollArea className="h-48 bg-white rounded-md p-2 border border-gray-100">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 pb-2 border-b">
                        <Checkbox
                          id="all-partners"
                          checked={formData.availableFor.length === 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, availableFor: [] });
                            }
                          }}
                        />
                        <Label htmlFor="all-partners" className="font-medium">
                          Available for All Partners
                        </Label>
                      </div>
                      {partners.length === 0 ? (
                        <p className="text-sm text-gray-500 italic py-2">Loading partners...</p>
                      ) : (
                        partners.map((partner) => (
                          <div key={partner.partnerId} className="flex items-center space-x-2">
                            <Checkbox
                              id={partner.partnerId}
                              checked={formData.availableFor.includes(partner.partnerId)}
                              onCheckedChange={() => togglePartner(partner.partnerId)}
                            />
                            <Label htmlFor={partner.partnerId}>
                              {partner.name || partner.partnerId.toUpperCase()}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-100 pt-4 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              className="hover:bg-gray-100 transition-colors"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveReward} 
              disabled={isSaving}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isCreating ? 'Create Reward' : 'Update Reward'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
