import type { ChatMessage, ChatThread, Gender, Property, UserProfile, UserRole } from "@/lib/data-types"

export type { ChatMessage, ChatThread, Gender, Property, UserRole }
export type User = UserProfile

type RegisterInput = {
  name: string
  email: string
  password: string
  role: UserRole
  gender: Gender
  phone: string
  college?: string
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })

  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const errorMessage =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string" &&
      data.error.trim().length > 0
        ? data.error
        : `Request failed (${res.status})`

    throw new Error(errorMessage)
  }
  return data as T
}

export async function registerUser(user: RegisterInput): Promise<User> {
  await api<{ ok: boolean }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(user),
  })

  await loginUser(user.email, user.password)
  const current = await getCurrentUser()
  if (!current) throw new Error("Account created, but login failed")
  return current
}

export async function loginUser(email: string, password: string): Promise<User> {
  await api<{ ok: boolean }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  const current = await getCurrentUser()
  if (!current) throw new Error("Unable to load account")
  return current
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const data = await api<{ user: User | null }>("/api/auth/me")
    return data.user
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (message.includes("(404)")) {
      return null
    }
    throw error
  }
}

export async function setCurrentUser(user: User | null): Promise<void> {
  if (!user) {
    await api<{ ok: boolean }>("/api/auth/logout", { method: "POST" })
  }
}

export async function getUsers(): Promise<User[]> {
  const data = await api<{ users: User[] }>("/api/users")
  return data.users
}

export async function getProperties(): Promise<Property[]> {
  const data = await api<{ properties: Property[] }>("/api/properties")
  return data.properties
}

export async function addProperty(property: Partial<Property>): Promise<void> {
  await api<{ propertyId: string }>("/api/properties", {
    method: "POST",
    body: JSON.stringify(property),
  })
}

export async function updateProperty(id: string, updates: Partial<Property>): Promise<void> {
  await api<{ ok: boolean }>(`/api/properties/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  })
}

export async function deleteProperty(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/api/properties/${id}`, { method: "DELETE" })
}

export async function toggleInterest(propertyId: string, _userId: string): Promise<boolean> {
  const data = await api<{ interested: boolean }>(`/api/properties/${propertyId}/interest`, {
    method: "POST",
  })
  return data.interested
}

export async function getChatThreads(): Promise<ChatThread[]> {
  const data = await api<{ threads: ChatThread[] }>("/api/chats")
  return data.threads
}

export async function getOrCreateThread(
  userId: string,
  userName: string,
  otherUserId: string,
  otherUserName: string,
  propertyId?: string
): Promise<ChatThread> {
  const data = await api<{ threadId: string }>("/api/chats/thread", {
    method: "POST",
    body: JSON.stringify({ otherUserId, otherUserName, propertyId }),
  })
  const threads = await getChatThreads()
  const thread = threads.find((t) => t.id === data.threadId)
  if (thread) return thread

  // Avoid crashing when the thread creation is successful but list refresh lags briefly.
  return {
    id: data.threadId,
    participants: [userId, otherUserId],
    participantNames: [userName, otherUserName],
    propertyId,
    messages: [],
    lastMessage: "",
    lastTimestamp: new Date().toISOString(),
  }
}

export async function sendMessage(
  threadId: string,
  _senderId: string,
  _senderName: string,
  receiverId: string,
  message: string,
  propertyId?: string
): Promise<ChatMessage> {
  const data = await api<{ message: any }>("/api/chats/messages", {
    method: "POST",
    body: JSON.stringify({ threadId, receiverId, message, propertyId }),
  })
  return {
    id: data.message.id,
    senderId: data.message.sender_id,
    senderName: data.message.sender_name,
    receiverId: data.message.receiver_id,
    propertyId: data.message.property_id || undefined,
    message: data.message.message,
    timestamp: data.message.timestamp,
  }
}

export async function getUserThreads(_userId: string): Promise<ChatThread[]> {
  return getChatThreads()
}

export function seedDataIfNeeded() {
  // Local seed is removed after Supabase migration.
}
