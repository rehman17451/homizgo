import { NextResponse } from "next/server"
import { requireCurrentUser } from "@/lib/server/api-helpers"

export async function GET() {
  const session = await requireCurrentUser()
  if (!session) return NextResponse.json({ user: null }, { status: 200 })
  return NextResponse.json({ user: session.user })
}
