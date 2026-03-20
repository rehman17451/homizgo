"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Building2, Loader2 } from "lucide-react"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient()
      const code = searchParams.get("code")

      if (!code) {
        setErrorMessage("No authentication code found. Please try again.")
        setStatus("error")
        return
      }

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error || !data.user) {
          setErrorMessage(error?.message || "Authentication failed. Please try again.")
          setStatus("error")
          return
        }

        // Check if a profile exists for this user; if not, create one (first Google sign-in)
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", data.user.id)
          .single()

        if (!profile) {
          // Create default profile for Google sign-in users
          const fullName =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            data.user.email?.split("@")[0] ||
            "User"

          await supabase.from("profiles").upsert({
            id: data.user.id,
            name: fullName,
            role: "user",
            gender: "male",
            phone: "",
            college: "",
          })

          router.push("/dashboard/user")
        } else {
          // Existing user — redirect based on role
          if (profile.role === "landlord") router.push("/dashboard/landlord")
          else if (profile.role === "pgowner") router.push("/dashboard/pgowner")
          else router.push("/dashboard/user")
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Something went wrong. Please try again.")
        setStatus("error")
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
          <Building2 className="h-8 w-8 text-primary-foreground" />
        </div>

        {status === "loading" ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Signing you in...</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-destructive">Authentication Failed</h1>
            <p className="text-sm text-muted-foreground max-w-sm">{errorMessage}</p>
            <a
              href="/login"
              className="inline-block mt-4 text-sm font-semibold text-primary hover:underline"
            >
              Back to Login
            </a>
          </>
        )}
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
