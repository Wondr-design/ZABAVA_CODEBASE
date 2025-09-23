import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
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

interface DemoAccount {
  email?: string;
  password?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated && user?.role === "partner") {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    login({ email: trimmedEmail, password: trimmedPassword })
      .then((payload) => {
        if (payload?.user?.role !== "partner") {
          setError("Use the admin login to access the console.");
          return;
        }
        navigate("/dashboard", { replace: true });
      })
      .catch((err: Error) => {
        setError(err.message || "Invalid credentials");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const demoAccount = useMemo<DemoAccount | null>(() => {
    try {
      return import.meta.env.VITE_DEMO_ACCOUNT
        ? JSON.parse(import.meta.env.VITE_DEMO_ACCOUNT)
        : null;
    } catch (err) {
      console.warn("Failed to parse VITE_DEMO_ACCOUNT", err);
      return null;
    }
  }, []);

  const showDemoBanner = Boolean(demoAccount?.email && demoAccount?.password);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 text-slate-100">
      {/* Minimal background effects */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-900/3 via-transparent to-violet-900/3"></div>
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-96 w-96 -translate-x-1/2 bg-blue-500/[0.02] rounded-full blur-3xl"></div>
      <div className="pointer-events-none absolute bottom-1/3 left-1/2 h-96 w-96 -translate-x-1/2 bg-violet-500/[0.02] rounded-full blur-3xl"></div>

      <Card className="glass-card w-full max-w-sm text-slate-100 shadow-xl hover-lift animate-scale-in rounded-2xl relative z-10 border-white/5">
        <CardHeader className="space-y-6 text-center pb-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
              <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-xl blur opacity-75"></div>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gradient mb-2">
              Partner Login
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Access your dashboard
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
                placeholder="partner@example.com"
                autoComplete="email"
                value={email}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setEmail(event.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                className="glass-card-light h-11 rounded-lg border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500 focus-ring transition-all duration-200 focus:border-emerald-400/50 focus:bg-white/[0.05]"
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
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setPassword(event.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                className="glass-card-light h-11 rounded-lg border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500 focus-ring transition-all duration-200 focus:border-emerald-400/50 focus:bg-white/[0.05]"
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
              className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 hover:from-emerald-600 hover:to-teal-600 shadow-lg font-medium rounded-lg transition-all duration-200 focus-ring disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="px-6 pb-6 pt-4 align-middle justify-center">
          {showDemoBanner ? (
            <div className="glass-card-light rounded-lg p-3 text-center">
              <p className="text-xs text-slate-300 mb-1">Demo credentials:</p>
              <p className="text-xs font-mono text-slate-400">
                {demoAccount?.email} / {demoAccount?.password}
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-xs text-muted-foreground">
                Need help? Contact your administrator.
              </p>
              <div className="flex flex-col space-y-2">
                <Link
                  to="/signup"
                  className="glass-card-light hover-lift inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-emerald-300 hover:text-emerald-200 transition-all duration-200"
                >
                  Have an invite? Create account →
                </Link>
                <Link
                  to="/admin/login"
                  className="text-xs text-muted-foreground hover:text-slate-300 transition-colors duration-200"
                >
                  Admin login
                </Link>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
