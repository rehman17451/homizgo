export type UserRole = "user" | "landlord" | "pgowner"
export type Gender = "male" | "female"

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  gender: Gender
  phone: string
  college: string
  createdAt: string
  avatar?: string
}

export interface Property {
  id: string
  ownerId: string
  ownerName: string
  ownerRole: "landlord" | "pgowner"
  title: string
  propertyFor: Gender
  price: number
  location: string
  mapEmbed: string
  facilities: string[]
  rules: string[]
  livingAlone: boolean
  phm: boolean
  rentDuration: string
  waterFiltration: boolean
  distanceRange: string
  notes: string
  images: string[]
  available: boolean
  createdAt: string
  currentOccupants?: number
  totalCapacity?: number
  roomType?: "private" | "sharing"
  foodIncluded?: boolean
  interestedUsers: string[]
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  receiverId: string
  propertyId?: string
  message: string
  timestamp: string
}

export interface ChatThread {
  id: string
  participants: string[]
  participantNames: string[]
  propertyId?: string
  messages: ChatMessage[]
  lastMessage: string
  lastTimestamp: string
}

// ── Spec-compliant chat types ──────────────────────────────────────────────

export interface Conversation {
  id: string
  studentId: string
  ownerId: string
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  messageText: string
  createdAt: string
}
