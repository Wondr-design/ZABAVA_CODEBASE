import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup, isAuthenticated } = useAuth();

  const presetEmail = useMemo(
    () => searchParams.get("email") || "",
    [searchParams]
  );
  const presetToken = useMemo(
    () => searchParams.get("token") || "",
    [searchParams]
  );
  const presetName = useMemo(
    () => searchParams.get("name") || "",
    [searchParams]
  );

  const [email, setEmail] = useState<string>(presetEmail);
  const [name, setName] = useState<string>(presetName);
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [token, setToken] = useState<string>(presetToken);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedToken = token.trim();
    const trimmedPassword = password.trim();

    if (!trimmedToken) {
      setError("Invite token is required.");
      return;
    }
    if (!trimmedEmail || !trimmedPassword) {
      setError("Email and password are required.");
      return;
    }
    if (trimmedPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (trimmedPassword !== confirmPassword.trim()) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({
        email: trimmedEmail,
        password: trimmedPassword,
        token: trimmedToken,
        name: name.trim(),
      });
      navigate("/dashboard", { replace: true });
    } catch (unknownError) {
      const err = unknownError as Error;
      setError(err.message || "Unable to complete signup.");
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

      <Card className="glass-card w-full max-w-md text-slate-100 shadow-xl hover-lift animate-scale-in rounded-2xl relative z-10 border-white/5">
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
              Partner Signup
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Create your account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="token"
                className="text-xs font-medium text-slate-300 uppercase tracking-wider"
              >
                Invite token
              </Label>
              <Input
                id="token"
                type="text"
                placeholder="Paste your invite token here"
                value={token}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setToken(event.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                autoComplete="off"
                className="glass-card-light h-11 rounded-lg border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500 focus-ring transition-all duration-200 focus:border-emerald-400/50 focus:bg-white/[0.05]"
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-medium text-slate-300 uppercase tracking-wider"
                >
                  Work email
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
                  htmlFor="name"
                  className="text-xs font-medium text-slate-300 uppercase tracking-wider"
                >
                  Full name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  autoComplete="name"
                  value={name}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setName(event.target.value);
                  }}
                  className="glass-card-light h-11 rounded-lg border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500 focus-ring transition-all duration-200 focus:border-emerald-400/50 focus:bg-white/[0.05]"
                />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
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
                  autoComplete="new-password"
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

              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-xs font-medium text-slate-300 uppercase tracking-wider"
                >
                  Confirm
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setConfirmPassword(event.target.value);
                    if (error) {
                      setError("");
                    }
                  }}
                  className="glass-card-light h-11 rounded-lg border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500 focus-ring transition-all duration-200 focus:border-emerald-400/50 focus:bg-white/[0.05]"
                />
              </div>
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
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="px-6 pb-6 pt-4">
          <div className="text-center">
            <Link
              to="/login"
              className="glass-card-light hover-lift inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-emerald-300 hover:text-emerald-200 transition-all duration-200"
            >
              Already have access? Sign in →
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
