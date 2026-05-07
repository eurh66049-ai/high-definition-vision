import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy, RefreshCw } from 'lucide-react';
import { supabase, supabaseFunctions } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIBookDescriptionGeneratorProps {
  onDescriptionGenerated?: (description: string) => void;
}

export const AIBookDescriptionGenerator: React.FC<AIBookDescriptionGeneratorProps> = ({
  onDescriptionGenerated
}) => {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bookDetails, setBookDetails] = useState({
    title: '',
    author: '',
    category: '',
    language: 'العربية',
    targetAudience: '',
    bookTheme: '',
    keyWords: '',
    descriptionStyle: 'جذاب ومشوق',
    bookLength: '',
    mainIdea: ''
  });
  const [generatedDescription, setGeneratedDescription] = useState('');
  const { toast } = useToast();

  const categories = [
    'روايات',
    'الفكر والثقافة العامة',
    'العلوم الإسلامية',
    'مجموعة قصص',
    'الشعر',
    'نصوص وخواطر',
    'الأدب',
    'التاريخ والحضارات',
    'التنمية البشرية وتطوير الذات',
    'مذكرات وسير ذاتية',
    'الفلسفة والمنطق',
    'السياسية',
    'الأطفال',
    'دراسات وبحوث',
    'الأديان',
    'مسرحيات وفنون',
    'علم النفس',
    'التعليم والتربية',
    'الحب والعلاقات',
    'التفاسير',
    'السيرة النبوية',
    'سيرة الخلفاء والتابعين',
    'التسويق وإدارة الأعمال',
    'العلوم',
    'تعلم اللغة العربية',
    'ثقافة المرأة',
    'الترجمة ومعاجم',
    'قصص الأنبياء',
    'الإقتصاد',
    'علم الإجتماع',
    'الصوفية',
    'تعلم اللغة الإنجليزية',
    'الطب والتمريض',
    'التواصل والإعلام',
    'التغذية',
    'القانون',
    'البرمجة',
    'الأعشاب والطب البديل',
    'الرياضة',
    'علوم الحاسوب',
    'تعلم اللغة الفرنسية',
    'الحرب والعلوم العسكرية',
    'تعلم اللغة الإسبانية',
    'التصوير الفوتوغرافي',
    'الطبخ',
    'مجلات',
    'تفاسير الأحلام',
    'المصاحف',
    'تعلم اللغة الألمانية'
  ];

  const descriptionStyles = [
    'جذاب ومشوق',
    'أكاديمي ومفصل',
    'بسيط ومباشر',
    'عاطفي ومؤثر',
    'تشويقي وغامض',
    'تعليمي وتثقيفي'
  ];

  const targetAudiences = [
    'الجميع',
    'الأطفال',
    'المراهقون',
    'الشباب',
    'البالغون',
    'المتخصصون',
    'الطلاب',
    'المهتمون بالموضوع'
  ];

  const updateBookDetail = (field: string, value: string) => {
    setBookDetails(prev => ({ ...prev, [field]: value }));
  };

  const generateDescription = async () => {
    if (!bookDetails.title.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال عنوان الكتاب",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabaseFunctions.functions.invoke('generate-book-description', {
        body: {
          bookTitle: bookDetails.title.trim(),
          bookAuthor: bookDetails.author.trim(),
          bookCategory: bookDetails.category,
          bookLanguage: bookDetails.language,
          targetAudience: bookDetails.targetAudience,
          bookTheme: bookDetails.bookTheme,
          keyWords: bookDetails.keyWords,
          descriptionStyle: bookDetails.descriptionStyle,
          bookLength: bookDetails.bookLength,
          mainIdea: bookDetails.mainIdea
        }
      });

      if (error) {
        throw error;
      }

      if (data?.description) {
        setGeneratedDescription(data.description);
        toast({
          title: "تم بنجاح! ✨",
          description: "تم توليد وصف الكتاب بواسطة الذكاء الاصطناعي",
        });
      } else {
        throw new Error('لم يتم استلام وصف من الخدمة');
      }
    } catch (error) {
      console.error('Error generating description:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في توليد الوصف، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyDescription = async () => {
    try {
      await navigator.clipboard.writeText(generatedDescription);
      toast({
        title: "تم النسخ! 📋",
        description: "تم نسخ الوصف إلى الحافظة",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في نسخ النص",
        variant: "destructive",
      });
    }
  };

  const useDescription = () => {
    if (onDescriptionGenerated && generatedDescription) {
      onDescriptionGenerated(generatedDescription);
      setOpen(false);
      toast({
        title: "تم الاستخدام! ✅",
        description: "تم استخدام الوصف المولد",
      });
    }
  };

  const resetForm = () => {
    setBookDetails({
      title: '',
      author: '',
      category: '',
      language: 'العربية',
      targetAudience: '',
      bookTheme: '',
      keyWords: '',
      descriptionStyle: 'جذاب ومشوق',
      bookLength: '',
      mainIdea: ''
    });
    setGeneratedDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-300 hover:from-purple-500/20 hover:to-blue-500/20 transition-all duration-300"
        >
          <Sparkles className="h-4 w-4 text-purple-600" />
          مولد أوصاف الكتب بالذكاء الاصطناعي
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mb-[80px] md:mb-0 z-[250]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            مولد أوصاف الكتب بالذكاء الاصطناعي
          </DialogTitle>
          <DialogDescription>
            كلما أضفت تفاصيل أكثر، كلما كان الوصف أكثر دقة وجاذبية لقرائك
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات أساسية */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-right">المعلومات الأساسية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bookTitle">عنوان الكتاب *</Label>
                <Input
                  id="bookTitle"
                  value={bookDetails.title}
                  onChange={(e) => updateBookDetail('title', e.target.value)}
                  placeholder="ادخل عنوان الكتاب"
                  className="text-right md:text-[16px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bookAuthor">اسم المؤلف</Label>
                <Input
                  id="bookAuthor"
                  value={bookDetails.author}
                  onChange={(e) => updateBookDetail('author', e.target.value)}
                  placeholder="ادخل اسم المؤلف"
                  className="text-right md:text-[16px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bookCategory">التصنيف</Label>
                <Select value={bookDetails.category} onValueChange={(value) => updateBookDetail('category', value)}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر تصنيف الكتاب" />
                  </SelectTrigger>
                  <SelectContent className="z-[300]">
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bookLanguage">اللغة</Label>
                <Select value={bookDetails.language} onValueChange={(value) => updateBookDetail('language', value)}>
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[300]">
                    <SelectItem value="العربية">العربية</SelectItem>
                    <SelectItem value="الإنجليزية">الإنجليزية</SelectItem>
                    <SelectItem value="الفرنسية">الفرنسية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAudience">الجمهور المستهدف</Label>
                <Select value={bookDetails.targetAudience} onValueChange={(value) => updateBookDetail('targetAudience', value)}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="من هو جمهورك؟" />
                  </SelectTrigger>
                  <SelectContent className="z-[300]">
                    {targetAudiences.map((audience) => (
                      <SelectItem key={audience} value={audience}>
                        {audience}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* تفاصيل المحتوى */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-right">تفاصيل المحتوى</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mainIdea">الفكرة الرئيسية للكتاب</Label>
                <Textarea
                  id="mainIdea"
                  value={bookDetails.mainIdea}
                  onChange={(e) => updateBookDetail('mainIdea', e.target.value)}
                  placeholder="اشرح الفكرة الرئيسية أو الرسالة التي يحملها كتابك..."
                  className="text-right min-h-20 md:text-[16px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bookTheme">موضوع أو محور الكتاب</Label>
                <Input
                  id="bookTheme"
                  value={bookDetails.bookTheme}
                  onChange={(e) => updateBookDetail('bookTheme', e.target.value)}
                  placeholder="مثال: الحب، المغامرة، النجاح، التاريخ الإسلامي..."
                  className="text-right md:text-[16px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="keyWords">كلمات مفتاحية مهمة</Label>
                <Input
                  id="keyWords"
                  value={bookDetails.keyWords}
                  onChange={(e) => updateBookDetail('keyWords', e.target.value)}
                  placeholder="اكتب كلمات مفتاحية مفصولة بفواصل: الإلهام، التحدي، النمو..."
                  className="text-right md:text-[16px]"
                />
              </div>
            </div>
          </div>

          {/* إعدادات الوصف */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-right">إعدادات الوصف</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="descriptionStyle">أسلوب الوصف</Label>
                <Select value={bookDetails.descriptionStyle} onValueChange={(value) => updateBookDetail('descriptionStyle', value)}>
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[300]">
                    {descriptionStyles.map((style) => (
                      <SelectItem key={style} value={style}>
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bookLength">حجم الكتاب التقريبي</Label>
                <Input
                  id="bookLength"
                  value={bookDetails.bookLength}
                  onChange={(e) => updateBookDetail('bookLength', e.target.value)}
                  placeholder="مثال: 200 صفحة، كتاب قصير، رواية طويلة..."
                  className="text-right md:text-[16px]"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={generateDescription} 
              disabled={isGenerating || !bookDetails.title.trim()}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                  جاري التوليد...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 ml-2" />
                  توليد الوصف
                </>
              )}
            </Button>

            <Button variant="outline" onClick={resetForm}>
              إعادة تعيين
            </Button>
          </div>

          {generatedDescription && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <Label>الوصف المولد:</Label>
              <Textarea
                value={generatedDescription}
                onChange={(e) => setGeneratedDescription(e.target.value)}
                className="min-h-32 text-right md:text-[16px]"
                placeholder="سيظهر الوصف المولد هنا..."
              />
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyDescription} className="gap-2">
                  <Copy className="h-4 w-4" />
                  نسخ
                </Button>
                
                {onDescriptionGenerated && (
                  <Button onClick={useDescription} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    استخدام هذا الوصف
                  </Button>
                )}
                
                <Button variant="outline" onClick={generateDescription} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  توليد وصف آخر
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};