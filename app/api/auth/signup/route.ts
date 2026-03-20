import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, role, gender, phone, college } = body

    if (!name || !email || !password || !role || !gender || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || "Signup failed" }, { status: 400 })
    }
    const { error: profileError } = await admin.from("profiles").upsert({
      id: data.user.id,
      name,
      role,
      gender,
      phone,
      college: college || "",
    })
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
