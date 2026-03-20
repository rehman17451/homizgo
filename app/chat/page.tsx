"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { getCurrentUser, type User } from "@/lib/store"
import { createClient } from "@/lib/supabase/client"
import type { Conversation, Message } from "@/lib/data-types"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MessageSquare, Send, ArrowLeft, Clock, Sparkles, Users,
  MoreVertical, Trash2, Eraser, AlertTriangle,
} from "lucide-react"
import { format } from "date-fns"

// ── Local types ──────────────────────────────────────────────────────────────

interface ConversationWithNames extends Conversation {
  otherName: string
}

type ModalType = "clear" | "delete" | null

// ── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data as T
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null)
  const [conversations, setConversations] = useState<ConversationWithNames[]>([])
  const [activeConversation, setActiveConversation] = useState<ConversationWithNames | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [inputText, setInputText] = useState("")
  const [sending, setSending] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)

  // ── Context menu / modal state ────────────────────────────────────────────
  const [showMenu, setShowMenu] = useState(false)
  const [confirmModal, setConfirmModal] = useState<ModalType>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const threadsScrollerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // ── Load current user ─────────────────────────────────────────────────────
  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        if (!u) { router.push("/login"); return }
        setUser(u)
      })
      .catch(() => router.push("/login"))
  }, [router])

  // ── Fetch conversations + resolve other-user names ────────────────────────
  const loadConversations = useCallback(async (currentUserId: string) => {
    try {
      const { conversations: raw } = await apiFetch<{ conversations: Conversation[] }>(
        "/api/chat/conversations"
      )
      const { users } = await apiFetch<{ users: { id: string; name: string }[] }>("/api/users")
      const nameMap = new Map(users.map((u) => [u.id, u.name]))
      const withNames: ConversationWithNames[] = raw.map((c) => ({
        ...c,
        otherName:
          c.studentId === currentUserId
            ? (nameMap.get(c.ownerId) ?? "Unknown")
            : (nameMap.get(c.studentId) ?? "Unknown"),
      }))
      setConversations(withNames)
    } catch (err) {
      console.error("loadConversations:", err)
    }
  }, [])

  useEffect(() => {
    if (user) loadConversations(user.id)
  }, [user, loadConversations])

  // ── Load messages ─────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true)
    try {
      const { messages: msgs } = await apiFetch<{ messages: Message[] }>(
        `/api/chat/messages/${conversationId}`
      )
      setMessages(msgs)
    } catch (err) {
      console.error("loadMessages:", err)
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  const selectConversation = (c: ConversationWithNames) => {
    setActiveConversation(c)
    setShowSidebar(false)
    setShowMenu(false)
    loadMessages(c.id)
  }

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!activeConversation) return
    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${activeConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        (payload: { new: Record<string, any> }) => {
          const row = payload.new
          const incoming: Message = {
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            messageText: row.message_text,
            createdAt: row.created_at,
          }
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          )
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeConversation?.id])

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── GSAP ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-scroll-reveal]").forEach((el, i) => {
        gsap.fromTo(el, { autoAlpha: 0, y: 20 }, {
          autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out",
          delay: Math.min(i * 0.04, 0.2),
          scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play reverse play reverse" },
        })
      })
      if (threadsScrollerRef.current) {
        gsap.utils.toArray<HTMLElement>("[data-thread-item]").forEach((el, i) => {
          gsap.fromTo(el, { autoAlpha: 0, x: -16 }, {
            autoAlpha: 1, x: 0, duration: 0.4, ease: "power2.out",
            delay: Math.min(i * 0.025, 0.18),
            scrollTrigger: { trigger: el, scroller: threadsScrollerRef.current!, start: "top 96%", toggleActions: "play reverse play reverse" },
          })
        })
      }
      requestAnimationFrame(() => ScrollTrigger.refresh())
    }, pageRef)
    return () => ctx.revert()
  }, [conversations.length, activeConversation?.id, messages.length, showSidebar])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !activeConversation || !user || sending) return
    setSending(true)
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      conversationId: activeConversation.id,
      senderId: user.id,
      messageText: inputText.trim(),
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    const text = inputText.trim()
    setInputText("")
    try {
      const { message: saved } = await apiFetch<{ message: Message }>("/api/chat/send-message", {
        method: "POST",
        body: JSON.stringify({ conversationId: activeConversation.id, messageText: text }),
      })
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)))
    } catch (err) {
      console.error("send-message:", err)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setInputText(text)
    } finally {
      setSending(false)
    }
  }

  // ── Clear chat ────────────────────────────────────────────────────────────
  const handleClearChat = async () => {
    if (!activeConversation) return
    setActionLoading(true)
    try {
      await apiFetch("/api/chat/messages/clear", {
        method: "DELETE",
        body: JSON.stringify({ conversationId: activeConversation.id }),
      })
      setMessages([])
      setConfirmModal(null)
    } catch (err: any) {
      alert(err.message || "Failed to clear chat")
    } finally {
      setActionLoading(false)
    }
  }

  // ── Delete conversation ───────────────────────────────────────────────────
  const handleDeleteConversation = async () => {
    if (!activeConversation || !user) return
    setActionLoading(true)
    try {
      await apiFetch(`/api/chat/conversations/${activeConversation.id}`, { method: "DELETE" })
      setConversations((prev) => prev.filter((c) => c.id !== activeConversation.id))
      setActiveConversation(null)
      setMessages([])
      setShowSidebar(true)
      setConfirmModal(null)
    } catch (err: any) {
      alert(err.message || "Failed to delete conversation")
    } finally {
      setActionLoading(false)
    }
  }

  if (!user) return null

  return (
    <div ref={pageRef} className="flex flex-col" style={{ height: "100dvh" }}>
      <Navbar />
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className={`${showSidebar ? "flex" : "hidden md:flex"} w-full flex-col border-r bg-card md:w-80 lg:w-96`}>
          <div className="border-b p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold text-card-foreground">Messages</h2>
                <p className="text-xs text-muted-foreground">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>

          <div ref={threadsScrollerRef} className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                  <Users className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="mt-4 text-sm font-semibold text-card-foreground">No conversations yet</p>
                {user.role === "user" ? (
                  <p className="mt-1 text-xs text-muted-foreground">Click <strong>Chat</strong> on a property listing to start one.</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Students will start conversations with you from property listings.</p>
                )}
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = activeConversation?.id === conv.id
                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    data-thread-item
                    className={`flex w-full items-start gap-3 border-b p-4 text-left transition-all hover:bg-secondary/50 ${
                      isActive ? "bg-primary/5 border-l-[3px] border-l-primary" : "border-l-[3px] border-l-transparent"
                    }`}
                  >
                    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl font-heading text-sm font-bold ${
                      isActive ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary/10 text-primary"
                    }`}>
                      {conv.otherName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-card-foreground truncate">{conv.otherName}</span>
                        <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                          {format(new Date(conv.createdAt), "MMM d")}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {conv.studentId === user.id ? "You started this chat" : "Incoming chat"}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* ── Chat area ── */}
        <div className={`${showSidebar ? "hidden md:flex" : "flex"} min-h-0 flex-1 flex-col bg-background`}>
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b bg-card p-4">
                <button onClick={() => setShowSidebar(true)} className="md:hidden rounded-xl p-1 hover:bg-secondary" aria-label="Back">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-heading font-bold shadow-sm">
                  {activeConversation.otherName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-card-foreground">{activeConversation.otherName}</p>
                  <p className="text-[10px] text-muted-foreground">Direct conversation</p>
                </div>

                {/* Live badge */}
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-[10px] text-muted-foreground">Live</span>
                </div>

                {/* ⋮ More menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu((v) => !v)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-secondary transition-colors"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-10 z-30 w-48 overflow-hidden rounded-xl border bg-card shadow-xl shadow-black/10">
                      <button
                        onClick={() => { setShowMenu(false); setConfirmModal("clear") }}
                        className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
                      >
                        <Eraser className="h-4 w-4 text-muted-foreground" />
                        Clear Chat
                      </button>
                      <div className="h-px bg-border" />
                      <button
                        onClick={() => { setShowMenu(false); setConfirmModal("delete") }}
                        className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                        <Sparkles className="h-7 w-7 text-muted-foreground/30" />
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">No messages yet. Say hello!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isOwn = msg.senderId === user.id
                      const isOptimistic = msg.id.startsWith("opt-")
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-3 transition-opacity ${isOptimistic ? "opacity-60" : "opacity-100"} ${
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-lg shadow-sm shadow-primary/10"
                              : "bg-card border text-card-foreground rounded-bl-lg"
                          }`}>
                            <p className="text-sm leading-relaxed">{msg.messageText}</p>
                            <p className={`mt-1 flex items-center gap-1 text-[10px] ${isOwn ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                              <Clock className="h-2.5 w-2.5" />
                              {format(new Date(msg.createdAt), "HH:mm")}
                              {isOptimistic && <span className="ml-1">Sending…</span>}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t bg-card p-4">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl"
                    autoFocus
                    disabled={sending}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-10 w-10 rounded-xl shadow-sm shadow-primary/20"
                    disabled={!inputText.trim() || sending}
                  >
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send message</span>
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/20" />
                </div>
                <h3 className="mt-5 font-heading text-xl font-semibold text-foreground">Select a conversation</h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  {user.role === "user"
                    ? "Choose a conversation or start one from a property listing."
                    : "Choose a conversation from the sidebar."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmation Modals ── */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => { if (!actionLoading) setConfirmModal(null) }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
                confirmModal === "delete" ? "bg-destructive/10" : "bg-amber-500/10"
              }`}>
                <AlertTriangle className={`h-5 w-5 ${confirmModal === "delete" ? "text-destructive" : "text-amber-500"}`} />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-card-foreground">
                  {confirmModal === "clear" ? "Clear Chat?" : "Delete Conversation?"}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {confirmModal === "clear"
                    ? "All messages will be permanently deleted. The conversation thread will remain."
                    : "This will permanently delete the entire conversation and all messages. This cannot be undone."}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setConfirmModal(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="rounded-xl"
                disabled={actionLoading}
                onClick={confirmModal === "clear" ? handleClearChat : handleDeleteConversation}
              >
                {actionLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {confirmModal === "clear" ? "Clearing..." : "Deleting..."}
                  </span>
                ) : confirmModal === "clear" ? "Clear Messages" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
