import { NextResponse } from "next/server"
import { loadProperties, requireCurrentUser } from "@/lib/server/api-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const properties = await loadProperties(supabase)
    return NextResponse.json({ properties })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load properties" }, { status: 400 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireCurrentUser()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "landlord" && session.user.role !== "pgowner") {
      return NextResponse.json({ error: "Only owners can add properties" }, { status: 403 })
    }

    const body = await request.json()
    const payload = {
      owner_id: session.user.id,
      owner_name: session.user.name,
      owner_role: session.user.role,
      title: body.title,
      property_for: body.propertyFor,
      price: Number(body.price || 0),
      location: body.location || "",
      map_embed: body.mapEmbed || "",
      facilities: body.facilities || [],
      rules: body.rules || [],
      living_alone: !!body.livingAlone,
      phm: !!body.phm,
      rent_duration: body.rentDuration || "Monthly",
      water_filtration: !!body.waterFiltration,
      distance_range: body.distanceRange || "",
      notes: body.notes || "",
      images: body.images || [],
      available: body.available ?? true,
      current_occupants: body.currentOccupants ?? null,
      total_capacity: body.totalCapacity ?? null,
      room_type: body.roomType ?? null,
      food_included: body.foodIncluded ?? null,
    }

    const { data, error } = await session.supabase.from("properties").insert(payload).select("*").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ propertyId: data.id })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
