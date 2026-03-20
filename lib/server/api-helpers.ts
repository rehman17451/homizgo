import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Property, UserProfile, ChatMessage, ChatThread, Conversation, Message } from "@/lib/data-types"

export async function requireCurrentUser() {
  const supabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,name,role,gender,phone,college,avatar,created_at")
    .eq("id", authData.user.id)
    .single()

  if (!profile) return null

  const user: UserProfile = {
    id: profile.id,
    name: profile.name,
    email: authData.user.email || "",
    role: profile.role,
    gender: profile.gender,
    phone: profile.phone,
    college: profile.college,
    avatar: profile.avatar || undefined,
    createdAt: profile.created_at,
  }

  return { supabase, user }
}

export async function loadProperties(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const [{ data: rows, error }, { data: interests }] = await Promise.all([
    supabase.from("properties").select("*").order("created_at", { ascending: false }),
    supabase.from("property_interests").select("property_id,user_id"),
  ])

  if (error) throw error

  const interestMap = new Map<string, string[]>()
  for (const row of interests || []) {
    const existing = interestMap.get(row.property_id) || []
    existing.push(row.user_id)
    interestMap.set(row.property_id, existing)
  }

  return (rows || []).map((row) => mapProperty(row, interestMap.get(row.id) || []))
}

export function mapProperty(row: any, interestedUsers: string[]): Property {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerRole: row.owner_role,
    title: row.title,
    propertyFor: row.property_for,
    price: row.price,
    location: row.location,
    mapEmbed: row.map_embed || "",
    facilities: row.facilities || [],
    rules: row.rules || [],
    livingAlone: !!row.living_alone,
    phm: !!row.phm,
    rentDuration: row.rent_duration,
    waterFiltration: !!row.water_filtration,
    distanceRange: row.distance_range || "",
    notes: row.notes || "",
    images: row.images || [],
    available: !!row.available,
    createdAt: row.created_at,
    currentOccupants: row.current_occupants ?? undefined,
    totalCapacity: row.total_capacity ?? undefined,
    roomType: row.room_type ?? undefined,
    foodIncluded: row.food_included ?? undefined,
    interestedUsers,
  }
}

export function mapThread(row: any): ChatThread {
  return {
    id: row.id,
    participants: row.participants || [],
    participantNames: row.participant_names || [],
    propertyId: row.property_id || undefined,
    messages: (row.chat_messages || []).map(mapMessage),
    lastMessage: row.last_message || "",
    lastTimestamp: row.last_timestamp,
  }
}

export function mapMessage(row: any): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    receiverId: row.receiver_id,
    propertyId: row.property_id || undefined,
    message: row.message,
    timestamp: row.timestamp,
  }
}

export function mapConversation(row: any): Conversation {
  return {
    id: row.id,
    studentId: row.student_id,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  }
}

export function mapMessage2(row: any): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    messageText: row.message_text,
    createdAt: row.created_at,
  }
}
