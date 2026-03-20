create extension if not exists "pgcrypto";

-- ============================================================
-- STORAGE BUCKET CONFIGURATION (run in Supabase SQL Editor)
-- ============================================================
-- Buckets are created via Supabase Dashboard → Storage → New Bucket
-- OR via the Management API. The SQL below is reference only.
--
-- Bucket: property-images  (public: true,  maxFileSize: 10MB)
-- Bucket: avatars          (public: true,  maxFileSize: 2MB)
--
-- After creating buckets, apply these storage policies in the
-- Supabase Dashboard → Storage → [bucket] → Policies:
--
--   property-images: Allow authenticated users to upload
--   SELECT (public read): true
--   INSERT: auth.role() = 'authenticated'
--   DELETE: auth.uid() = owner (use owner_id metadata or RLS on storage_files)
--
--   avatars: Allow users to manage only their own avatars
--   SELECT (public read): true
--   INSERT: auth.role() = 'authenticated'
--   UPDATE/DELETE: bucket_id = 'avatars' AND storage.foldername(name)[1] = auth.uid()::text
-- ============================================================


create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('user', 'landlord', 'pgowner')),
  gender text not null check (gender in ('male', 'female')),
  phone text not null default '',
  college text not null default '',
  avatar text,
  created_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  owner_name text not null,
  owner_role text not null check (owner_role in ('landlord', 'pgowner')),
  title text not null,
  property_for text not null check (property_for in ('male', 'female')),
  price integer not null,
  location text not null,
  map_embed text not null default '',
  facilities text[] not null default '{}',
  rules text[] not null default '{}',
  living_alone boolean not null default false,
  phm boolean not null default false,
  rent_duration text not null default 'Monthly',
  water_filtration boolean not null default false,
  distance_range text not null default '',
  notes text not null default '',
  images text[] not null default '{}',
  available boolean not null default true,
  current_occupants integer,
  total_capacity integer,
  room_type text check (room_type in ('private', 'sharing')),
  food_included boolean,
  created_at timestamptz not null default now()
);

