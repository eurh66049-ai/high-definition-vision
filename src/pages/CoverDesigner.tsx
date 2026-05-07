import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Download, Upload, RotateCcw, Eye, Layers, Type, Palette, Layout, Sparkles, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

// ---- Types ----
interface CoverState {
  title: string;
  subtitle: string;
  authorName: string;
  bookType: string;
  // Image
  backgroundImage: string | null;
  backgroundColor: string;
  backgroundGradient: string;
  useGradient: boolean;
  imageOpacity: number;
  imageBlur: number;
  imageBrightness: number;
  imageContrast: number;
  imageSaturate: number;
  imageScale: number;
  imageOffsetX: number;
  imageOffsetY: number;
  // Layout
  textPosition: 'top-right' | 'top-center' | 'top-left' | 'center-right' | 'center-center' | 'center-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  textAlign: 'right' | 'center' | 'left';
  paddingX: number;
  paddingY: number;
  // Title font
  titleFontFamily: string;
  titleFontSize: number;
  titleColor: string;
  titleShadow: boolean;
  titleShadowColor: string;
  titleShadowBlur: number;
  titleStroke: boolean;
  titleStrokeColor: string;
  titleStrokeWidth: number;
  titleLetterSpacing: number;
  titleLineHeight: number;
  // Subtitle
  subtitleFontFamily: string;
  subtitleFontSize: number;
  subtitleColor: string;
  // Author font
  authorFontFamily: string;
  authorFontSize: number;
  authorColor: string;
  // Overlay
  overlayColor: string;
  overlayOpacity: number;
  overlayType: 'none' | 'solid' | 'gradient-top' | 'gradient-bottom' | 'vignette';
  // Border
  borderEnabled: boolean;
  borderColor: string;
  borderWidth: number;
  borderStyle: 'solid' | 'double' | 'dashed' | 'inset';
  borderRadius: number;
  // Inner frame
  innerFrameEnabled: boolean;
  innerFrameColor: string;
  innerFrameMargin: number;
  // Decorative
  decorativeLine: boolean;
  decorativeLineColor: string;
  decorativeLineWidth: number;
  // Badge / Type label
  showTypeBadge: boolean;
  typeBadgeColor: string;
  typeBadgeBg: string;
}

const INITIAL_STATE: CoverState = {
  title: '',
  subtitle: '',
  authorName: '',
  bookType: 'رواية',
  backgroundImage: null,
  backgroundColor: '#1a1a2e',
  backgroundGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  useGradient: true,
  imageOpacity: 100,
  imageBlur: 0,
  imageBrightness: 100,
  imageContrast: 100,
  imageSaturate: 100,
  imageScale: 100,
  imageOffsetX: 0,
  imageOffsetY: 0,
  textPosition: 'bottom-center',
  textAlign: 'center',
  paddingX: 32,
  paddingY: 40,
  titleFontFamily: 'Tajawal',
  titleFontSize: 30,
  titleColor: '#ffffff',
  titleShadow: true,
  titleShadowColor: '#000000',
  titleShadowBlur: 8,
  titleStroke: false,
  titleStrokeColor: '#000000',
  titleStrokeWidth: 2,
  titleLetterSpacing: 0,
  titleLineHeight: 1.3,
  subtitleFontFamily: 'Tajawal',
  subtitleFontSize: 20,
  subtitleColor: '#cccccc',
  authorFontFamily: 'Tajawal',
  authorFontSize: 22,
  authorColor: '#e0e0e0',
  overlayColor: '#000000',
  overlayOpacity: 30,
  overlayType: 'gradient-bottom',
  borderEnabled: false,
  borderColor: '#ffffff',
  borderWidth: 3,
  borderStyle: 'solid',
  borderRadius: 0,
  innerFrameEnabled: false,
  innerFrameColor: '#ffffff55',
  innerFrameMargin: 16,
  decorativeLine: false,
  decorativeLineColor: '#ffffff88',
  decorativeLineWidth: 60,
  showTypeBadge: true,
  typeBadgeColor: '#ffffff',
  typeBadgeBg: '#ffffff22',
};

const BOOK_TYPES = ['رواية', 'قصة', 'دراسة', 'سيرة ذاتية', 'شعر', 'تاريخ', 'فلسفة', 'دين', 'علوم', 'تنمية بشرية', 'أطفال', 'فن', 'سياسة', 'اقتصاد', 'تكنولوجيا', 'عام'];

