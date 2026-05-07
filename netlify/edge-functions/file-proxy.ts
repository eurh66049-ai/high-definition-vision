export default async (request: Request, context: any) => {
  const url = new URL(request.url);
  const originalPath = url.pathname;

  // Expect paths like: /f/bucket-name/path/to/file.pdf
  const parts = originalPath.split('/').filter(Boolean);
  if (parts.length < 3 || parts[0] !== 'f') {
    return new Response(JSON.stringify({ error: 'Invalid path. Use /f/<bucket>/<path>' }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }

  const bucket = parts[1];
  const filePath = parts.slice(2).join('/');

  // Generate ETag
  const etagSource = `${bucket}/${filePath}`;
  const etag = `"file-${await hashString(etagSource)}"`;

  // 304 Not Modified
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

  const supabaseBase = 'https://kydmyxsgyxeubhmqzrgo.supabase.co/storage/v1/object/public';
  const targetUrl = `${supabaseBase}/${bucket}/${filePath}${url.search}`;

  try {
    const upstream = await fetch(targetUrl, {
      headers: { 'accept': request.headers.get('accept') || '*/*' }
    });

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: upstream.status,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
      });
    }

    const headers = new Headers(upstream.headers);
    const contentType = headers.get('content-type') || 'application/octet-stream';
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    headers.set('cdn-cache-control', 'public, max-age=31536000, immutable');
    headers.set('netlify-cdn-cache-control', 'public, durable, max-age=31536000, immutable');
    headers.set('etag', etag);
    headers.set('access-control-allow-origin', '*');
    headers.set('x-cdn-status', 'hit');

    // Allow range requests for PDF streaming
    if (upstream.headers.get('accept-ranges')) {
      headers.set('accept-ranges', 'bytes');
    }

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
