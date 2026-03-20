"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Message } from "@/lib/data-types"

type RealtimePayload = {
  new: {
    id: string
    conversation_id: string
    sender_id: string
    message_text: string
    created_at: string
  }
}

/**
 * useRealtimeChat
 *
 * Subscribes to Supabase Realtime postgres_changes on the `messages` table
 * filtered to a specific conversation. New messages are appended to local
 * state as they arrive — no page refresh needed.
 *
 * @param conversationId  The conversation to subscribe to (pass null to skip)
 * @param initialMessages Seed messages, typically from an initial HTTP fetch
 */
export function useRealtimeChat(
  conversationId: string | null,
  initialMessages: Message[] = []
): Message[] {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  // Keep messages in sync when conversationId or initialMessages change
  const initialRef = useRef(initialMessages)

  useEffect(() => {
    initialRef.current = initialMessages
    setMessages(initialMessages)
  }, [conversationId]) // reset when conversation changes

  useEffect(() => {
    if (!conversationId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePayload) => {
          const row = payload.new
          const incoming: Message = {
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            messageText: row.message_text,
            createdAt: row.created_at,
          }
          setMessages((prev) => {
            // Prevent duplicates (e.g. if the sender's optimistic update is already there)
            if (prev.some((m) => m.id === incoming.id)) return prev
            return [...prev, incoming]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  return messages
}
