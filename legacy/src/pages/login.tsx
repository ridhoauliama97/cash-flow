import { useState } from "react"
import { Wallet } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { getSupabaseClient } from "@/lib/store"

export function LoginPage({ onDemo, onAuthed }: { onDemo: () => void; onAuthed: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [busy, setBusy] = useState(false)

  const client = getSupabaseClient()

  const submit = async () => {
    if (!client) return
    setBusy(true)
    try {
      if (mode === "signin") {
        const { error } = await client.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        })
        if (error) throw error
        toast.success("Account created — check your inbox to confirm your email.")
        return
      }
      onAuthed()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-5" />
          </div>
          <CardTitle className="text-xl">Cash Flow Dashboard</CardTitle>
          <CardDescription>
            {client
              ? mode === "signin"
                ? "Sign in to your workspace"
                : "Create your account"
              : "Welcome — no account required for the demo"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {client ? (
            <>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  void submit()
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy || !email || !password}>
                  {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
              <Button variant="ghost" className="w-full text-xs" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
                {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </Button>
              <Separator />
              <p className="text-center text-xs text-muted-foreground">
                Supabase is configured — sign in with your credentials.
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This demo runs fully in your browser with sample financial data. Add Supabase credentials in{" "}
                <code className="rounded bg-muted px-1">.env</code> to enable cloud storage and authentication.
              </p>
              <Button className="w-full" onClick={onDemo}>
                Continue with demo data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
