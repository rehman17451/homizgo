# Homizgo — Backend Setup Guide

> **Stack**: Next.js API Routes (serverless) · Supabase (Auth + DB + Storage) · Firebase (FCM + Analytics)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Supabase Setup](#2-supabase-setup)
3. [Firebase Setup](#3-firebase-setup)
4. [Environment Variables](#4-environment-variables)
5. [API Reference](#5-api-reference)
6. [Example fetch() Calls for React](#6-example-fetch-calls-for-react)
7. [Firebase Analytics Usage](#7-firebase-analytics-usage)
8. [Push Notifications — Full Flow](#8-push-notifications--full-flow)

---

## 1. Architecture Overview

```
React Frontend (Next.js)
        │
        ├─► Supabase JS Client  ─────► Supabase Cloud
        │   (auth, realtime,            ┌──────────────────┐
        │    direct DB queries)         │ PostgreSQL DB    │
        │                               │ Auth (email +    │
        ├─► Next.js API Routes          │  OAuth)          │
        │   /api/**  (server-side)      │ Storage Buckets  │
        │                               │ Row Level        │
        └─► Firebase JS SDK             │ Security (RLS)   │
            (Analytics, FCM)            └──────────────────┘
                    │
                    └─► Firebase Cloud
                         ┌────────────────────────┐
                         │ Cloud Messaging (FCM)  │
                         │ Analytics / DebugView  │
                         └────────────────────────┘
```

---

## 2. Supabase Setup

### 2.1 Create a Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Note your **Project URL** and **anon key** from **Settings → API**
3. Also copy the **service_role key** (keep this secret — server only)

### 2.2 Run the Schema

Open **SQL Editor** in the Supabase Dashboard and paste the contents of `supabase/schema.sql`.  
This creates:

| Table | Purpose |
|---|---|
| `profiles` | User profiles linked to `auth.users` |
| `properties` | Property listings |
| `property_interests` | Users interested in a property |
| `chat_threads` | Messaging threads |
| `chat_messages` | Individual messages |
| `fcm_tokens` | Firebase push notification tokens |
| `notifications` | In-app notification history |
| `storage_files` | Audit log for file uploads |

All tables have **Row Level Security (RLS) enabled**.

### 2.3 Create Storage Buckets

Go to **Storage → New Bucket** and create:

| Bucket Name | Public | Max File Size |
|---|---|---|
| `property-images` | ✅ Yes | 10 MB |
| `avatars` | ✅ Yes | 2 MB |

Then in each bucket → **Policies**, add:

**`property-images` INSERT policy** (allow authenticated uploads):
```sql
(auth.role() = 'authenticated')
```

**`avatars` (user-scoped) — INSERT/UPDATE/DELETE**:
```sql
(bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
```

Both buckets: **SELECT** → allow all (`true`)

### 2.4 Enable OAuth Providers (optional)

Go to **Authentication → Providers** and enable Google / GitHub etc.  
Add the redirect URL: `https://your-domain.com/auth/callback` (or `http://localhost:3000/auth/callback` for local dev).

---

## 3. Firebase Setup

### 3.1 Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → follow the wizard
3. Enable **Google Analytics** when prompted (required for Analytics)

### 3.2 Register a Web App

1. **Project Settings → Your apps → Add app → Web (`</>`)** 
2. Copy the `firebaseConfig` object — you'll map each field to an env var (see §4)

### 3.3 Enable Cloud Messaging

1. **Project Settings → Cloud Messaging**
2. Scroll down to **Web Push certificates** → **Generate key pair**
3. Copy the **Key pair** value → this becomes `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

### 3.4 Service Account (for Admin SDK)

1. **Project Settings → Service Accounts → Generate new private key**
2. Download the JSON file
3. Copy the **entire JSON content** into `FIREBASE_SERVICE_ACCOUNT_JSON`  
   ⚠️ Escape it as a single-line string or use a `.env` multi-line literal

### 3.5 Create a Firebase Service Worker

Create `public/firebase-messaging-sw.js` (required for background notifications):

```js
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js")

firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY,            // injected at build time or hardcoded
  authDomain: self.FIREBASE_AUTH_DOMAIN,
  projectId: self.FIREBASE_PROJECT_ID,
  storageBucket: self.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
  appId: self.FIREBASE_APP_ID,
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification
  self.registration.showNotification(title, { body, icon: "/icon-192.png" })
})
```

> **Note**: Service workers cannot access `process.env`, so either hardcode the config values or use a build-time template substitution approach.

---

## 4. Environment Variables

Copy `.env.example` → `.env.local` and fill in your real values.

| Variable | Scope | Where to find |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Supabase → Settings → API → service_role |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_IMAGES` | Client + Server | `property-images` (or your bucket name) |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_AVATARS` | Client + Server | `avatars` (or your bucket name) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client | Firebase → Project Settings → Config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client | Firebase → Project Settings → Config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client | Firebase → Project Settings → Config |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Client | Firebase → Project Settings → Config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Client | Firebase → Project Settings → Config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Client | Firebase → Project Settings → Config |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Client | Firebase → Project Settings → Config |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Client | Firebase → Cloud Messaging → Web Push cert |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **Server only** | Firebase → Service Accounts → JSON |
| `NOTIFY_SECRET` | **Server only** | Generate: `openssl rand -base64 32` |

---

## 5. API Reference

All routes are under `/api`. Authenticated routes require a valid Supabase session cookie (set automatically by the browser after login).

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | ❌ Public | Register with email/password + profile fields |
| `POST` | `/api/auth/login` | ❌ Public | Sign in with email/password |
| `GET` | `/api/auth/me` | ✅ Required | Get current user profile |
| `POST` | `/api/auth/logout` | ✅ Required | Sign out (clears session cookie) |

### Profile

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/profile` | ✅ Required | Get current user profile |
| `PATCH` | `/api/profile` | ✅ Required | Update profile (name, phone, college, avatar) |

### Properties

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/properties` | ✅ Required | List all properties with interests |
| `POST` | `/api/properties` | ✅ Owner | Create a property listing |
| `PATCH` | `/api/properties/:id` | ✅ Owner | Update own property |
| `DELETE` | `/api/properties/:id` | ✅ Owner | Delete own property |
| `POST` | `/api/properties/:id/interest` | ✅ Required | Toggle interest (adds or removes) |

### Chats

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/chats` | ✅ Required | Get all threads for current user |
| `POST` | `/api/chats/thread` | ✅ Required | Create or get existing thread |
| `POST` | `/api/chats/messages` | ✅ Required | Send a message |

### Storage

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/storage/upload` | ✅ Required | Upload file (multipart/form-data) |

### Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/notifications/fcm-token` | ✅ Required | Register/refresh FCM token |
| `DELETE` | `/api/notifications/fcm-token` | ✅ Required | Remove FCM token on logout |
| `POST` | `/api/notifications/send` | 🔑 Secret header | Send push notification to a user |
| `GET` | `/api/notifications/send` | Bearer token | Get current user's notification history |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users` | ✅ Required | List all user profiles |

---

## 6. Example fetch() Calls for React

### Sign Up

```typescript
const res = await fetch("/api/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Alice",
    email: "alice@example.com",
    password: "securePassword123",
    role: "user",           // "user" | "landlord" | "pgowner"
    gender: "female",       // "male" | "female"
    phone: "9876543210",
    college: "IIT Delhi",
  }),
})
const data = await res.json() // { ok: true } or { error: string }
```

### Log In

```typescript
const res = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "alice@example.com", password: "securePassword123" }),
})
const data = await res.json() // { ok: true }
```

### Get Current User

```typescript
const res = await fetch("/api/auth/me")
const { user } = await res.json()
// user: { id, name, email, role, gender, phone, college, avatar, createdAt }
```

### Log Out

```typescript
await fetch("/api/auth/logout", { method: "POST" })
```

### Update Profile

```typescript
await fetch("/api/profile", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone: "9999999999", college: "IIT Bombay" }),
})
```

### List Properties

```typescript
const res = await fetch("/api/properties")
const { properties } = await res.json()
```

### Create Property (landlord/pgowner only)

```typescript
const res = await fetch("/api/properties", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Spacious 2BHK near Campus",
    propertyFor: "female",
    price: 8000,
    location: "Hauz Khas, New Delhi",
    facilities: ["WiFi", "AC", "Hot Water"],
    rules: ["No Smoking", "No Pets"],
    rentDuration: "Monthly",
    available: true,
  }),
})
const { propertyId } = await res.json()
```

### Toggle Property Interest

```typescript
const res = await fetch(`/api/properties/${propertyId}/interest`, { method: "POST" })
const { interested } = await res.json() // true if just added, false if just removed
```

### Upload File

```typescript
const formData = new FormData()
formData.append("file", fileBlob)
formData.append("bucket", "property-images") // or "avatars"

const res = await fetch("/api/storage/upload", { method: "POST", body: formData })
const { url, path, bucket } = await res.json()
// url: "https://your-project.supabase.co/storage/v1/object/public/property-images/..."
```

### Register FCM Token (call after requestNotificationPermission())

```typescript
import { requestNotificationPermission } from "@/lib/firebase/client"

const token = await requestNotificationPermission()
if (token) {
  await fetch("/api/notifications/fcm-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, deviceInfo: navigator.userAgent }),
  })
}
```

### Remove FCM Token on Logout

```typescript
await fetch("/api/notifications/fcm-token", {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token: storedFcmToken }),
})
```

### Send Push Notification (server-to-server call)

```typescript
// Call this from another Next.js server action / cron / event handler — NOT from the browser
const res = await fetch(`${BASE_URL}/api/notifications/send`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-notify-secret": process.env.NOTIFY_SECRET!,
  },
  body: JSON.stringify({
    userId: "target-user-uuid",
    title: "Someone is interested in your property!",
    body: "Check your dashboard for details.",
    data: { propertyId: "property-uuid", link: "/dashboard" },
    saveToDb: true,
  }),
})
const { ok, sent } = await res.json() // sent = number of tokens reached
```

### Get Notification History

```typescript
// Requires the Supabase access token (from supabase.auth.getSession())
const { data: { session } } = await supabase.auth.getSession()
const res = await fetch("/api/notifications/send?limit=20&offset=0", {
  headers: { Authorization: `Bearer ${session?.access_token}` },
})
const { notifications } = await res.json()
```

### Start a Chat Thread

```typescript
const res = await fetch("/api/chats/thread", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    otherUserId: "landlord-uuid",
    otherUserName: "Bob the Landlord",
    propertyId: "property-uuid", // optional
  }),
})
const { threadId } = await res.json()
```

### Send a Chat Message

```typescript
await fetch("/api/chats/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    threadId: "thread-uuid",
    receiverId: "other-user-uuid",
    message: "Hi, is the property still available?",
    propertyId: "property-uuid", // optional
  }),
})
```

---

## 7. Firebase Analytics Usage

```typescript
// In any Client Component
"use client"
import { getFirebaseAnalytics } from "@/lib/firebase/client"
import { logEvent } from "firebase/analytics"

// Track a page view
const analytics = await getFirebaseAnalytics()
if (analytics) {
  logEvent(analytics, "page_view", { page_title: "Property Details" })
}

// Track a custom event
if (analytics) {
  logEvent(analytics, "property_interest_toggled", {
    property_id: "uuid",
    action: "add",
  })
}
```

Verify events in **Firebase Console → Analytics → DebugView** within ~30 seconds.

---

## 8. Push Notifications — Full Flow

```
1. User opens the app
       │
       ▼
2. Request notification permission
   requestNotificationPermission() → returns FCM token string
       │
       ▼
3. Save FCM token to backend
   POST /api/notifications/fcm-token  { token }
       │
       ▼
4. [Server event triggers notification]
   e.g., another user shows interest in a property
       │
       ▼
5. Backend calls POST /api/notifications/send
   with x-notify-secret header + { userId, title, body }
       │
       ▼
6. Firebase Admin SDK sends FCM push to all user tokens
       │
       ▼
7. User receives notification
   ├─ App in foreground → onForegroundMessage() fires → show toast
   └─ App in background → firebase-messaging-sw.js handles → OS notification
```

### Code: Listen for Foreground Messages

```typescript
"use client"
import { useEffect } from "react"
import { onForegroundMessage } from "@/lib/firebase/client"
import { toast } from "sonner"

export function NotificationListener() {
  useEffect(() => {
    const unsub = onForegroundMessage((payload) => {
      toast(payload.notification?.title ?? "New notification", {
        description: payload.notification?.body,
      })
    })
    return () => unsub?.()
  }, [])

  return null
}
```

Add `<NotificationListener />` to your root layout.

---

## 9. Database Schema Summary

```
auth.users (managed by Supabase)
    │
    └─1:1─► profiles (name, role, gender, phone, college, avatar)
                │
                ├──► properties (owner_id → profiles)
                │         │
                │         └──► property_interests (user_id, property_id)
                │
                ├──► chat_threads (participants: uuid[])
                │         │
                │         └──► chat_messages (sender_id, receiver_id, thread_id)
                │
                ├──► fcm_tokens (user_id, token, device_info)
                │
                ├──► notifications (user_id, title, body, data, read)
                │
                └──► storage_files (user_id, bucket, path, public_url)
```
