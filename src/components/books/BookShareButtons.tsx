import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, Copy, Check, Sparkles, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { QRCodeComponent } from '@/components/ui/qr-code';
import { motion } from 'framer-motion';

interface BookShareButtonsProps {
  book: {
    title: string;
    author: string;
    slug?: string;
    id: string;
    cover_image_url?: string;
    category?: string;
  };
}

const BookShareButtons: React.FC<BookShareButtonsProps> = ({ book }) => {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingStory, setGeneratingStory] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const getBookIdentifier = () => {
    const rawIdentifier = book.slug || book.id;
    try {
      return decodeURIComponent(rawIdentifier);
    } catch {
      return rawIdentifier;
    }
  };

  // URL for direct app navigation
  const getBookUrl = () => {
    const baseUrl = 'https://kotobi.xyz';
    return `${baseUrl}/book/${getBookIdentifier()}`;
  };

  // URL for social sharing
  const getShareUrl = () => {
    const baseUrl = 'https://kotobi.xyz';
    return `${baseUrl}/book/${getBookIdentifier()}`;
  };

  const handleWhatsAppShare = () => {
    const url = getShareUrl();
    const shareText = `📚 *${book.title}*\n✍️ ${book.author}\n\n${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleFacebookShare = () => {
    const url = getShareUrl();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank');
  };

  const handleTwitterShare = () => {
    const url = getShareUrl();
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleTelegramShare = () => {
    const url = getShareUrl();
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(book.title)}`;
    window.open(telegramUrl, '_blank');
  };

  const generateStoryImage = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      // Instagram Story dimensions (1080x1920)
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas not supported');

      // Background gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 1080, 1920);
      bgGradient.addColorStop(0, '#1a1a2e');
      bgGradient.addColorStop(0.5, '#16213e');
      bgGradient.addColorStop(1, '#0f3460');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, 1080, 1920);

      // Decorative circles
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#e94560';
      ctx.beginPath();
      ctx.arc(900, 200, 300, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#533483';
      ctx.beginPath();
      ctx.arc(180, 1700, 250, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      const drawContent = (coverImg?: HTMLImageElement) => {
        // Book cover with shadow
        const coverWidth = 500;
        const coverHeight = 720;
        const coverX = (1080 - coverWidth) / 2;
        const coverY = 280;

        // Cover shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 15;

        // Rounded rectangle for cover
        const radius = 20;
        ctx.beginPath();
        ctx.moveTo(coverX + radius, coverY);
        ctx.lineTo(coverX + coverWidth - radius, coverY);
        ctx.quadraticCurveTo(coverX + coverWidth, coverY, coverX + coverWidth, coverY + radius);
        ctx.lineTo(coverX + coverWidth, coverY + coverHeight - radius);
        ctx.quadraticCurveTo(coverX + coverWidth, coverY + coverHeight, coverX + coverWidth - radius, coverY + coverHeight);
        ctx.lineTo(coverX + radius, coverY + coverHeight);
        ctx.quadraticCurveTo(coverX, coverY + coverHeight, coverX, coverY + coverHeight - radius);
        ctx.lineTo(coverX, coverY + radius);
        ctx.quadraticCurveTo(coverX, coverY, coverX + radius, coverY);
        ctx.closePath();

        if (coverImg) {
          ctx.save();
          ctx.clip();
          ctx.drawImage(coverImg, coverX, coverY, coverWidth, coverHeight);
          ctx.restore();
        } else {
          // Placeholder cover
          const placeholderGradient = ctx.createLinearGradient(coverX, coverY, coverX + coverWidth, coverY + coverHeight);
          placeholderGradient.addColorStop(0, '#533483');
          placeholderGradient.addColorStop(1, '#e94560');
          ctx.fillStyle = placeholderGradient;
          ctx.fill();
          
          // Book icon placeholder
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.font = '120px serif';
          ctx.textAlign = 'center';
          ctx.fillText('📖', coverX + coverWidth / 2, coverY + coverHeight / 2 + 40);
        }

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Title
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 52px Cairo, Tajawal, Arial';
        ctx.direction = 'rtl';
        
        const titleY = coverY + coverHeight + 100;
        const maxWidth = 900;
        const titleLines = wrapText(ctx, book.title, maxWidth);
        titleLines.forEach((line, i) => {
          ctx.fillText(line, 540, titleY + i * 65);
        });

        // Author
        const authorY = titleY + titleLines.length * 65 + 30;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '38px Cairo, Tajawal, Arial';
        ctx.fillText(book.author, 540, authorY);

        // Category badge
        if (book.category) {
          const categoryY = authorY + 70;
          const categoryText = book.category;
          ctx.font = '30px Cairo, Tajawal, Arial';
          const textWidth = ctx.measureText(categoryText).width;
          const badgeWidth = textWidth + 60;
          const badgeX = (1080 - badgeWidth) / 2;
          
          ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
          ctx.beginPath();
          ctx.roundRect(badgeX, categoryY - 30, badgeWidth, 50, 25);
          ctx.fill();
          ctx.strokeStyle = 'rgba(233, 69, 96, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#e94560';
          ctx.fillText(categoryText, 540, categoryY + 5);
        }

        // URL at bottom
        const bookUrl = getBookUrl();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '26px Cairo, Tajawal, Arial';
        ctx.fillText('📚 kotobi.xyz', 540, 1720);

        // Swipe up hint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '28px Cairo, Tajawal, Arial';
        ctx.fillText('⬆️ اسحب لأعلى لقراءة الكتاب', 540, 1790);

        // "Shared from Kotobi" branding
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.font = '22px Cairo, Tajawal, Arial';
        ctx.fillText('تمت المشاركة من منصة كتبي', 540, 1860);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject('Failed to generate image');
        }, 'image/png', 1.0);
      };

      // Load cover image if available
      if (book.cover_image_url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => drawContent(img);
        img.onerror = () => drawContent(); // fallback without cover
        img.src = book.cover_image_url;
      } else {
        drawContent();
      }
    });
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 3); // Max 3 lines
  };

  const handleInstagramStoryShare = async () => {
    setGeneratingStory(true);
    try {
      const blob = await generateStoryImage();
      const file = new File([blob], `kotobi-${book.slug || book.id}.png`, { type: 'image/png' });

      // Try Web Share API first (works on mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: book.title,
          text: `📚 ${book.title} - ${book.author}\n${getBookUrl()}`,
        });
        toast.success('تم فتح المشاركة بنجاح');
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kotobi-story-${book.slug || book.id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('تم تحميل صورة الستوري - شاركها على إنستغرام!');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        toast.error('فشل في إنشاء صورة الستوري');
      }
    } finally {
      setGeneratingStory(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getBookUrl());
      setCopied(true);
      toast.success('تم نسخ رابط الكتاب');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('فشل في نسخ الرابط');
    }
  };

  const socialPlatforms = [
    {
      name: 'واتساب',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488z"/>
        </svg>
      ),
      onClick: handleWhatsAppShare,
      gradient: 'from-[#25D366] to-[#128C7E]'
    },
    {
      name: 'ستوري',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      ),
      onClick: handleInstagramStoryShare,
      gradient: 'from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
      loading: generatingStory
    },
    {
      name: 'فيسبوك',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      onClick: handleFacebookShare,
      gradient: 'from-[#1877F2] to-[#0d47a1]'
    },
    {
      name: 'تويتر',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      onClick: handleTwitterShare,
      gradient: 'from-[#1DA1F2] to-[#0d8bd9]'
    },
    {
      name: 'تيليجرام',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      onClick: handleTelegramShare,
      gradient: 'from-[#0088cc] to-[#006699]'
    }
  ];

  return (
    <div className="my-6">
      {/* Beautiful Glassmorphism Share Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-primary/10 border border-primary/20 p-5 shadow-xl backdrop-blur-sm"
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/15 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        {/* Header */}
        <div className="relative flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground font-cairo">
              شارك الكتاب
            </h3>
            <p className="text-xs text-muted-foreground font-cairo">
              أنشر الفائدة مع أصدقائك
            </p>
          </div>
        </div>

        {/* Social Icons Grid */}
        <div className="relative flex items-center justify-center gap-3 mb-4">
          {socialPlatforms.map((platform, index) => (
            <motion.button
              key={index}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.15, y: -3 }}
              whileTap={{ scale: 0.95 }}
              onClick={platform.onClick}
              disabled={platform.loading}
              className={`relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${platform.gradient} text-white shadow-lg transition-shadow duration-300 hover:shadow-xl ${platform.loading ? 'opacity-70 animate-pulse' : ''}`}
              title={platform.name}
              aria-label={`مشاركة عبر ${platform.name}`}
            >
              <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
              {platform.loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                platform.icon
              )}
            </motion.button>
          ))}
          
          {/* QR Button */}
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.15, y: -3 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setQrDialogOpen(true)}
            className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg transition-shadow duration-300 hover:shadow-xl"
            title="رمز QR"
            aria-label="عرض رمز QR"
          >
            <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
            <QrCode className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Copy Link Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCopyLink}
          className={`relative w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-cairo font-semibold text-sm transition-all duration-300 overflow-hidden ${
            copied 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25' 
              : 'bg-gradient-to-r from-muted/80 to-muted hover:from-primary/10 hover:to-primary/20 text-foreground border border-border hover:border-primary/30'
          }`}
        >
          {copied ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Check className="w-5 h-5" />
              </motion.div>
              <span>تم نسخ الرابط بنجاح!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>نسخ رابط الكتاب</span>
            </>
          )}
        </motion.button>
      </motion.div>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-sm border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-center font-cairo text-lg flex items-center justify-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              رمز QR للكتاب
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-5 py-4">
            {/* QR Code with animated gradient border */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="relative p-1.5 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-3xl shadow-2xl"
            >
              <div className="p-4 bg-white rounded-2xl">
                <QRCodeComponent 
                  value={getBookUrl()} 
                  size={180}
                  className="rounded-xl"
                />
              </div>
            </motion.div>
            
            {/* Book Info */}
            <div className="text-center space-y-1 max-w-full px-4">
              <p className="text-base font-bold text-foreground font-cairo line-clamp-2">
                {book.title}
              </p>
              <p className="text-sm text-muted-foreground font-cairo">
                {book.author}
              </p>
            </div>

            {/* Scan Instruction */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gradient-to-r from-primary/5 to-primary/10 py-3 px-5 rounded-xl border border-primary/10">
              <span className="text-lg">📱</span>
              <span className="font-cairo">امسح الرمز بكاميرا هاتفك</span>
            </div>
            
            {/* Copy Button */}
            <Button
              onClick={handleCopyLink}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-cairo font-semibold shadow-lg shadow-primary/25"
              size="lg"
            >
              {copied ? <Check className="ml-2 h-5 w-5" /> : <Copy className="ml-2 h-5 w-5" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookShareButtons;
