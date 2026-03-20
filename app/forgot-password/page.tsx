"use client"

import { useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
      } else {
        setSent(true)
      }
    } catch {
      setError("Network error. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-3xl border bg-card p-8 shadow-xl shadow-primary/5">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
            <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-accent/5 blur-2xl" />

            <div className="relative mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                {sent ? (
                  <CheckCircle2 className="h-7 w-7 text-primary-foreground" />
                ) : (
                  <Building2 className="h-7 w-7 text-primary-foreground" />
                )}
              </div>
              <h1 className="font-heading text-2xl font-bold text-card-foreground">
                {sent ? "Email sent!" : "Forgot password?"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {sent
                  ? `We've sent a password reset link to ${email}`
                  : "Enter your email and we'll send you a reset link"}
              </p>
            </div>

            {!sent ? (
              <>
                {error && (
                  <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="relative space-y-5">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email address
                    </Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="rounded-xl pl-9"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full rounded-xl h-11 shadow-lg shadow-primary/20"
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </>
            ) : (
              <div className="relative space-y-4">
                <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-4 text-center text-sm text-muted-foreground">
                  Didn't receive it? Check your spam folder or try a different email.
                </div>
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => { setSent(false); setEmail("") }}
                >
                  Try a different email
                </Button>
              </div>
            )}

            <Link
              href="/login"
              className="relative mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