const ARABIC_FONTS = [
  { value: 'Tajawal', label: 'تجوال' },
  { value: 'Cairo', label: 'القاهرة' },
  { value: 'Amiri', label: 'أميري' },
  { value: 'Changa', label: 'شانغا' },
  { value: 'El Messiri', label: 'المسيري' },
  { value: 'Lemonada', label: 'ليمونادا' },
  { value: 'Mada', label: 'مدى' },
  { value: 'Markazi Text', label: 'مركزي' },
  { value: 'Scheherazade New', label: 'شهرزاد' },
  { value: 'Aref Ruqaa', label: 'عارف رقعة' },
  { value: 'Reem Kufi', label: 'ريم كوفي' },
  { value: 'Harmattan', label: 'هرمتان' },
  { value: 'Noto Kufi Arabic', label: 'نوتو كوفي' },
  { value: 'IBM Plex Sans Arabic', label: 'آي بي إم بلكس' },
  { value: 'Readex Pro', label: 'ريدكس برو' },
  { value: 'Noto Naskh Arabic', label: 'نوتو نسخ' },
  { value: 'Noto Sans Arabic', label: 'نوتو سانس' },
  { value: 'Almarai', label: 'المراعي' },
  { value: 'Lalezar', label: 'لاله زار' },
  { value: 'Baloo Bhaijaan 2', label: 'بالو بهايجان' },
  { value: 'Rubik', label: 'روبيك' },
  { value: 'Vazirmatn', label: 'فارزيان' },
  { value: 'Gulzar', label: 'غولزار' },
  { value: 'Katibeh', label: 'كاتبة' },
  { value: 'Rakkas', label: 'رقّاص' },
  { value: 'Marhey', label: 'مرحي' },
  { value: 'Ruwudu', label: 'روودو' },
  { value: 'Mirza', label: 'ميرزا' },
  { value: 'Alkalami', label: 'القلمي' },
  { value: 'Vibes', label: 'فايبس' },
  { value: 'Blaka', label: 'بلاكا' },
  { value: 'Blaka Hollow', label: 'بلاكا هولو' },
  { value: 'Blaka Ink', label: 'بلاكا إنك' },
  { value: 'Aref Ruqaa Ink', label: 'عارف رقعة إنك' },
  { value: 'Noto Nastaliq Urdu', label: 'نوتو نستعليق' },
  { value: 'Lateef', label: 'لطيف' },
  { value: 'Cairo Play', label: 'القاهرة بلاي' },
];

