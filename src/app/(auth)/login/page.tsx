"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const REMEMBER_KEY = "cashflow-login-remember";
const REMEMBER_MS = 10 * 60 * 1000;

interface RememberedCredentials {
  email: string;
  password: string;
  savedAt: number;
}

function loadRemembered(): RememberedCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as RememberedCredentials;
    if (!saved.email || !saved.password || typeof saved.savedAt !== "number") {
      return null;
    }
    if (Date.now() - saved.savedAt > REMEMBER_MS) {
      window.localStorage.removeItem(REMEMBER_KEY);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

function saveRemembered(credentials: RememberedCredentials) {
  try {
    window.localStorage.setItem(REMEMBER_KEY, JSON.stringify(credentials));
  } catch {
    // private mode / storage penuh — abaikan
  }
}

function clearRemembered() {
  try {
    window.localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // abaikan
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [remembered] = useState(loadRemembered);
  const [email, setEmail] = useState(() => remembered?.email ?? "");
  const [password, setPassword] = useState(() => remembered?.password ?? "");
  const [remember, setRemember] = useState(() => remembered !== null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (remember) {
        saveRemembered({ email, password, savedAt: Date.now() });
      } else {
        clearRemembered();
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-5" />
          </div>
          <CardTitle className="text-xl">Cash Flow Dashboard</CardTitle>
          <CardDescription>
            Masuk ke akun Anda untuk mengakses sistem.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={showPassword ? "off" : "current-password"}
                  placeholder="••••••••"
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                  title={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={remember} onCheckedChange={setRemember} />
              Ingat Saya
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading || !email || !password}>
              {loading ? "Please wait…" : "Sign in"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </main>
  );
}
