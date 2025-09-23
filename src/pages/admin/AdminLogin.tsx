import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = await login({
        email: email.trim().toLowerCase(),
        password,
      });
      if (payload?.user?.role !== "admin") {
        setError("This account is not authorized for admin access.");
        return;
      }
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      const errorInstance = err as Error;
      setError(errorInstance.message || "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100">
      {/* Minimal background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/3 via-transparent to-violet-900/3"></div>
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/[0.02] rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-violet-500/[0.02] rounded-full blur-3xl"></div>

      <Card className="glass-card w-full max-w-sm text-slate-100 shadow-xl hover-lift animate-scale-in rounded-2xl relative z-10 border-white/5">
        <CardHeader className="space-y-6 text-center pb-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
              <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/20 to-violet-600/20 rounded-xl blur opacity-75"></div>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gradient mb-2">
              Admin Login
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Dashboard management
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-slate-300 uppercase tracking-wider"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                autoComplete="email"
                value={email}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setEmail(event.target.value)
                }
                className="glass-card-light h-11 rounded-lg border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500 focus-ring transition-all duration-200 focus:border-blue-400/50 focus:bg-white/[0.05]"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-slate-300 uppercase tracking-wider"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setPassword(event.target.value)
                }
                className="glass-card-light h-11 rounded-lg border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500 focus-ring transition-all duration-200 focus:border-blue-400/50 focus:bg-white/[0.05]"
              />
            </div>
            {error && (
              <div className="glass-card rounded-lg border border-red-400/20 bg-red-500/5 px-3 py-2.5">
                <p className="text-sm text-red-300" role="alert">
                  {error}
                </p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-violet-600 text-white border-0 hover:from-blue-700 hover:to-violet-700 shadow-lg font-medium rounded-lg transition-all duration-200 focus-ring disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="px-6 pb-6 pt-4 justify-center align-middle">
          <div className="glass-card-light rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">
              Use credentials from your platform administrator.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
