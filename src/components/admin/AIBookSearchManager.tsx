import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, Search, BookOpen, FileText, AlertCircle, CheckCircle, Brain, Sparkles, MessageCircle, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase, supabaseFunctions } from '@/integrations/supabase/client';

interface ProcessedBook {
  title: string;
  author: string;
  category: string;
  description: string;
  language: string;
  cover_image_url: string;
  book_file_url: string;
  publication_year?: number;
  page_count?: number;
  publisher?: string;
  user_query_response?: string;
  error?: string;
}

const AIBookSearchManager: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [searchMode, setSearchMode] = useState('detailed');
  const [conversationMode, setConversationMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedBook[]>([]);
  const [csvData, setCsvData] = useState<string>('');
  const [processedCount, setProcessedCount] = useState(0);
  const [assistantResponse, setAssistantResponse] = useState<string>('');
  const { toast } = useToast();

  const handleSearch = async () => {
    // إذا كان في وضع المحادثة ولا توجد كتب
    if (conversationMode && !inputText.trim()) {
      if (!userQuery.trim()) {
        toast({
          title: "مرحباً! 👋",
          description: "أنا مساعد كتبي الذكي. اكتب شيئاً لنبدأ المحادثة!",
        });
        return;
      }
      
      setIsProcessing(true);
      
      try {
        const { data, error } = await supabaseFunctions.functions.invoke('ai-book-search', {
          body: { 
            bookLinks: [],
            userQuery,
            conversationMode: true
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.success && data.conversationMode) {
          setAssistantResponse(data.assistantResponse);
          toast({
            title: "إجابة جاهزة! 🤖",
            description: "تم الرد على استفسارك",
          });
        }
      } catch (error) {
        console.error('Error in conversation:', error);
        toast({
          title: "خطأ في المحادثة",
          description: error instanceof Error ? error.message : "حدث خطأ أثناء المحادثة",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // المعالجة العادية للكتب
    if (!inputText.trim()) {
      toast({
        title: "خطأ في الإدخال",
        description: "يرجى إدخال روابط الكتب أو تفعيل وضع المحادثة",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setCsvData('');
    setProcessedCount(0);
    setAssistantResponse('');

    try {
      toast({
        title: "بدء المعالجة الذكية",
        description: "جاري تحليل الكتب باستخدام الذكاء الاصطناعي المطور...",
      });

      const { data, error } = await supabaseFunctions.functions.invoke('ai-book-search', {
        body: { 
          bookLinks: inputText,
          userQuery: userQuery.trim() || undefined,
          searchMode,
          conversationMode: false
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setResults(data.results);
        setCsvData(data.csvData);
        setProcessedCount(data.processedBooks);
        setAssistantResponse(data.assistantResponse || '');
        
        toast({
          title: "تم إنجاز المعالجة بنجاح! ✨",
          description: `تم معالجة ${data.processedBooks} كتاب وإنشاء ملف CSV محسن`,
        });
      } else {
        throw new Error(data.error || 'فشل في المعالجة');
      }

    } catch (error) {
      console.error('Error in AI search:', error);
      toast({
        title: "خطأ في المعالجة",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء معالجة الكتب",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCSV = () => {
    if (!csvData) {
      toast({
        title: "لا يوجد بيانات",
        description: "يجب معالجة الكتب أولاً لإنشاء ملف CSV",
        variant: "destructive"
      });
      return;
    }

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `books_enhanced_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "تم تحميل الملف المحسن",
      description: "تم تحميل ملف CSV بنجاح مع جميع التحسينات.",
    });
  };

  const exampleText = `الكتاب 1
https://ia804602.us.archive.org/BookReader/BookReaderImages.php?zip=/20/items/20211219_20211219_0839/%D8%A3%D8%AF%D8%B9%D9%8A%D8%A9_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D9%85%D9%86_%D8%A7%D9%84%D9%83%D8%AA%D8%A7%D8%A8_%D9%88%D8%A7%D9%84%D8%B3%D9%86%D8%A9_jp2.zip&file=%D8%A3%D8%AF%D8%B9%D9%8A%D8%A9_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D9%85%D9%86_%D8%A7%D9%84%D9%83%D8%AA%D8%A7%D8%A8_%D9%88%D8%A7%D9%84%D8%B3%D9%86%D8%A9_jp2/%D8%A3%D8%AF%D8%B9%D9%8A%D8%A9_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D9%85%D9%86_%D8%A7%D9%84%D9%83%D8%AA%D8%A7%D8%A8_%D9%88%D8%A7%D9%84%D8%B3%D9%86%D8%A9_0000.jp2&id=20211219_20211219_0839&scale=4&rotate=0
https://archive.org/download/20211219_20211219_0839/%D8%A3%D8%AF%D8%B9%D9%8A%D8%A9_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D9%85%D9%86_%D8%A7%D9%84%D9%83%D8%AA%D8%A7%D8%A8_%D9%88%D8%A7%D9%84%D8%B3%D9%86%D8%A9.pdf
55

الكتاب 2
https://ia804602.us.archive.org/BookReader/BookReaderImages.php?zip=/20/items/20211219_20211219_0839/%D8%A3%D8%B3%D8%A8%D8%A7%D8%A8_%D8%B2%D9%8A%D8%A7%D8%AF%D8%A9_%D8%A7%D9%84%D8%A5%D9%8A%D9%85%D8%A7%D9%86_%D9%88%D9%86%D9%82%D8%B5%D8%A7%D9%86%D9%87_jp2.zip&file=%D8%A3%D8%B3%D8%A8%D8%A7%D8%A8_%D8%B2%D9%8A%D8%A7%D8%AF%D8%A9_%D8%A7%D9%84%D8%A5%D9%8A%D9%85%D8%A7%D9%86_%D9%88%D9%86%D9%82%D8%B5%D8%A7%D9%86%D9%87_jp2/%D8%A3%D8%B3%D8%A8%D8%A7%D8%A8_%D8%B2%D9%8A%D8%A7%D8%AF%D8%A9_%D8%A7%D9%84%D8%A5%D9%8A%D9%85%D8%A7%D9%86_%D9%88%D9%86%D9%82%D8%B5%D8%A7%D9%86%D9%87_jp2/%D8%A3%D8%B3%D8%A8%D8%A7%D8%A8_%D8%B2%D9%8A%D8%A7%D8%AF%D8%A9_%D8%A7%D9%84%D8%A5%D9%8A%D9%85%D8%A7%D9%86_%D9%88%D9%86%D9%82%D8%B5%D8%A7%D9%86%D9%87_0000.jp2&id=20211219_20211219_0839&scale=2&rotate=0
https://archive.org/download/20211219_20211219_0839/%D8%A3%D8%B3%D8%A8%D8%A7%D8%A8_%D8%B2%D9%8A%D8%A7%D8%AF%D8%A9_%D8%A7%D9%84%D8%A5%D9%8A%D9%85%D8%A7%D9%86_%D9%88%D9%86%D9%82%D8%B5%D8%A7%D9%86%D9%87.pdf
80`;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            مساعد كتبي الذكي المطور
            <Sparkles className="h-4 w-4 text-accent animate-pulse" />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            مساعد ذكي متطور يحلل الكتب، يجيب على أسئلتك، ويقوم بالبحث القوي ويولد ملف CSV جاهز للرفع الجماعي
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={conversationMode ? "default" : "outline"}
              size="sm"
              onClick={() => setConversationMode(!conversationMode)}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              وضع المحادثة
            </Button>
            {conversationMode && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                جاهز للمحادثة
              </Badge>
            )}
          </div>

          {!conversationMode && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                بيانات الكتب (التنسيق الجديد المدعوم)
              </label>
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={exampleText}
                className="min-h-[200px] font-mono text-sm"
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground mt-1">
                يدعم التنسيق الجديد: عنوان الكتاب، رابط الغلاف، رابط الكتاب، عدد الصفحات
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">
                🤖 {conversationMode ? 'تحدث مع المساعد الذكي' : 'اسأل عن شيء محدد (اختياري)'}
              </label>
              <Input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder={conversationMode ? "مرحباً، كيف يمكنني مساعدتك؟" : "مثال: ما هي أهم الموضوعات في هذه الكتب؟"}
                disabled={isProcessing}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {conversationMode 
                  ? 'يمكنك التحدث معي عن أي موضوع متعلق بالكتب والمراجع'
                  : 'اطلب معلومات محددة وسيجيب الذكاء الاصطناعي عن كل كتاب'
                }
              </p>
            </div>

            {!conversationMode && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  وضع المعالجة
                </label>
                <Select value={searchMode} onValueChange={setSearchMode} disabled={isProcessing}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detailed">تفصيلي - معلومات شاملة</SelectItem>
                    <SelectItem value="fast">سريع - معلومات أساسية</SelectItem>
                    <SelectItem value="comprehensive">شامل - أقصى دقة وبحث قوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSearch}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {conversationMode ? 'جاري التفكير...' : 'جاري المعالجة الذكية...'}
                </>
              ) : (
                <>
                  {conversationMode ? (
                    <>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      تحدث مع المساعد
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      بدء البحث والتحليل الذكي
                    </>
                  )}
                </>
              )}
            </Button>
            
            {csvData && (
              <Button 
                onClick={downloadCSV}
                variant="outline"
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                تحميل ملف CSV المحسن
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {assistantResponse && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              رد المساعد الذكي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{assistantResponse}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              نتائج المعالجة الذكية ({processedCount} كتاب)
              {userQuery && <Badge variant="secondary">مع إجابات مخصصة</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {results.map((book, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <h3 className="font-semibold text-lg">{book.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        <strong>المؤلف:</strong> {book.author}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">{book.category}</Badge>
                        <Badge variant="outline">{book.language}</Badge>
                        {book.publication_year && (
                          <Badge variant="outline">{book.publication_year}</Badge>
                        )}
                        {book.page_count && (
                          <Badge variant="outline">{book.page_count} صفحة</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {book.error ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          خطأ
                        </Badge>
                      ) : (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          نجح
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {book.description && (
                    <div className="bg-muted/50 rounded p-3">
                      <h4 className="text-sm font-medium mb-1">وصف الكتاب:</h4>
                      <p className="text-sm text-muted-foreground">{book.description}</p>
                    </div>
                  )}
                  
                  {book.user_query_response && userQuery && (
                    <div className="bg-primary/5 rounded p-3 border-l-4 border-primary">
                      <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                        <Brain className="h-3 w-3" />
                        إجابة على استفسارك:
                      </h4>
                      <p className="text-sm">{book.user_query_response}</p>
                    </div>
                  )}
                  
                  {book.error && (
                    <div className="bg-destructive/5 rounded p-3 border-l-4 border-destructive">
                      <p className="text-sm text-destructive">{book.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {csvData && (
        <Card className="border-success/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-success" />
              ملف CSV المحسن جاهز
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-success/5 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                ملف CSV محسن جاهز للتحميل والرفع في نظام الرفع الجماعي مع جميع المعلومات المستخرجة بذكاء
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">
                  {processedCount} كتاب معالج
                </Badge>
                <Badge variant="outline">
                  CSV محسن وجاهز
                </Badge>
                {userQuery && (
                  <Badge variant="secondary">
                    مع إجابات مخصصة
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIBookSearchManager;