-- Pile On The Salt community setup
-- Run this in the Supabase SQL editor after creating your project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$')
);

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'Reported by community member',
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);

insert into public.chat_rooms (slug, name, description) values
  ('general', 'General', 'General conversation and encouragement.'),
  ('newly-diagnosed', 'Newly Diagnosed', 'Questions and support for people new to POTS.'),
  ('parents-caregivers', 'Parents & Caregivers', 'Support for caregivers and family members.'),
  ('college-school', 'College / School', 'Classes, accommodations, dorms, and school life.'),
  ('flares-bad-days', 'Flares & Bad Days', 'A gentle place for hard symptom days.'),
  ('food-salt-tips', 'Food / Salt Tips', 'Food, fluids, electrolytes, and salt strategies.'),
  ('eds-hypermobility', 'EDS / Hypermobility', 'Overlap chat for EDS and hypermobility.'),
  ('local-groups', 'Local Groups', 'Find and organize local support.')
on conflict (slug) do update set name = excluded.name, description = excluded.description;

alter table public.profiles enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.message_reports enable row level security;

create or replace function public.is_verified_member()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'email_confirmed')::boolean, false);
$$;

create policy "Verified users can read profiles"
  on public.profiles for select
  using (public.is_verified_member());

create policy "Users can create their own profile after verification"
  on public.profiles for insert
  with check (public.is_verified_member() and auth.uid() = id);

create policy "Users can set their username once"
  on public.profiles for update
  using (public.is_verified_member() and auth.uid() = id and username is null)
  with check (public.is_verified_member() and auth.uid() = id and username is not null);

create policy "Verified users can read chat rooms"
  on public.chat_rooms for select
  using (public.is_verified_member());

create policy "Verified users can read messages"
  on public.chat_messages for select
  using (public.is_verified_member());

create policy "Verified users can insert messages"
  on public.chat_messages for insert
  with check (public.is_verified_member() and auth.uid() = user_id);

create policy "Users can delete their own messages"
  on public.chat_messages for delete
  using (public.is_verified_member() and auth.uid() = user_id);

create policy "Verified users can report messages"
  on public.message_reports for insert
  with check (public.is_verified_member() and auth.uid() = reporter_id);

create policy "Users can read their own reports"
  on public.message_reports for select
  using (public.is_verified_member() and auth.uid() = reporter_id);

-- Admin deletion scaffold:
-- Add an admin role claim or admins table later, then create a DELETE policy on chat_messages
-- that allows those admins to remove abusive content across the community.
