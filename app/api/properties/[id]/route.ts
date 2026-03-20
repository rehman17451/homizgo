import { NextResponse } from "next/server"
import { requireCurrentUser } from "@/lib/server/api-helpers"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCurrentUser()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.propertyFor !== undefined) updates.property_for = body.propertyFor
    if (body.price !== undefined) updates.price = Number(body.price || 0)
    if (body.location !== undefined) updates.location = body.location
    if (body.mapEmbed !== undefined) updates.map_embed = body.mapEmbed
    if (body.facilities !== undefined) updates.facilities = body.facilities
    if (body.rules !== undefined) updates.rules = body.rules
    if (body.livingAlone !== undefined) updates.living_alone = !!body.livingAlone
    if (body.phm !== undefined) updates.phm = !!body.phm
    if (body.rentDuration !== undefined) updates.rent_duration = body.rentDuration
    if (body.waterFiltration !== undefined) updates.water_filtration = !!body.waterFiltration
    if (body.distanceRange !== undefined) updates.distance_range = body.distanceRange
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.images !== undefined) updates.images = body.images
    if (body.available !== undefined) updates.available = !!body.available
    if (body.currentOccupants !== undefined) updates.current_occupants = body.currentOccupants
    if (body.totalCapacity !== undefined) updates.total_capacity = body.totalCapacity
    if (body.roomType !== undefined) updates.room_type = body.roomType
    if (body.foodIncluded !== undefined) updates.food_included = body.foodIncluded

    const { error } = await session.supabase
      .from("properties")
      .update(updates)
      .eq("id", id)
      .eq("owner_id", session.user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCurrentUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { error } = await session.supabase.from("properties").delete().eq("id", id).eq("owner_id", session.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
