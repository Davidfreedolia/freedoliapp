create table public.trial_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  email text not null,
  name text,
  company_name text,

  source text,
  utm_source text,
  utm_campaign text,

  status text not null default 'started',

  workspace_id uuid,
  converted_at timestamptz
);

create index idx_trial_registrations_email
on public.trial_registrations(email);

create index idx_trial_registrations_created_at
on public.trial_registrations(created_at);
