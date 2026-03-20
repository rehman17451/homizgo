import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,role,gender,phone,college,avatar,created_at")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const users = (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    email: "",
    role: row.role,
    gender: row.gender,
    phone: row.phone,
    college: row.college,
    avatar: row.avatar || undefined,
    createdAt: row.created_at,
  }))

  return NextResponse.json({ users })
}
