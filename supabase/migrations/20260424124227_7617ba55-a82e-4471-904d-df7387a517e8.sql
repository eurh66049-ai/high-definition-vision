create table if not exists public.tts_key_rotation_state (
  rotation_name text primary key,
  current_index integer not null default 0,
  updated_at timestamp with time zone not null default now()
);

alter table public.tts_key_rotation_state enable row level security;

create policy "No direct access to tts rotation state"
on public.tts_key_rotation_state
for all
using (false)
with check (false);

insert into public.tts_key_rotation_state (rotation_name, current_index)
values ('elevenlabs', 0)
on conflict (rotation_name) do nothing;