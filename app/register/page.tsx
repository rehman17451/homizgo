"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { registerUser, type UserRole, type Gender } from "@/lib/store"
import { createClient } from "@/lib/supabase/client"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Building2,
  Eye,
  EyeOff,
  UserPlus,
  User,
  Home,
  Building,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from "lucide-react"

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<UserRole>("user")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState("")
  const [college, setCollege] = useState("")
  const [gender, setGender] = useState<Gender>("male")
  const [googleFormAck, setGoogleFormAck] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()

  const roles = [
    { value: "user" as UserRole, label: "Student", icon: User, desc: "Looking for housing near campus", color: "bg-primary/10 text-primary border-primary/20" },
    { value: "landlord" as UserRole, label: "Landlord", icon: Home, desc: "List your rental property", color: "bg-accent/10 text-accent border-accent/20" },
    { value: "pgowner" as UserRole, label: "PG Owner", icon: Building, desc: "List your PG accommodation", color: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if ((role === "landlord" || role === "pgowner") && !googleFormAck) {
      setError("Please acknowledge the Google Form before proceeding.")
      return
    }
    setLoading(true)
    try {
      const user = await registerUser({ name, email, password, role, gender, phone, college })
      if (user.role === "landlord") router.push("/dashboard/landlord")
      else if (user.role === "pgowner") router.push("/dashboard/pgowner")
      else router.push("/dashboard/user")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError("")
    setGoogleLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
        setGoogleLoading(false)
      }
      // On success, browser is redirected to Google
    } catch (err: any) {
      setError(err.message || "Google sign-up failed")
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="relative overflow-hidden rounded-3xl border bg-card p-8 shadow-xl shadow-primary/5">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-accent/5 blur-3xl" />

            <div className="relative mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                <Sparkles className="h-7 w-7 text-primary-foreground" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-card-foreground">Create your account</h1>
              <p className="mt-1 text-sm text-muted-foreground">Join Homigo and find your perfect stay</p>
            </div>

            {/* Step indicators */}
            <div className="relative mb-8 flex items-center justify-center gap-3">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                    step >= s ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-muted-foreground"
                  }`}>
                    {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                  </div>
                  {s < 2 && <div className={`h-0.5 w-12 rounded-full transition-colors ${step > 1 ? "bg-primary" : "bg-border"}`} />}
                </div>
              ))}
            </div>

            {error && (
              <div className="relative mb-4 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="relative space-y-5">
                <p className="text-center text-sm font-medium text-card-foreground">Choose your role</p>
                <div className="grid gap-3">
                  {roles.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRole(r.value)}
                      className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                        role === r.value
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-transparent bg-secondary/50 hover:border-border hover:bg-secondary"
                      }`}
                    >
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
                        role === r.value ? "bg-primary text-primary-foreground shadow-sm" : r.color
                      }`}>
                        <r.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-heading font-semibold text-card-foreground">{r.label}</div>
                        <div className="text-sm text-muted-foreground">{r.desc}</div>
                      </div>
                      {role === r.value && (
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                <div>
                  <Label className="text-sm font-medium">Gender</Label>
                  <div className="mt-1.5 flex gap-2">
                    <Button type="button" variant={gender === "male" ? "default" : "outline"} className="flex-1 rounded-xl" onClick={() => setGender("male")}>Male</Button>
                    <Button type="button" variant={gender === "female" ? "default" : "outline"} className="flex-1 rounded-xl" onClick={() => setGender("female")}>Female</Button>
                  </div>
                </div>

                <Button className="w-full rounded-xl h-11 shadow-lg shadow-primary/20" onClick={() => setStep(2)}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="relative space-y-4">
                {/* Google Sign-Up Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl h-11 gap-2.5 font-medium hover:bg-secondary/80 transition-colors"
                  onClick={handleGoogleSignUp}
                  disabled={googleLoading || loading}
                >
                  <GoogleIcon />
                  {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
                </Button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground font-medium">or fill in details</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your full name" className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label htmlFor="reg-email" className="text-sm font-medium">Email</Label>
                    <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label htmlFor="reg-password" className="text-sm font-medium">Password</Label>
                    <div className="relative mt-1.5">
                      <Input id="reg-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Create a password" minLength={6} className="rounded-xl pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="9876543210" className="mt-1.5 rounded-xl" />
                  </div>
                  {role === "user" && (
                    <div>
                      <Label htmlFor="college" className="text-sm font-medium">College / University</Label>
                      <Input id="college" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="Your college name" className="mt-1.5 rounded-xl" />
                    </div>
                  )}
                  {(role === "landlord" || role === "pgowner") && (
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                      <p className="text-sm font-semibold text-card-foreground">Verification Required</p>
                      <p className="mt-1 text-xs text-muted-foreground">Please fill out our form to complete verification.</p>
                      <a href="https://forms.google.com" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                        Open Verification Form <ExternalLink className="h-3 w-3" />
                      </a>
                      <label className="mt-3 flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={googleFormAck} onChange={(e) => setGoogleFormAck(e.target.checked)} className="rounded accent-primary" />
                        <span className="text-xs text-muted-foreground">I have filled the verification form</span>
                      </label>
                    </div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-1.5 h-4 w-4" />
                      Back
                    </Button>
                    <Button type="submit" className="flex-1 rounded-xl h-11 shadow-lg shadow-primary/20" disabled={loading || googleLoading}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      {loading ? "Creating..." : "Create Account"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            <p className="relative mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
