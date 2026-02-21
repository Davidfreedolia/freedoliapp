-- PAS: Mostres (requests) a partir de supplier_quotes

create table if not exists supplier_sample_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  is_demo boolean not null default false,

  project_id uuid not null references projects(id) on delete cascade,
  quote_id uuid not null references supplier_quotes(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete restrict,

  status text not null default 'PENDING'
    check (status in ('PENDING','REQUESTED','RECEIVED','REJECTED','CANCELLED')),

  requested_at timestamptz null,
  notes text null,

  created_at timestamptz not null default now()
);

-- 1 quote -> 1 sample request (idempotent)
create unique index if not exists supplier_sample_requests_unique_quote
  on supplier_sample_requests (quote_id);

create index if not exists supplier_sample_requests_project_idx
  on supplier_sample_requests (project_id);

create index if not exists supplier_sample_requests_supplier_idx
  on supplier_sample_requests (supplier_id);
