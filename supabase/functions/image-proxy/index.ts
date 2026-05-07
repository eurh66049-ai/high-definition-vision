import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

interface ImageTransformParams {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png';
  resize?: 'cover' | 'contain' | 'fill';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // توقع مسار مثل: /image-proxy/bucket-name/path/to/image.jpg
    if (pathSegments.length < 3 || pathSegments[0] !== 'image-proxy') {
      return new Response(JSON.stringify({ error: 'Invalid path format. Expected: /image-proxy/bucket/path' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    const bucketName = pathSegments[1];
    const imagePath = pathSegments.slice(2).join('/');
    
    console.log(`Proxying image: bucket=${bucketName}, path=${imagePath}`);

    // إنشاء Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // الحصول على معاملات التحسين من query parameters
    const params: ImageTransformParams = {
      width: url.searchParams.get('width') ? parseInt(url.searchParams.get('width')!) : undefined,
      height: url.searchParams.get('height') ? parseInt(url.searchParams.get('height')!) : undefined,
      quality: url.searchParams.get('quality') ? parseInt(url.searchParams.get('quality')!) : 80,
      format: (url.searchParams.get('format') as any) || 'webp',
      resize: (url.searchParams.get('resize') as any) || 'cover'
    };

    // جلب الصورة من Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(imagePath);

    if (error) {
      console.error('Error downloading image:', error);
      return new Response(JSON.stringify({ error: 'Image not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    if (!data) {
      return new Response(JSON.stringify({ error: 'No image data' }), {
        status: 404,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    // تحديد نوع المحتوى بناءً على امتداد الملف
    const getContentType = (path: string, format?: string) => {
      if (format === 'webp') return 'image/webp';
      if (format === 'jpg' || format === 'jpeg') return 'image/jpeg';
      if (format === 'png') return 'image/png';
      
      const ext = path.toLowerCase().split('.').pop();
      switch (ext) {
        case 'jpg':
        case 'jpeg':
          return 'image/jpeg';
        case 'png':
          return 'image/png';
        case 'webp':
          return 'image/webp';
        case 'gif':
          return 'image/gif';
        case 'svg':
          return 'image/svg+xml';
        default:
          return 'image/jpeg';
      }
    };

    const contentType = getContentType(imagePath, params.format);
    
    // إرجاع الصورة مع headers التحسين
    const responseHeaders = {
      ...corsHeaders,
      'content-type': contentType,
      'cache-control': 'public, max-age=31536000, immutable', // تخزين مؤقت لسنة
      'vary': 'Accept-Encoding',
      'x-image-proxy': 'kotobi-cdn',
      'x-bucket': bucketName,
      'x-path': imagePath
    };

    // إضافة headers للتحسين إذا كانت متوفرة
    if (params.width) responseHeaders['x-width'] = params.width.toString();
    if (params.height) responseHeaders['x-height'] = params.height.toString();
    if (params.quality) responseHeaders['x-quality'] = params.quality.toString();

    return new Response(data, {
      status: 200,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }
});