create table if not exists public.property_interests (
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (property_id, user_id)
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  participants uuid[] not null,
  participant_names text[] not null,
  property_id uuid references public.properties(id) on delete set null,
  last_message text not null default '',
  last_timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  message text not null,
  timestamp timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_interests enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

-- profiles
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
on public.profiles for select using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update using (auth.uid() = id);

-- properties
drop policy if exists "properties_select_all" on public.properties;
create policy "properties_select_all"
on public.properties for select using (true);

drop policy if exists "properties_insert_owner" on public.properties;
create policy "properties_insert_owner"
on public.properties for insert with check (auth.uid() = owner_id);

drop policy if exists "properties_update_owner" on public.properties;
create policy "properties_update_owner"
on public.properties for update using (auth.uid() = owner_id);

drop policy if exists "properties_delete_owner" on public.properties;
create policy "properties_delete_owner"
on public.properties for delete using (auth.uid() = owner_id);

-- property_interests
drop policy if exists "property_interests_select_all" on public.property_interests;
create policy "property_interests_select_all"
on public.property_interests for select using (true);

drop policy if exists "property_interests_insert_self" on public.property_interests;
create policy "property_interests_insert_self"
on public.property_interests for insert with check (auth.uid() = user_id);

drop policy if exists "property_interests_delete_self" on public.property_interests;
create policy "property_interests_delete_self"
on public.property_interests for delete using (auth.uid() = user_id);

-- chat_threads
drop policy if exists "chat_threads_participant_access" on public.chat_threads;
create policy "chat_threads_participant_access"
on public.chat_threads for select using (auth.uid() = any(participants));

drop policy if exists "chat_threads_participant_insert" on public.chat_threads;
create policy "chat_threads_participant_insert"
on public.chat_threads for insert with check (auth.uid() = any(participants));

drop policy if exists "chat_threads_participant_update" on public.chat_threads;
create policy "chat_threads_participant_update"
on public.chat_threads for update using (auth.uid() = any(participants));

-- chat_messages
drop policy if exists "chat_messages_participant_access" on public.chat_messages;
create policy "chat_messages_participant_access"
on public.chat_messages for select using (
  exists (
    select 1 from public.chat_threads t
    where t.id = thread_id and auth.uid() = any(t.participants)
  )
);

drop policy if exists "chat_messages_sender_insert" on public.chat_messages;
create policy "chat_messages_sender_insert"
on public.chat_messages for insert with check (auth.uid() = sender_id);

-- ============================================================
-- FCM TOKENS — stores Firebase Cloud Messaging device tokens
-- ============================================================
create table if not exists public.fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  device_info text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table public.fcm_tokens enable row level security;

drop policy if exists "fcm_tokens_select_own" on public.fcm_tokens;
create policy "fcm_tokens_select_own"
on public.fcm_tokens for select using (auth.uid() = user_id);

drop policy if exists "fcm_tokens_insert_own" on public.fcm_tokens;
create policy "fcm_tokens_insert_own"
on public.fcm_tokens for insert with check (auth.uid() = user_id);

drop policy if exists "fcm_tokens_delete_own" on public.fcm_tokens;
create policy "fcm_tokens_delete_own"
on public.fcm_tokens for delete using (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS — in-app notification history per user
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  data jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "notifications_insert_service" on public.notifications;
create policy "notifications_insert_service"
on public.notifications for insert with check (true);
-- NOTE: actual inserts go through the service-role key (server-side only)

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update using (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
on public.notifications for delete using (auth.uid() = user_id);

-- ============================================================
-- STORAGE FILES — audit log for Supabase Storage uploads
-- ============================================================
create table if not exists public.storage_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bucket text not null,
  path text not null,
  public_url text not null,
  file_size integer,
  mime_type text,
  created_at timestamptz not null default now()
);

alter table public.storage_files enable row level security;

drop policy if exists "storage_files_select_own" on public.storage_files;
create policy "storage_files_select_own"
on public.storage_files for select using (auth.uid() = user_id);

drop policy if exists "storage_files_insert_own" on public.storage_files;
create policy "storage_files_insert_own"
on public.storage_files for insert with check (auth.uid() = user_id);

drop policy if exists "storage_files_delete_own" on public.storage_files;
create policy "storage_files_delete_own"
on public.storage_files for delete using (auth.uid() = user_id);

-- ============================================================
-- CHAT SYSTEM — spec-compliant conversations & messages
-- Role mapping: student = 'user', owner = 'landlord' | 'pgowner'
-- ============================================================

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- prevent duplicate conversations between the same pair
  unique (student_id, owner_id)
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  message_text    text not null,
  created_at      timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

-- conversations: only students can create
drop policy if exists "conversations_student_insert" on public.conversations;
create policy "conversations_student_insert"
on public.conversations for insert
with check (
  auth.uid() = student_id
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'user'
  )
);

-- conversations: both participants can read
drop policy if exists "conversations_participant_select" on public.conversations;
create policy "conversations_participant_select"
on public.conversations for select
using (auth.uid() = student_id or auth.uid() = owner_id);

-- messages: participants can read messages for their conversations
drop policy if exists "messages_participant_select" on public.messages;
create policy "messages_participant_select"
on public.messages for select
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (auth.uid() = c.student_id or auth.uid() = c.owner_id)
  )
);

-- messages: participants can insert messages into their conversations
drop policy if exists "messages_participant_insert" on public.messages;
create policy "messages_participant_insert"
on public.messages for insert
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (auth.uid() = c.student_id or auth.uid() = c.owner_id)
  )
);

-- Enable Supabase Realtime for the messages table
-- Run this in Supabase SQL Editor (requires superuser / service role):
-- alter publication supabase_realtime add table public.messages;
--
-- OR enable via Dashboard → Database → Replication → supabase_realtime → Add table: messages
