export default async (request: Request, context: any) => {
  const url = new URL(request.url);
  const originalPath = url.pathname;

  // Expect paths like: /i/bucket-name/path/to/image.jpg
  const parts = originalPath.split('/').filter(Boolean);
  if (parts.length < 3 || parts[0] !== 'i') {
    return new Response(JSON.stringify({ error: 'Invalid path. Use /i/<bucket>/<path>' }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }

  const bucket = parts[1];
  const filePath = parts.slice(2).join('/');

  // Generate ETag from path + params for strong caching
  const etagSource = `${bucket}/${filePath}?${url.search}`;
  const etag = `"${await hashString(etagSource)}"`;

  // Check If-None-Match for 304 responses
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        'etag': etag,
        'cache-control': 'public, max-age=31536000, immutable',
        'access-control-allow-origin': '*'
      }
    });
  }

  // Parse optimization parameters
  const width = url.searchParams.get('width') || '200';
  const height = url.searchParams.get('height') || '300';
  const quality = url.searchParams.get('quality') || '45';
  const resize = url.searchParams.get('resize') || 'cover';
  const format = url.searchParams.get('format') || 'webp';

  const supabaseBase = 'https://kydmyxsgyxeubhmqzrgo.supabase.co/storage/v1';

  const transformParams = new URLSearchParams({ width, height, resize, quality, format });
  const targetUrl = `${supabaseBase}/render/image/public/${bucket}/${filePath}?${transformParams.toString()}`;

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'accept': `image/${format}, image/webp, image/*`,
        'user-agent': 'Kotobi-CDN/2.0'
      }
    });

    // Fallback to original if transform fails
    if (!upstream.ok) {
      const fallbackUrl = `${supabaseBase}/object/public/${bucket}/${filePath}`;
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: { 'accept': 'image/*' }
      });

      if (!fallbackResponse.ok) {
        return new Response(JSON.stringify({ error: 'Image not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
        });
      }

      const fallbackHeaders = new Headers();
      fallbackHeaders.set('content-type', fallbackResponse.headers.get('content-type') || 'image/jpeg');
      fallbackHeaders.set('cache-control', 'public, max-age=2592000, stale-while-revalidate=86400');
      fallbackHeaders.set('cdn-cache-control', 'public, max-age=31536000');
      fallbackHeaders.set('etag', etag);
      fallbackHeaders.set('access-control-allow-origin', '*');
      fallbackHeaders.set('x-cdn-status', 'fallback');

      return new Response(fallbackResponse.body, { status: 200, headers: fallbackHeaders });
    }

    // Success — aggressive CDN caching
    const headers = new Headers();
    headers.set('content-type', `image/${format}`);
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    headers.set('cdn-cache-control', 'public, max-age=31536000, immutable');
    headers.set('netlify-cdn-cache-control', 'public, durable, max-age=31536000, immutable');
    headers.set('etag', etag);
    headers.set('access-control-allow-origin', '*');
    headers.set('vary', 'Accept');
    headers.set('x-cdn-status', 'hit');
    headers.set('timing-allow-origin', '*');

    return new Response(upstream.body, { status: 200, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'CDN proxy failure', message: err?.message || 'unknown' }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }
};

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}
