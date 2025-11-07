-- Minimal schema for Workflow Backend (Supabase)
-- Run this in Supabase SQL editor (project > SQL) before using the API

create extension if not exists pgcrypto;

-- Users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password text null,
  name text,
  tenant_name text,
  created_at timestamptz default now()
);

-- Track Supabase Auth user linkage (for password/email updates)
alter table if exists users
  add column if not exists auth_user_id uuid unique;

-- Templates
create table if not exists templates (
  id text primary key,
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Flows
create table if not exists flows (
  id text primary key,
  name text not null,
  status text not null check (status in ('draft','active')),
  created_at timestamptz default now()
);

-- Executions
create table if not exists executions (
  id uuid primary key default gen_random_uuid(),
  flow_id text not null references flows(id) on delete cascade,
  status text not null check (status in ('success','failed')),
  started_at timestamptz not null default now()
);

-- Connections
create table if not exists connections (
  id text primary key,
  provider text not null,
  category text,
  account text,
  status text,
  created_at timestamptz default now()
);

-- Secrets (consider storing values encrypted elsewhere; this is for demo)
create table if not exists secrets (
  name text primary key,
  value text,
  expires_at timestamptz
);

-- Audit
create table if not exists audit (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  at timestamptz not null default now()
);
