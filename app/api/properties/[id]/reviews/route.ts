import { NextResponse } from "next/server"
import { requireCurrentUser } from "@/lib/server/api-helpers"

/**
 * GET /api/properties/[id]/reviews
 * Returns all reviews for a property. Public — no auth required.
 *
 * POST /api/properties/[id]/reviews
 * Authenticated users (role: user) submit or update their review.
 * Body: { rating: number (1-5), comment: string }
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await requireCurrentUser()

  // Use anon-level access since reviews are public; but we need a supabase client.
  // requireCurrentUser may return null for unauthenticated users — handle both paths.
  const { createServerSupabaseClient } = await import("@/lib/supabase/server")
  const supabase = session?.supabase ?? (await createServerSupabaseClient())

  const { data, error } = await supabase
    .from("property_reviews")
    .select("id, property_id, user_id, rating, comment, created_at, profiles(name)")
    .eq("property_id", id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const reviews = (data ?? []).map((r: any) => ({
    id: r.id,
    propertyId: r.property_id,
    userId: r.user_id,
    userName: r.profiles?.name ?? "Anonymous",
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  }))

  return NextResponse.json({ reviews })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params
  const session = await requireCurrentUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (session.user.role !== "user") {
    return NextResponse.json(
      { error: "Only student accounts can leave reviews" },
      { status: 403 }
    )
  }

  let rating: number, comment: string
  try {
    const body = await request.json()
    rating = Number(body.rating)
    comment = String(body.comment ?? "").trim()
    if (!rating || rating < 1 || rating > 5) throw new Error("rating must be 1-5")
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Invalid body" }, { status: 400 })
  }

  // Upsert — one review per user per property
  const { data, error } = await session.supabase
    .from("property_reviews")
    .upsert(
      { property_id: propertyId, user_id: session.user.id, rating, comment },
      { onConflict: "property_id,user_id" }
    )
    .select("id, property_id, user_id, rating, comment, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    review: {
      id: data.id,
      propertyId: data.property_id,
      userId: data.user_id,
      userName: session.user.name,
      rating: data.rating,
      comment: data.comment,
      createdAt: data.created_at,
    },
  })
}
