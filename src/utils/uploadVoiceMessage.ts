import { supabase } from '@/integrations/supabase/client';

/**
 * يرفع رسالة صوتية إلى bucket "voice-messages" تحت مسار /{userId}/{timestamp}.{ext}
 * ويعيد URL العام للملف.
 */
export async function uploadVoiceMessage(
  blob: Blob,
  userId: string,
): Promise<{ url: string; mimeType: string }> {
  const mime = blob.type || 'audio/webm';
  const ext = mime.includes('mp4') ? 'm4a'
    : mime.includes('ogg') ? 'ogg'
    : mime.includes('mpeg') ? 'mp3'
    : 'webm';
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from('voice-messages')
    .upload(fileName, blob, {
      contentType: mime,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('voice-messages').getPublicUrl(fileName);
  return { url: data.publicUrl, mimeType: mime };
}