-- FarmaReach schema for Supabase Postgres
-- Run in Supabase: SQL Editor -> New query -> Execute

create table if not exists public.leads (
  id bigserial primary key,
  owner_id varchar(64) default '' not null,
  nombre varchar(255) not null,
  direccion varchar(500) default '' not null,
  zona varchar(255) default '' not null,
  codigo_postal varchar(32) default '' not null,
  telefono varchar(64) default '' not null,
  website varchar(500) default '' not null,
  email varchar(255) default '' not null,
  fuente varchar(64) not null,
  estado_envio varchar(32) default 'pendiente' not null,
  notas text default '' not null,
  created_at timestamptz default now() not null
);

create table if not exists public.email_logs (
  id bigserial primary key,
  lead_id bigint not null references public.leads(id) on delete cascade,
  destinatario varchar(255) not null,
  asunto varchar(255) not null,
  cuerpo text not null,
  estado varchar(32) not null,
  detalle text default '' not null,
  created_at timestamptz default now() not null
);

alter table public.leads
  add column if not exists owner_id varchar(64) default '' not null;

create index if not exists idx_leads_estado_envio on public.leads (estado_envio);
create index if not exists idx_leads_fuente on public.leads (fuente);
create index if not exists idx_leads_email on public.leads (email);
create index if not exists idx_leads_owner_id on public.leads (owner_id);
create index if not exists idx_email_logs_lead_id on public.email_logs (lead_id);
