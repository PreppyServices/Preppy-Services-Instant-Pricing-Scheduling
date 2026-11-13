-- Jobber refresh tokens and booking idempotency.
-- Apply only when SCHEDULER_WRITES_ENABLED is turned on. Do not run this
-- against production as part of the preview.

create table if not exists public.jobber_tokens (
  app text primary key,
  refresh_token text not null,
  access_token text,
  expires_at timestamptz
);

create table if not exists public.booking_idempotency (
  key text primary key,
  response jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.jobber_tokens enable row level security;
alter table public.booking_idempotency enable row level security;

-- Row lock for the refresh. The access token request happens before this
-- call; the compare on the previous refresh token keeps two rotations from
-- overwriting each other.
create or replace function public.jobber_save_token(
  p_app text,
  p_expected_refresh text,
  p_refresh text,
  p_access text,
  p_expires timestamptz
) returns public.jobber_tokens
language plpgsql
as $$
declare
  row public.jobber_tokens;
begin
  select * into row from public.jobber_tokens where app = p_app for update;
  if row.app is null then
    raise exception 'jobber token missing';
  end if;
  if row.refresh_token is distinct from p_expected_refresh then
    return row;
  end if;
  update public.jobber_tokens
    set refresh_token = p_refresh,
        access_token = p_access,
        expires_at = p_expires
    where app = p_app
    returning * into row;
  return row;
end;
$$;
