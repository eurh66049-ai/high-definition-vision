alter table public.messages
add column if not exists message_type text not null default 'text',
add column if not exists audio_url text,
add column if not exists audio_mime_type text,
add column if not exists audio_duration_ms integer,
add column if not exists transcript text;

create index if not exists idx_messages_conversation_created_at on public.messages (conversation_id, created_at);
create index if not exists idx_messages_type on public.messages (message_type);