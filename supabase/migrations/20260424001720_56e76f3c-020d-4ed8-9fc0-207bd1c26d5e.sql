insert into storage.buckets (id, name, public)
values ('voice-messages', 'voice-messages', true)
on conflict (id) do nothing;

create policy "Public can read voice messages"
on storage.objects for select
using (bucket_id = 'voice-messages');

create policy "Users can upload their own voice messages"
on storage.objects for insert
to authenticated
with check (bucket_id = 'voice-messages' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own voice messages"
on storage.objects for update
to authenticated
using (bucket_id = 'voice-messages' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own voice messages"
on storage.objects for delete
to authenticated
using (bucket_id = 'voice-messages' and auth.uid()::text = (storage.foldername(name))[1]);