const GRADIENT_PRESETS = [
  { label: 'ليل عميق', value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
  { label: 'غروب', value: 'linear-gradient(135deg, #e65c00 0%, #f9d423 100%)' },
  { label: 'محيط', value: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
  { label: 'كرزي', value: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)' },
  { label: 'زمردي', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { label: 'ملكي', value: 'linear-gradient(135deg, #6a0572 0%, #ab83a1 100%)' },
  { label: 'ذهبي', value: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' },
  { label: 'فحمي', value: 'linear-gradient(180deg, #232526 0%, #414345 100%)' },
  { label: 'بنفسجي', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { label: 'قرمزي', value: 'linear-gradient(135deg, #8e0000 0%, #1f1c18 100%)' },
  { label: 'سماوي', value: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
  { label: 'وردي', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
];

const TEXT_POSITIONS: { value: CoverState['textPosition']; label: string }[] = [
  { value: 'top-right', label: 'أعلى يمين' },
  { value: 'top-center', label: 'أعلى وسط' },
  { value: 'top-left', label: 'أعلى يسار' },
  { value: 'center-right', label: 'وسط يمين' },
  { value: 'center-center', label: 'وسط' },
  { value: 'center-left', label: 'وسط يسار' },
  { value: 'bottom-right', label: 'أسفل يمين' },
  { value: 'bottom-center', label: 'أسفل وسط' },
  { value: 'bottom-left', label: 'أسفل يسار' },
];

// Load Google Fonts dynamically
const loadedFonts = new Set<string>();
function loadGoogleFont(fontFamily: string) {
  if (loadedFonts.has(fontFamily)) return;
  loadedFonts.add(fontFamily);
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

const CoverDesigner: React.FC = () => {
  const [state, setState] = useState<CoverState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState('content');
  const [showMiniPreview, setShowMiniPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);

  // Show floating mini-preview when main preview is out of view (mobile only)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowMiniPreview(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    if (previewSectionRef.current) {
      observer.observe(previewSectionRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Load fonts
  useEffect(() => {
    loadGoogleFont(state.titleFontFamily);
    loadGoogleFont(state.authorFontFamily);
    loadGoogleFont(state.subtitleFontFamily);
  }, [state.titleFontFamily, state.authorFontFamily, state.subtitleFontFamily]);

  const update = useCallback(<K extends keyof CoverState>(key: K, value: CoverState[K]) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error('حجم الصورة أكبر من 15MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      update('backgroundImage', ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [update]);

  const handleDownload = useCallback(async () => {
    if (!coverRef.current) return;
    try {
      toast.loading('جارٍ تحضير الغلاف...');
      
      const dataUrl = await toPng(coverRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `${state.title || 'غلاف-كتاب'}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.dismiss();
      toast.success('تم تحميل الغلاف بنجاح!');
    } catch (err) {
      toast.dismiss();
      toast.error('حدث خطأ أثناء التحميل');
      console.error(err);
    }
  }, [state.title]);

  const resetAll = useCallback(() => {
    setState(INITIAL_STATE);
    toast.success('تم إعادة التعيين');
  }, []);

  // Build text position styles
  const getTextPositionStyles = (): React.CSSProperties => {
    const [vertical, horizontal] = state.textPosition.split('-');
    const style: React.CSSProperties = {
      position: 'absolute',
      padding: `${state.paddingY}px ${state.paddingX}px`,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 10,
    };
    if (vertical === 'top') { style.top = 0; }
    else if (vertical === 'center') { style.top = '50%'; style.transform = 'translateY(-50%)'; }
    else { style.bottom = 0; }
    
    style.textAlign = state.textAlign;
    if (horizontal === 'right') style.alignItems = 'flex-end';
    else if (horizontal === 'center') style.alignItems = 'center';
    else style.alignItems = 'flex-start';
    
    return style;
  };

  // Build overlay styles
  const getOverlayStyles = (): React.CSSProperties | null => {
    if (state.overlayType === 'none') return null;
    const base: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      zIndex: 5,
      borderRadius: state.borderRadius,
      pointerEvents: 'none',
    };
    const alpha = Math.round(state.overlayOpacity * 2.55).toString(16).padStart(2, '0');
    switch (state.overlayType) {
      case 'solid':
        return { ...base, backgroundColor: `${state.overlayColor}${alpha}` };
      case 'gradient-top':
        return { ...base, background: `linear-gradient(to bottom, ${state.overlayColor}${alpha} 0%, transparent 70%)` };
      case 'gradient-bottom':
        return { ...base, background: `linear-gradient(to top, ${state.overlayColor}${alpha} 0%, transparent 70%)` };
      case 'vignette':
        return { ...base, boxShadow: `inset 0 0 100px 40px ${state.overlayColor}${alpha}` };
      default:
        return null;
    }
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: `'${state.titleFontFamily}', sans-serif`,
    fontSize: `${state.titleFontSize}px`,
    color: state.titleColor,
    lineHeight: state.titleLineHeight,
    letterSpacing: `${state.titleLetterSpacing}px`,
    textShadow: state.titleShadow ? `0 2px ${state.titleShadowBlur}px ${state.titleShadowColor}` : undefined,
    WebkitTextStroke: state.titleStroke ? `${state.titleStrokeWidth}px ${state.titleStrokeColor}` : undefined,
    wordBreak: 'break-word',
    fontWeight: 700,
    direction: 'rtl',
  };

  const subtitleStyle: React.CSSProperties = {
    fontFamily: `'${state.subtitleFontFamily}', sans-serif`,
    fontSize: `${state.subtitleFontSize}px`,
    color: state.subtitleColor,
    direction: 'rtl',
    fontWeight: 400,
  };

  const authorStyle: React.CSSProperties = {
    fontFamily: `'${state.authorFontFamily}', sans-serif`,
    fontSize: `${state.authorFontSize}px`,
    color: state.authorColor,
    direction: 'rtl',
    fontWeight: 500,
  };

  // Section renderers
  const renderContentTab = () => (
    <div className="space-y-5">
      <div>
        <Label className="text-foreground font-semibold mb-2 block">عنوان الكتاب</Label>
        <Input value={state.title} onChange={e => update('title', e.target.value)} placeholder="أدخل عنوان الكتاب" className="text-right" dir="rtl" />
      </div>
      <div>
        <Label className="text-foreground font-semibold mb-2 block">عنوان فرعي</Label>
        <Input value={state.subtitle} onChange={e => update('subtitle', e.target.value)} placeholder="عنوان فرعي (اختياري)" className="text-right" dir="rtl" />
      </div>
      <div>
        <Label className="text-foreground font-semibold mb-2 block">اسم المؤلف</Label>
        <Input value={state.authorName} onChange={e => update('authorName', e.target.value)} placeholder="أدخل اسم المؤلف" className="text-right" dir="rtl" />
      </div>
      <div>
        <Label className="text-foreground font-semibold mb-2 block">نوع الكتاب</Label>
        <Select value={state.bookType} onValueChange={v => update('bookType', v)}>
          <SelectTrigger dir="rtl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {BOOK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-foreground font-semibold mb-2 block">صورة الغلاف</Label>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 ml-2" /> رفع صورة
          </Button>
          {state.backgroundImage && (
            <Button variant="destructive" size="icon" onClick={() => update('backgroundImage', null)}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderImageTab = () => (
    <div className="space-y-5">
      {!state.backgroundImage ? (
        <>
          <div>
            <Label className="text-foreground font-semibold mb-2 block">لون الخلفية</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={state.backgroundColor} onChange={e => update('backgroundColor', e.target.value)} className="w-10 h-10 rounded border-0 cursor-pointer" />
              <Input value={state.backgroundColor} onChange={e => update('backgroundColor', e.target.value)} className="flex-1 font-mono text-sm" dir="ltr" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label className="text-foreground font-semibold">استخدام تدرج لوني</Label>
            <Switch checked={state.useGradient} onCheckedChange={v => update('useGradient', v)} className="shrink-0" />
          </div>
          {state.useGradient && (
            <div>
              <Label className="text-foreground font-semibold mb-2 block">التدرجات الجاهزة</Label>
              <div className="grid grid-cols-4 gap-2">
                {GRADIENT_PRESETS.map(g => (
                  <button
                    key={g.label}
                    className={`h-12 rounded-lg border-2 transition-all ${state.backgroundGradient === g.value ? 'border-primary scale-105 shadow-lg' : 'border-border hover:border-primary/50'}`}
                    style={{ background: g.value }}
                    onClick={() => update('backgroundGradient', g.value)}
                    title={g.label}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <SliderControl label="شفافية الصورة" value={state.imageOpacity} min={0} max={100} onChange={v => update('imageOpacity', v)} suffix="%" />
          <SliderControl label="ضبابية الصورة" value={state.imageBlur} min={0} max={20} onChange={v => update('imageBlur', v)} suffix="px" />
          <SliderControl label="سطوع الصورة" value={state.imageBrightness} min={0} max={200} onChange={v => update('imageBrightness', v)} suffix="%" />
          <SliderControl label="تباين الصورة" value={state.imageContrast} min={0} max={200} onChange={v => update('imageContrast', v)} suffix="%" />
          <SliderControl label="تشبع الألوان" value={state.imageSaturate} min={0} max={200} onChange={v => update('imageSaturate', v)} suffix="%" />
          <SliderControl label="حجم الصورة" value={state.imageScale} min={50} max={200} onChange={v => update('imageScale', v)} suffix="%" />
          <SliderControl label="إزاحة أفقية" value={state.imageOffsetX} min={-50} max={50} onChange={v => update('imageOffsetX', v)} suffix="%" />
          <SliderControl label="إزاحة عمودية" value={state.imageOffsetY} min={-50} max={50} onChange={v => update('imageOffsetY', v)} suffix="%" />
        </>
      )}
      <div className="border-t border-border pt-4">
        <Label className="text-foreground font-semibold mb-2 block">طبقة التعتيم</Label>
        <Select value={state.overlayType} onValueChange={(v: any) => update('overlayType', v)}>
          <SelectTrigger dir="rtl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">بدون</SelectItem>
            <SelectItem value="solid">لون موحد</SelectItem>
            <SelectItem value="gradient-top">تدرج من الأعلى</SelectItem>
            <SelectItem value="gradient-bottom">تدرج من الأسفل</SelectItem>
            <SelectItem value="vignette">تأثير فينيت</SelectItem>
          </SelectContent>
        </Select>
        {state.overlayType !== 'none' && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-2 items-center">
              <input type="color" value={state.overlayColor} onChange={e => update('overlayColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <span className="text-sm text-muted-foreground">لون التعتيم</span>
            </div>
            <SliderControl label="شدة التعتيم" value={state.overlayOpacity} min={0} max={100} onChange={v => update('overlayOpacity', v)} suffix="%" />
          </div>
        )}
      </div>
    </div>
  );

  const renderTypographyTab = () => (
    <div className="space-y-5">
      {/* Title */}
      <div className="p-3 rounded-lg bg-muted/50 space-y-3">
        <h4 className="font-semibold text-foreground">خط العنوان</h4>
        <FontSelector value={state.titleFontFamily} onChange={v => update('titleFontFamily', v)} />
        <SliderControl label="حجم العنوان" value={state.titleFontSize} min={16} max={120} onChange={v => update('titleFontSize', v)} suffix="px" />
        <div className="flex gap-2 items-center">
          <input type="color" value={state.titleColor} onChange={e => update('titleColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
          <span className="text-sm text-muted-foreground">لون العنوان</span>
        </div>
        <SliderControl label="تباعد الأحرف" value={state.titleLetterSpacing} min={-5} max={20} onChange={v => update('titleLetterSpacing', v)} suffix="px" />
        <SliderControl label="ارتفاع السطر" value={state.titleLineHeight} min={0.8} max={2.5} step={0.1} onChange={v => update('titleLineHeight', v)} />
        <div className="flex items-center justify-between gap-3">
          <Switch checked={state.titleShadow} onCheckedChange={v => update('titleShadow', v)} className="shrink-0" />
          <span className="text-sm text-muted-foreground">ظل النص</span>
        </div>
        {state.titleShadow && (
          <div className="flex gap-2 items-center">
            <input type="color" value={state.titleShadowColor} onChange={e => update('titleShadowColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            <SliderControl label="قوة الظل" value={state.titleShadowBlur} min={0} max={30} onChange={v => update('titleShadowBlur', v)} suffix="px" />
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <Switch checked={state.titleStroke} onCheckedChange={v => update('titleStroke', v)} className="shrink-0" />
          <span className="text-sm text-muted-foreground">حدود النص</span>
        </div>
        {state.titleStroke && (
          <div className="flex gap-2 items-center">
            <input type="color" value={state.titleStrokeColor} onChange={e => update('titleStrokeColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            <SliderControl label="سمك الحدود" value={state.titleStrokeWidth} min={1} max={5} onChange={v => update('titleStrokeWidth', v)} suffix="px" />
          </div>
        )}
      </div>

      {/* Subtitle */}
      <div className="p-3 rounded-lg bg-muted/50 space-y-3">
        <h4 className="font-semibold text-foreground">خط العنوان الفرعي</h4>
        <FontSelector value={state.subtitleFontFamily} onChange={v => update('subtitleFontFamily', v)} />
        <SliderControl label="الحجم" value={state.subtitleFontSize} min={10} max={60} onChange={v => update('subtitleFontSize', v)} suffix="px" />
        <div className="flex gap-2 items-center">
          <input type="color" value={state.subtitleColor} onChange={e => update('subtitleColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
          <span className="text-sm text-muted-foreground">اللون</span>
        </div>
      </div>

      {/* Author */}
      <div className="p-3 rounded-lg bg-muted/50 space-y-3">
        <h4 className="font-semibold text-foreground">خط المؤلف</h4>
        <FontSelector value={state.authorFontFamily} onChange={v => update('authorFontFamily', v)} />
        <SliderControl label="الحجم" value={state.authorFontSize} min={10} max={60} onChange={v => update('authorFontSize', v)} suffix="px" />
        <div className="flex gap-2 items-center">
          <input type="color" value={state.authorColor} onChange={e => update('authorColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
          <span className="text-sm text-muted-foreground">اللون</span>
        </div>
      </div>
    </div>
  );

  const renderLayoutTab = () => (
    <div className="space-y-5">
      <div>
        <Label className="text-foreground font-semibold mb-3 block">موضع النصوص</Label>
        <div className="grid grid-cols-3 gap-2" dir="rtl">
          {TEXT_POSITIONS.map(p => (
            <button
              key={p.value}
              className={`px-3 py-2 rounded-lg text-sm border-2 transition-all ${state.textPosition === p.value ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border text-muted-foreground hover:border-primary/40'}`}
              onClick={() => update('textPosition', p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-foreground font-semibold mb-2 block">محاذاة النص</Label>
        <div className="flex gap-2" dir="rtl">
          {(['right', 'center', 'left'] as const).map(a => (
            <button
              key={a}
              className={`flex-1 px-3 py-2 rounded-lg text-sm border-2 transition-all ${state.textAlign === a ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border text-muted-foreground hover:border-primary/40'}`}
              onClick={() => update('textAlign', a)}
            >
              {a === 'right' ? 'يمين' : a === 'center' ? 'وسط' : 'يسار'}
            </button>
          ))}
        </div>
      </div>
      <SliderControl label="هامش أفقي" value={state.paddingX} min={0} max={80} onChange={v => update('paddingX', v)} suffix="px" />
      <SliderControl label="هامش عمودي" value={state.paddingY} min={0} max={100} onChange={v => update('paddingY', v)} suffix="px" />
    </div>
  );

  const renderEffectsTab = () => (
    <div className="space-y-5">
      {/* Border */}
      <div className="p-3 rounded-lg bg-muted/50 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-semibold text-foreground">إطار خارجي</h4>
          <Switch checked={state.borderEnabled} onCheckedChange={v => update('borderEnabled', v)} className="shrink-0" />
        </div>
        {state.borderEnabled && (
          <>
            <div className="flex gap-2 items-center">
              <input type="color" value={state.borderColor} onChange={e => update('borderColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <span className="text-sm text-muted-foreground">اللون</span>
            </div>
            <SliderControl label="السمك" value={state.borderWidth} min={1} max={20} onChange={v => update('borderWidth', v)} suffix="px" />
            <Select value={state.borderStyle} onValueChange={(v: any) => update('borderStyle', v)}>
              <SelectTrigger dir="rtl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">متصل</SelectItem>
                <SelectItem value="double">مزدوج</SelectItem>
                <SelectItem value="dashed">متقطع</SelectItem>
                <SelectItem value="inset">داخلي</SelectItem>
              </SelectContent>
            </Select>
            <SliderControl label="استدارة الزوايا" value={state.borderRadius} min={0} max={40} onChange={v => update('borderRadius', v)} suffix="px" />
          </>
        )}
      </div>

      {/* Inner frame */}
      <div className="p-3 rounded-lg bg-muted/50 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-semibold text-foreground">إطار داخلي</h4>
          <Switch checked={state.innerFrameEnabled} onCheckedChange={v => update('innerFrameEnabled', v)} className="shrink-0" />
        </div>
        {state.innerFrameEnabled && (
          <>
            <div className="flex gap-2 items-center">
              <input type="color" value={state.innerFrameColor} onChange={e => update('innerFrameColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <span className="text-sm text-muted-foreground">اللون</span>
            </div>
            <SliderControl label="المسافة" value={state.innerFrameMargin} min={4} max={40} onChange={v => update('innerFrameMargin', v)} suffix="px" />
          </>
        )}
      </div>

      {/* Decorative line */}
      <div className="p-3 rounded-lg bg-muted/50 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-semibold text-foreground">خط زخرفي</h4>
          <Switch checked={state.decorativeLine} onCheckedChange={v => update('decorativeLine', v)} className="shrink-0" />
        </div>
        {state.decorativeLine && (
          <>
            <div className="flex gap-2 items-center">
              <input type="color" value={state.decorativeLineColor} onChange={e => update('decorativeLineColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <span className="text-sm text-muted-foreground">اللون</span>
            </div>
            <SliderControl label="العرض" value={state.decorativeLineWidth} min={20} max={200} onChange={v => update('decorativeLineWidth', v)} suffix="px" />
          </>
        )}
      </div>

      {/* Type badge */}
      <div className="p-3 rounded-lg bg-muted/50 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-semibold text-foreground">شارة نوع الكتاب</h4>
          <Switch checked={state.showTypeBadge} onCheckedChange={v => update('showTypeBadge', v)} className="shrink-0" />
        </div>
        {state.showTypeBadge && (
          <div className="flex gap-2">
            <div className="flex gap-2 items-center">
              <input type="color" value={state.typeBadgeColor} onChange={e => update('typeBadgeColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <span className="text-xs text-muted-foreground">نص</span>
            </div>
            <div className="flex gap-2 items-center">
              <input type="color" value={state.typeBadgeBg} onChange={e => update('typeBadgeBg', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <span className="text-xs text-muted-foreground">خلفية</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Cover preview
  const coverBgStyle: React.CSSProperties = {
    width: '100%',
    aspectRatio: '2/3',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: state.borderRadius,
    border: state.borderEnabled ? `${state.borderWidth}px ${state.borderStyle} ${state.borderColor}` : undefined,
    background: state.backgroundImage ? state.backgroundColor : (state.useGradient ? state.backgroundGradient : state.backgroundColor),
  };

  const overlayStyles = getOverlayStyles();

  return (
    <>
      <Helmet>
        <title>مصمم أغلفة الكتب - كتبي</title>
        <meta name="description" content="صمم غلاف كتابك بسهولة واحترافية مع أدوات متقدمة للتخصيص الكامل" />
      </Helmet>

      <div className="min-h-screen bg-background pb-24" dir="rtl">
        {/* Header */}
        <div className="bg-card border-b border-border sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-lg font-bold text-foreground">مصمم الأغلفة</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={resetAll}>
                <RotateCcw className="h-4 w-4 ml-1" /> إعادة تعيين
              </Button>
              <Button size="sm" onClick={handleDownload} className="bg-primary hover:bg-primary/90">
                <Download className="h-4 w-4 ml-1" /> تحميل
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preview */}
            <div className="order-1 lg:order-2" ref={previewSectionRef}>
              <div className="sticky top-20">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" /> معاينة مباشرة
                </h3>
                <div className="flex justify-center">
                  <div className="w-full max-w-[340px] shadow-2xl rounded-lg overflow-hidden">
                    <div ref={coverRef} style={coverBgStyle}>
                      {/* Background image */}
                      {state.backgroundImage && (
                        <img
                          src={state.backgroundImage}
                          alt=""
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: state.imageOpacity / 100,
                            filter: `blur(${state.imageBlur}px) brightness(${state.imageBrightness}%) contrast(${state.imageContrast}%) saturate(${state.imageSaturate}%)`,
                            transform: `scale(${state.imageScale / 100}) translate(${state.imageOffsetX}%, ${state.imageOffsetY}%)`,
                          }}
                        />
                      )}

                      {/* Overlay */}
                      {overlayStyles && <div style={overlayStyles} />}

                      {/* Inner frame */}
                      {state.innerFrameEnabled && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: state.innerFrameMargin,
                            border: `1px solid ${state.innerFrameColor}`,
                            borderRadius: Math.max(0, state.borderRadius - 4),
                            zIndex: 6,
                            pointerEvents: 'none',
                          }}
                        />
                      )}

                      {/* Type badge */}
                      {state.showTypeBadge && state.bookType && (
                        <div
                          style={{
                            position: 'absolute',
                            top: state.innerFrameEnabled ? state.innerFrameMargin + 8 : 16,
                            left: state.innerFrameEnabled ? state.innerFrameMargin + 8 : 16,
                            backgroundColor: state.typeBadgeBg,
                            color: state.typeBadgeColor,
                            padding: '4px 14px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontFamily: "'Tajawal', sans-serif",
                            zIndex: 11,
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                          }}
                        >
                          {state.bookType}
                        </div>
                      )}

                      {/* Text content */}
                      <div style={getTextPositionStyles()}>
                        {state.decorativeLine && (
                          <div
                            style={{
                              width: state.decorativeLineWidth,
                              height: 2,
                              backgroundColor: state.decorativeLineColor,
                              marginBottom: 8,
                              ...(state.textAlign === 'center' ? { alignSelf: 'center' } : state.textAlign === 'left' ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' }),
                            }}
                          />
                        )}
                        {state.title && <div style={titleStyle}>{state.title}</div>}
                        {state.subtitle && <div style={subtitleStyle}>{state.subtitle}</div>}
                        {state.decorativeLine && state.authorName && (
                          <div
                            style={{
                              width: state.decorativeLineWidth * 0.5,
                              height: 1,
                              backgroundColor: state.decorativeLineColor,
                              marginTop: 4,
                              marginBottom: 4,
                              ...(state.textAlign === 'center' ? { alignSelf: 'center' } : state.textAlign === 'left' ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' }),
                            }}
                          />
                        )}
                        {state.authorName && <div style={authorStyle}>{state.authorName}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="order-2 lg:order-1">
              <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
                <TabsList className="w-full grid grid-cols-5 mb-4">
                  <TabsTrigger value="content" className="text-xs gap-1 flex-col sm:flex-row">
                    <Type className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">المحتوى</span>
                  </TabsTrigger>
                  <TabsTrigger value="image" className="text-xs gap-1 flex-col sm:flex-row">
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">الصورة</span>
                  </TabsTrigger>
                  <TabsTrigger value="typography" className="text-xs gap-1 flex-col sm:flex-row">
                    <Palette className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">الخطوط</span>
                  </TabsTrigger>
                  <TabsTrigger value="layout" className="text-xs gap-1 flex-col sm:flex-row">
                    <Layout className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">التخطيط</span>
                  </TabsTrigger>
                  <TabsTrigger value="effects" className="text-xs gap-1 flex-col sm:flex-row">
                    <Layers className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">التأثيرات</span>
                  </TabsTrigger>
                </TabsList>

                <div className="bg-card rounded-xl border border-border p-4 max-h-[70vh] overflow-y-auto">
                  <TabsContent value="content" className="mt-0">{renderContentTab()}</TabsContent>
                  <TabsContent value="image" className="mt-0">{renderImageTab()}</TabsContent>
                  <TabsContent value="typography" className="mt-0">{renderTypographyTab()}</TabsContent>
                  <TabsContent value="layout" className="mt-0">{renderLayoutTab()}</TabsContent>
                  <TabsContent value="effects" className="mt-0">{renderEffectsTab()}</TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Floating mini-preview on mobile when main preview is out of view */}
        {showMiniPreview && (
          <div 
            className="fixed bottom-20 left-4 z-50 lg:hidden cursor-pointer"
            onClick={() => previewSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            <div className="w-[100px] rounded-lg overflow-hidden shadow-2xl border-2 border-primary/50 ring-2 ring-primary/20">
              <div style={{
                ...coverBgStyle,
                width: '100%',
                aspectRatio: '2/3',
                fontSize: '0',
                pointerEvents: 'none',
              }}>
                {state.backgroundImage && (
                  <img
                    src={state.backgroundImage}
                    alt=""
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: state.imageOpacity / 100,
                      filter: `blur(${state.imageBlur}px) brightness(${state.imageBrightness}%) contrast(${state.imageContrast}%) saturate(${state.imageSaturate}%)`,
                      transform: `scale(${state.imageScale / 100}) translate(${state.imageOffsetX}%, ${state.imageOffsetY}%)`,
                    }}
                  />
                )}
                {overlayStyles && <div style={overlayStyles} />}
                <div style={{
                  ...getTextPositionStyles(),
                  padding: `${state.paddingY * 0.3}px ${state.paddingX * 0.3}px`,
                  gap: '2px',
                }}>
                  {state.title && (
                    <div style={{ ...titleStyle, fontSize: `${Math.max(5, state.titleFontSize * 0.3)}px` }}>{state.title}</div>
                  )}
                  {state.authorName && (
                    <div style={{ ...authorStyle, fontSize: `${Math.max(4, state.authorFontSize * 0.3)}px` }}>{state.authorName}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-[10px] text-center text-muted-foreground mt-1">اضغط للعودة</div>
          </div>
        )}
      </div>
    </>
  );
};

// ---- Helper Components ----
const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}> = ({ label, value, min, max, step = 1, onChange, suffix = '' }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-xs font-mono text-primary">{typeof value === 'number' ? (Number.isInteger(step) ? value : value.toFixed(1)) : value}{suffix}</span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => onChange(v)}
    />
  </div>
);

const FontSelector: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <Select value={value} onValueChange={v => { loadGoogleFont(v); onChange(v); }}>
    <SelectTrigger dir="rtl"><SelectValue /></SelectTrigger>
    <SelectContent>
      {ARABIC_FONTS.map(f => (
        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default CoverDesigner;
