import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Bot, Sparkles, PlayCircle, Loader2, Power, PowerOff } from 'lucide-react';
import { AIBotBadge } from '@/components/icons/AIBotBadge';

interface BotRow {
  id: string;
  display_name: string;
  personality: string;
  review_style: string;
  is_active: boolean;
  bio: string | null;
}

interface ActivityRow {
  id: string;
  bot_id: string;
  book_id: string;
  action_type: string;
  rating: number | null;
  sentiment: string | null;
  status: string;
  created_at: string;
}

interface ActivityEnriched extends ActivityRow {
  book_title?: string;
  book_author?: string;
  book_slug?: string | null;
  bot_name?: string;
}

export const AIBotsManager: React.FC = () => {
  const { toast } = useToast();
  const [bots, setBots] = useState<BotRow[]>([]);
  const [activity, setActivity] = useState<ActivityEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [running, setRunning] = useState(false);
  const [toggling, setToggling] = useState(false);

  const activeCount = bots.filter((b) => b.is_active).length;
  const allActive = bots.length > 0 && activeCount === bots.length;
  const allInactive = bots.length > 0 && activeCount === 0;

  const loadData = async () => {
    setLoading(true);
    const [{ data: botData }, { data: actData }] = await Promise.all([
      supabase.from('ai_bot_accounts').select('*').order('created_at'),
      supabase
        .from('ai_bot_book_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    const botsList = (botData as BotRow[]) ?? [];
    const acts = (actData as ActivityRow[]) ?? [];

    const bookIds = Array.from(new Set(acts.map((a) => a.book_id).filter(Boolean)));
    const botIds = Array.from(new Set(acts.map((a) => a.bot_id).filter(Boolean)));

    const [{ data: booksData }, { data: botsMeta }] = await Promise.all([
      bookIds.length
        ? supabase.from('book_submissions').select('id, title, author, slug').in('id', bookIds)
        : Promise.resolve({ data: [] as any[] }),
      botIds.length
        ? supabase.from('ai_bot_accounts').select('id, display_name').in('id', botIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const bookMap = new Map((booksData ?? []).map((b: any) => [b.id, b]));
    const botMap = new Map((botsMeta ?? []).map((b: any) => [b.id, b]));

    const enriched: ActivityEnriched[] = acts.map((a) => {
      const book = bookMap.get(a.book_id);
      const bot = botMap.get(a.bot_id);
      return {
        ...a,
        book_title: book?.title,
        book_author: book?.author,
        book_slug: book?.slug ?? null,
        bot_name: bot?.display_name,
      };
    });

    setBots(botsList);
    setActivity(enriched);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const seedBots = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-bots-seed');
      if (error) throw error;
      toast({
        title: '✅ تم إنشاء البوتات',
        description: `تم معالجة ${data?.total ?? 0} بوت`,
      });
      await loadData();
    } catch (e) {
      toast({
        title: '❌ خطأ',
        description: e instanceof Error ? e.message : 'فشلت العملية',
        variant: 'destructive',
      });
    } finally {
      setSeeding(false);
    }
  };

  const runReviewCycle = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-bots-review-books', {
        body: { maxBots: 5, maxBooksPerBot: 1 },
      });
      if (error) throw error;
      toast({
        title: '🤖 تم تشغيل دورة قراءة',
        description: `${data?.processed ?? 0} عملية مراجعة منفّذة`,
      });
      await loadData();
    } catch (e) {
      toast({
        title: '❌ خطأ',
        description: e instanceof Error ? e.message : 'فشلت العملية',
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
    }
  };

  const toggleAllBots = async (active: boolean) => {
    setToggling(true);
    try {
      const { error } = await supabase
        .from('ai_bot_accounts')
        .update({ is_active: active })
        .not('id', 'is', null);
      if (error) throw error;
      toast({
        title: active ? '✅ تم تفعيل جميع البوتات' : '⏸️ تم إيقاف جميع البوتات',
        description: active
          ? 'البوتات الآن نشطة وستشارك في دورات القراءة.'
          : 'لن تشارك البوتات في أي دورة قراءة حتى تعيد تفعيلها.',
      });
      await loadData();
    } catch (e) {
      toast({
        title: '❌ خطأ',
        description: e instanceof Error ? e.message : 'فشلت العملية',
        variant: 'destructive',
      });
    } finally {
      setToggling(false);
    }
  };

  const styleLabel = (s: string) =>
    s === 'strict' ? 'صارم' : s === 'lenient' ? 'متسامح' : 'متوازن';

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" /> إدارة بوتات الذكاء الاصطناعي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            البوتات تقرأ الكتب باستخدام Mistral AI، وتقيّمها (نجوم + مراجعة) وتضع إعجاب أو عدم إعجاب.
            جميع حسابات البوتات <strong>مُعلَنة بوضوح</strong> للمستخدمين بشارة <AIBotBadge size="sm" />.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={seedBots} disabled={seeding} variant="outline">
              {seeding ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Sparkles className="h-4 w-4 ml-2" />}
              إنشاء/مزامنة الـ 20 بوت
            </Button>
            <Button onClick={runReviewCycle} disabled={running || bots.length === 0}>
              {running ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <PlayCircle className="h-4 w-4 ml-2" />}
              تشغيل دورة قراءة وتقييم
            </Button>
            <Button
              onClick={() => toggleAllBots(true)}
              disabled={toggling || bots.length === 0 || allActive}
              variant="outline"
              className="text-green-600 border-green-600/40 hover:bg-green-600/10 hover:text-green-700"
            >
              {toggling ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Power className="h-4 w-4 ml-2" />}
              تفعيل جميع البوتات
            </Button>
            <Button
              onClick={() => toggleAllBots(false)}
              disabled={toggling || bots.length === 0 || allInactive}
              variant="destructive"
            >
              {toggling ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <PowerOff className="h-4 w-4 ml-2" />}
              إيقاف جميع البوتات
            </Button>
          </div>
          {bots.length > 0 && (
            <p className="text-xs text-muted-foreground">
              الحالة: <strong>{activeCount}</strong> نشط من أصل <strong>{bots.length}</strong> بوت.
              {allInactive && ' — جميع البوتات موقوفة الآن ولن تشارك في أي دورة قراءة.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>البوتات المسجّلة ({bots.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : bots.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد بوتات بعد. اضغط "إنشاء/مزامنة" لبدء التهيئة.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {bots.map((b) => (
                <div key={b.id} className="rounded-lg border p-3 bg-card">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm">{b.display_name}</span>
                    <AIBotBadge size="sm" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{b.personality}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-secondary">{styleLabel(b.review_style)}</span>
                    {b.is_active ? (
                      <span className="text-green-600">● نشط</span>
                    ) : (
                      <span className="text-muted-foreground">● موقوف</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>آخر نشاط</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا يوجد نشاط بعد.</p>
          ) : (
            <div className="space-y-2">
              {activity.map((a) => {
                const bookHref = a.book_slug ? `/book/${a.book_slug}` : `/book/${a.book_id}`;
                return (
                  <div key={a.id} className="text-xs p-3 rounded border bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 font-medium text-sm">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                        <span>{a.bot_name ?? '—'}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(a.created_at).toLocaleString('ar')}
                      </span>
                    </div>
                    {a.book_title ? (
                      <a
                        href={bookHref}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-foreground hover:underline"
                      >
                        📖 {a.book_title}
                        {a.book_author ? <span className="text-muted-foreground"> — {a.book_author}</span> : null}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">كتاب محذوف ({a.book_id.slice(0, 8)})</span>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-secondary">{a.action_type}</span>
                      {a.rating ? <span>★ {a.rating}</span> : null}
                      <span
                        className={
                          a.sentiment === 'positive'
                            ? 'text-green-600'
                            : a.sentiment === 'negative'
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                        }
                      >
                        {a.sentiment ?? a.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIBotsManager;