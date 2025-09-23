import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertCircle } from 'lucide-react';

interface AdminAuthProps {
  children: React.ReactNode;
}

export function AdminAuth({ children }: AdminAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminSecret, setAdminSecret] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if admin secret is already stored
    const storedSecret = localStorage.getItem('adminSecret');
    if (storedSecret) {
      verifyAdminSecret(storedSecret);
    }
  }, []);

  const verifyAdminSecret = async (secret: string) => {
    setIsLoading(true);
    setError('');

    try {
      // Test the secret with a simple API call
      const response = await fetch('https://zabava-server.vercel.app/api/admin/overview', {
        headers: {
          'x-admin-secret': secret
        }
      });

      if (response.ok) {
        localStorage.setItem('adminSecret', secret);
        setIsAuthenticated(true);
      } else {
        setError('Invalid admin secret');
        localStorage.removeItem('adminSecret');
      }
    } catch (err) {
      setError('Failed to verify admin secret');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminSecret) {
      verifyAdminSecret(adminSecret);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminSecret');
    setIsAuthenticated(false);
    setAdminSecret('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Admin Authentication
            </CardTitle>
            <CardDescription>
              Enter the admin secret to access the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter admin secret"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || !adminSecret}>
                {isLoading ? 'Verifying...' : 'Access Admin Panel'}
              </Button>

              <div className="text-sm text-gray-500 text-center">
                Admin secret: zabava
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {children}
      <Button
        onClick={handleLogout}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50"
      >
        Logout Admin
      </Button>
    </>
  );
}