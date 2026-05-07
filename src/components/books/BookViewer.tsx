
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Share2, Heart, Clock, User, Calendar, Check, ExternalLink, Download, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import AuthorList from './AuthorList';
import BookDownloadDialog from './BookDownloadDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';

interface BookViewerProps {
  id: string | number;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  uploadedBy: string;
  uploadDate: string;
  userId?: string;
  authorId?: number;
  authorWebsite?: string;
  downloadUrl?: string;
  file_type?: string;
}

const DEFAULT_TITLE = "عنوان غير متوفر";
const DEFAULT_AUTHOR = "مؤلف غير معروف";
const DEFAULT_COVER = "/placeholder.svg";
const DEFAULT_DESCRIPTION = "لا يوجد وصف متاح لهذا الكتاب حتى الآن.";
const DEFAULT_UPLOADER = "مستخدم مجهول";
const DEFAULT_DATE = "غير متاح";

const BookViewer: React.FC<BookViewerProps> = ({
  id,
  title,
  author,
  description,
  coverUrl,
  uploadedBy,
  uploadDate,
  authorId,
  authorWebsite,
  downloadUrl,
  file_type,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);

  // تعويض القيم الافتراضية في حال القيم ناقصة أو خاطئة
  const safeTitle = title && typeof title === "string" ? title : DEFAULT_TITLE;
  const safeDescription =
    description && typeof description === "string" && description.trim() !== ""
      ? description
      : DEFAULT_DESCRIPTION;
  const safeAuthor = author && typeof author === "string" ? author : DEFAULT_AUTHOR;
  const safeCover =
    coverUrl && typeof coverUrl === "string" && coverUrl.trim() !== ""
      ? coverUrl
      : DEFAULT_COVER;
  const safeUploader =
    uploadedBy && typeof uploadedBy === "string" && uploadedBy.trim() !== ""
      ? uploadedBy
      : DEFAULT_UPLOADER;
  const safeUploadDate =
    uploadDate && typeof uploadDate === "string" && uploadDate.trim() !== ""
      ? uploadDate
      : DEFAULT_DATE;

  // التحقق من إذا كان هذا كتاب الإخوة كارامازوف - بطريقة أكثر دقة
  const isKaramazovBook = safeTitle.includes("الإخوة كارامازوف") || 
                          safeTitle.includes("كارامازوف") || 
                          String(id).includes("كارامازوف") ||
                          String(id).includes("الإخوة كارامازوف");

  console.log('Book title:', safeTitle);
  console.log('Book ID:', id);
  console.log('Is Karamazov book:', isKaramazovBook);

  const handleStartReading = () => {
    navigate(`/read/${id}`);
  };
  
  const handleShare = () => {
    // إنشاء رابط يمكن للجميع الوصول إليه
    const url = `${window.location.origin}/book/${id}`;
    if (navigator.share) {
      navigator.share({
        title,
        text: `اقرأ كتاب ${title} على منصة كتبي`,
        url
      }).catch(err => {
        console.error('Error sharing:', err);
        copyToClipboard(url);
      });
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        toast({
          title: "تم نسخ الرابط",
          description: "يمكنك الآن مشاركة رابط الكتاب مع الآخرين",
        });
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      toast({
        title: "تم نسخ الرابط",
        description: "يمكنك الآن مشاركة رابط الكتاب مع الآخرين",
      });
    } catch (err) {
      toast({
        title: "تعذر نسخ الرابط",
        description: `${text}`,
      });
    }
    document.body.removeChild(textArea);
  };

  const bookData = {
    id,
    title: safeTitle,
    author: { name: safeAuthor },
    coverImage: safeCover,
    downloadUrl: downloadUrl,
    file_type: file_type
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-950 py-10">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative mb-16 rounded-3xl overflow-hidden"
        >
          {/* الجزء العلوي المميز - بخلفية زجاجية متدرجة وتأثيرات حركية */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/40 to-purple-600/40 opacity-90"></div>
          <div className="absolute inset-0 bg-[url('/lovable-uploads/04f5f992-8006-459a-a544-51a68f32db46.png')] bg-cover bg-center mix-blend-overlay opacity-20"></div>
          
          {/* طبقة زجاجية مضببة */}
          <div className="absolute inset-0 backdrop-blur-md"></div>
          
          <div className="relative z-10 p-8 md:p-14">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
              {/* صورة الكتاب مع تأثيرات - بدون حدود بيضاء */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="relative group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className="relative w-72 h-96 flex-shrink-0 rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(8,112,184,0.7)]">
                  {safeCover ? (
                    <img 
                      src={safeCover}
                      alt={safeTitle}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => (e.currentTarget.src = DEFAULT_COVER)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-blue-100 to-white flex items-center justify-center">
                      <BookOpen className="h-24 w-24 text-blue-500/40" />
                    </div>
                  )}
                  
                  {/* تأثير التوهج عند التحويم */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-blue-500/30 to-transparent opacity-0 transition-opacity duration-500 ${isHovered ? 'opacity-100' : ''}`}></div>
                </div>
                
                {/* ظل أسفل الكتاب */}
                <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 w-4/5 h-6 bg-black/20 blur-xl rounded-full"></div>
                
                {/* عنوان الكتاب تحت الصورة وفي الوسط */}
                <div className="text-center mt-6">
                  <h1 className="font-amiri text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
                    {safeTitle}
                  </h1>
                  <div className="inline-flex items-center bg-white/20 backdrop-blur-lg px-3 py-1 rounded-full text-white border border-white/30 mb-2">
                    <User className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">المؤلف: {safeAuthor}</span>
                  </div>
                </div>
              </motion.div>
              
              {/* بيانات الكتاب */}
              <div className="md:flex-1 text-center md:text-right">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  {/* وصف مختصر للكتاب */}
                  <p className="text-white/90 text-lg mb-8 max-w-2xl md:mr-0 md:ml-auto font-tajawal line-clamp-2">
                    {safeDescription?.substring(0, 150) || 'كتاب قيم يستحق القراءة والإطلاع. تعرف على المزيد من خلال تصفح محتوى الكتاب.'}
                  </p>
                  
                  {/* أزرار التفاعل الرئيسية */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-8">
                    <Button 
                      onClick={handleStartReading} 
                      className="bg-white text-blue-700 hover:bg-blue-50 hover:text-blue-800 transition-all duration-300 rounded-full px-8 py-6 font-semibold shadow-lg shadow-blue-500/30 group"
                    >
                      <BookOpen className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
                      <span className="font-cairo">ابدأ القراءة</span>
                    </Button>
                    
                    <Button 
                      onClick={handleShare}
                      variant="outline" 
                      className="bg-white/10 backdrop-blur-md text-white border-white/30 hover:bg-white/20 hover:border-white/40 transition-all duration-300 rounded-full px-8 py-6 font-semibold"
                    >
                      <Share2 className="mr-2 h-5 w-5" />
                      <span className="font-cairo">مشاركة</span>
                    </Button>
                  </div>
                </motion.div>
                
                {/* بطاقات إحصائيات سريعة */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.7 }}
                  className="grid grid-cols-2 md:grid-cols-3 gap-3"
                >
                  <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30 text-white">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs opacity-80">تاريخ الإضافة</div>
                        <div className="text-sm font-medium">{safeUploadDate}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30 text-white">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs opacity-80">تمت الإضافة بواسطة</div>
                        <div className="text-sm font-medium">{safeUploader}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
          
          {/* تأثيرات زخرفية */}
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-blue-300/30 blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-56 h-56 rounded-full bg-purple-400/20 blur-3xl"></div>
        </motion.div>
        
        {/* المحتوى الرئيسي - بتصميم متعدد الأعمدة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* العمود الجانبي - معلومات الكتاب وروابط مفيدة */}
          <div className="md:col-span-1 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="sticky top-24 space-y-6"
            >
              {/* بطاقة صورة الكتاب والإجراءات - بدون حدود بيضاء */}
              <Card className="overflow-hidden border-0 shadow-lg bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl">
                <CardContent className="p-6 relative">
                  {/* تأثيرات زخرفية خلفية */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-white/10 to-white/50 mix-blend-overlay"></div>
                  <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-indigo-100/50 to-pink-100/50 rounded-full blur-3xl opacity-50 dark:from-indigo-900/30 dark:to-pink-900/30"></div>
                  
                  <div className="relative">
                    {/* صورة الكتاب بتصميم فاخر - بدون حدود بيضاء */}
                    <div className="relative mx-auto mb-6 w-full max-w-xs aspect-[2/3] rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-500">
                      {safeCover ? (
                        <img 
                          src={safeCover} 
                          alt={safeTitle} 
                          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center">
                          <BookOpen className="h-24 w-24 text-blue-300 dark:text-blue-700" />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 border-[3px] border-white/30 dark:border-white/10 rounded-xl"></div>
                    </div>
                    
                    {/* عنوان الكتاب تحت الصورة وفي الوسط */}
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-amiri mb-2">
                        {safeTitle}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 font-cairo">
                        المؤلف: {safeAuthor}
                      </p>
                    </div>
                    
                    {/* أزرار الإجراءات الرئيسية */}
                    <div className="space-y-3">
                      <Button 
                        onClick={handleStartReading} 
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-cairo text-lg py-6 rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-blue-500/10"
                      >
                        <BookOpen className="mr-2 h-5 w-5" />
                        ابدأ القراءة
                      </Button>
                    
                      {/* إخفاء زر التحميل لكتاب الإخوة كارامازوف */}
                      {!isKaramazovBook && (
                        <BookDownloadDialog
                          book={bookData}
                          trigger={
                            <Button 
                              variant="outline" 
                              className="w-full border-2 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-cairo py-5 rounded-xl"
                            >
                              <Download className="mr-2 h-5 w-5" />
                              تحميل الكتاب
                            </Button>
                          }
                        />
                      )}
                    
                      <Button 
                        onClick={handleShare} 
                        variant="outline" 
                        className="w-full border-2 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-cairo py-5 rounded-xl"
                      >
                        <Share2 className="mr-2 h-5 w-5" />
                        مشاركة الكتاب
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* بطاقة معلومات الإضافة */}
              <Card className="overflow-hidden border-0 shadow-lg bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl">
                <CardContent className="p-6 relative">
                  {/* تأثيرات زخرفية خلفية */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100/50 to-transparent rounded-full blur-xl dark:from-blue-900/20"></div>
                  
                  <div className="relative">
                    <h3 className="text-xl font-cairo font-semibold mb-4 text-blue-800 dark:text-blue-300 flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
                      بيانات الكتاب
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 bg-blue-50/80 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">تمت الإضافة بواسطة</div>
                          <div className="text-sm font-medium">{safeUploader}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-4 bg-blue-50/80 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">تاريخ الإضافة</div>
                          <div className="text-sm font-medium">{safeUploadDate}</div>
                        </div>
                      </div>

                      {/* إضافة موقع المؤلف الإلكتروني */}
                      {authorWebsite && (
                        <div className="flex items-center gap-3 p-4 bg-blue-50/80 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                          <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">موقع المؤلف</div>
                            <a 
                              href={authorWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 flex items-center gap-1 text-sm"
                            >
                              <span>زيارة الموقع</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
          {/* المحتوى الرئيسي - تفاصيل الكتاب والمؤلفين */}
          <div className="md:col-span-2">
            {/* قسم وصف الكتاب */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-10"
            >
              <Card className="overflow-hidden border-0 shadow-xl bg-white/80 dark:bg-gray-800/60 backdrop-blur-xl">
                <CardContent className="p-8 relative">
                  {/* تأثيرات زخرفية خلفية */}
                  <div className="absolute -top-16 -left-16 w-56 h-56 bg-gradient-to-br from-blue-100/60 to-transparent rounded-full blur-3xl dark:from-blue-900/20"></div>
                  <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-gradient-to-tr from-indigo-100/60 to-transparent rounded-full blur-3xl dark:from-indigo-900/20"></div>
                  
                  <div className="relative">
                    {/* عنوان القسم بتصميم مميز */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 dark:shadow-blue-500/10">
                        <BookOpen className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h2 className="font-amiri text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-400 dark:to-indigo-400">وصف الكتاب</h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">تفاصيل ومعلومات إضافية عن الكتاب</p>
                      </div>
                    </div>
                    
                    {/* محتوى الوصف */}
                    <div className="bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-800/90 dark:to-blue-900/20 rounded-2xl p-7 border border-blue-100 dark:border-blue-800/30 mb-6 shadow-sm">
                      <p className="text-gray-700 dark:text-gray-300 leading-7 md:text-lg font-tajawal">
                        {safeDescription || "لا يوجد وصف متاح لهذا الكتاب حتى الآن. يمكنك البدء بقراءة الكتاب للتعرف على محتواه والاستفادة من المعلومات القيمة التي يقدمها."}
                      </p>
                    </div>
                    
                    {/* ميزات الكتاب */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <motion.div 
                        whileHover={{ y: -5, scale: 1.02 }}
                        transition={{ duration: 0.4 }}
                        className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/30 shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-cairo text-lg font-semibold text-blue-700 dark:text-blue-400 mb-2">قراءة ممتعة</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">استمتع بقراءة هذا الكتاب بتنسيق سهل القراءة ومريح للعين مع واجهة مستخدم مصممة لتعزيز تجربة القراءة</p>
                          </div>
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        whileHover={{ y: -5, scale: 1.02 }}
                        transition={{ duration: 0.4 }}
                        className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/30 shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                            <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-cairo text-lg font-semibold text-blue-700 dark:text-blue-400 mb-2">سهولة الوصول</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">يمكنك الوصول للكتاب في أي وقت ومن أي مكان، مع إمكانية القراءة عبر مختلف الأجهزة</p>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            {/* قسم المؤلفين المقترحين */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="relative"
            >
              <Card className="overflow-hidden border-0 shadow-xl bg-white/80 dark:bg-gray-800/60 backdrop-blur-xl">
                <CardContent className="p-8 relative">
                  {/* تأثيرات زخرفية خلفية */}
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-purple-100/60 to-transparent rounded-full blur-2xl dark:from-purple-900/20"></div>
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-bl from-indigo-100/60 to-transparent rounded-full blur-2xl dark:from-indigo-900/20"></div>
                  
                  <div className="relative">
                    {/* عنوان القسم */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 dark:shadow-purple-500/10">
                        <User className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h2 className="font-amiri text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-indigo-700 dark:from-purple-400 dark:to-indigo-400">مؤلفون مقترحون</h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">تعرف على مؤلفين مميزين قد تهتم بأعمالهم</p>
                      </div>
                    </div>
                    
                    {/* قائمة المؤلفين */}
                    <div className="bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-800 dark:to-purple-900/10 rounded-2xl shadow-lg overflow-hidden border border-purple-100 dark:border-purple-900/30">
                      <AuthorList />
                    </div>
                    
                    {/* رابط "عرض المزيد" */}
                    <div className="mt-5 text-center">
                      <Button variant="ghost" className="text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-cairo">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        عرض المزيد من المؤلفين
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* شريط ملون في أسفل الصفحة */}
      <div className="mt-20 h-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
    </div>
  );
};

export default BookViewer;
