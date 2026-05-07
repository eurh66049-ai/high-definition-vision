import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { ChevronDown, ChevronUp, Heart, Lightbulb, MessageCircle, Send, Trash2, User, Sparkles, MessageSquarePlus, Pencil, MoreVertical, X, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { UnifiedProfileLink } from "@/components/profile/UnifiedProfileLink";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { optimizeImageUrl } from "@/utils/imageProxy";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  email: string | null;
}

interface SuggestionReply {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: Profile;
}

interface Suggestion {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: Profile;
  replies?: SuggestionReply[];
}

const SUPPORT_EMAIL = "h85342727@gmail.com";

export default function Suggestions() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newSuggestion, setNewSuggestion] = useState("");
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [showReplyForm, setShowReplyForm] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({});
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isSupport, setIsSupport] = useState(false);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [editingSuggestion, setEditingSuggestion] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suggestionToDelete, setSuggestionToDelete] = useState<string | null>(null);
  
  // حالة تعديل وحذف الردود
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");
  const [deleteReplyDialogOpen, setDeleteReplyDialogOpen] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<string | null>(null);

  // تعيين عنوان الصفحة فوراً عند الدخول (قبل تحميل البيانات)
  useEffect(() => {
    document.title = 'سجلّ القُرَّاء - كتبي';
  }, []);

  useEffect(() => {
    fetchSuggestions();
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, email")
      .eq("id", user.id)
      .single();

    if (data) {
      setUserProfile(data);
      setIsSupport(data.email === SUPPORT_EMAIL);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from("suggestions")
        .select("*")
        .order("created_at", { ascending: false });

      if (suggestionsError) throw suggestionsError;

      if (suggestionsData && suggestionsData.length > 0) {
        const userIds = [...new Set(suggestionsData.map(s => s.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, email")
          .in("id", userIds);

        const suggestionIds = suggestionsData.map(s => s.id);
        const { data: repliesData } = await supabase
          .from("suggestion_replies")
          .select("*")
          .in("suggestion_id", suggestionIds)
          .order("created_at", { ascending: true });

        const replyUserIds = repliesData ? [...new Set(repliesData.map(r => r.user_id))] : [];
        const { data: replyProfilesData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, email")
          .in("id", replyUserIds);

        const { data: likesData } = await supabase
          .from("suggestion_likes")
          .select("suggestion_id, user_id")
          .in("suggestion_id", suggestionIds);

        const likesMap: Record<string, number> = {};
        const userLikesSet = new Set<string>();

        suggestionIds.forEach(id => { likesMap[id] = 0; });
        likesData?.forEach(like => {
          likesMap[like.suggestion_id] = (likesMap[like.suggestion_id] || 0) + 1;
          if (user && like.user_id === user.id) userLikesSet.add(like.suggestion_id);
        });

        setLikes(likesMap);
        setUserLikes(userLikesSet);

        const suggestionsWithProfiles = suggestionsData.map(suggestion => {
          const profile = profilesData?.find(p => p.id === suggestion.user_id);
          const suggestionReplies = repliesData
            ?.filter(r => r.suggestion_id === suggestion.id)
            .map(reply => ({
              ...reply,
              profiles: replyProfilesData?.find(p => p.id === reply.user_id)
            }));

          return { ...suggestion, profiles: profile, replies: suggestionReplies || [] };
        });

        setSuggestions(suggestionsWithProfiles);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSuggestion = async () => {
    if (!user || !newSuggestion.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("suggestions")
        .insert({ user_id: user.id, content: newSuggestion.trim() });
      if (error) throw error;
      toast.success("تم النشر بنجاح");
      setNewSuggestion("");
      fetchSuggestions();
    } catch (error) {
      toast.error("فشل في الإرسال");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (suggestionId: string) => {
    if (!user) { toast.error("يجب تسجيل الدخول"); return; }
    const isCurrentlyLiked = userLikes.has(suggestionId);

    setUserLikes(prev => {
      const newSet = new Set(prev);
      isCurrentlyLiked ? newSet.delete(suggestionId) : newSet.add(suggestionId);
      return newSet;
    });

    setLikes(prev => ({
      ...prev,
      [suggestionId]: isCurrentlyLiked ? (prev[suggestionId] - 1) : (prev[suggestionId] + 1)
    }));

    try {
      if (isCurrentlyLiked) {
        await supabase.from("suggestion_likes").delete().eq("suggestion_id", suggestionId).eq("user_id", user.id);
      } else {
        await supabase.from("suggestion_likes").insert({ suggestion_id: suggestionId, user_id: user.id });
      }
    } catch (error) { fetchSuggestions(); }
  };

  const toggleReplyForm = (suggestionId: string) => {
    setShowReplyForm(prev => {
      const newState = { ...prev, [suggestionId]: !prev[suggestionId] };
      // Auto-scroll to reply input when opening
      if (newState[suggestionId]) {
        setTimeout(() => {
          const input = document.getElementById(`reply-input-${suggestionId}`);
          if (input) {
            input.scrollIntoView({ behavior: "smooth", block: "center" });
            input.focus();
          }
        }, 100);
      }
      return newState;
    });
  };

  const handleSubmitReply = async (suggestionId: string) => {
    if (!user || !replyContent[suggestionId]?.trim()) return;
    
    setSubmittingReply(prev => ({ ...prev, [suggestionId]: true }));
    try {
      const { error } = await supabase
        .from("suggestion_replies")
        .insert({ 
          suggestion_id: suggestionId, 
          user_id: user.id, 
          content: replyContent[suggestionId].trim() 
        });
      
      if (error) throw error;
      
      toast.success("تم إرسال الرد بنجاح");
      setReplyContent(prev => ({ ...prev, [suggestionId]: "" }));
      setShowReplyForm(prev => ({ ...prev, [suggestionId]: false }));
      setExpandedReplies(prev => ({ ...prev, [suggestionId]: true }));
      fetchSuggestions();
    } catch (error) {
      console.error("Error submitting reply:", error);
      toast.error("فشل في إرسال الرد");
    } finally {
      setSubmittingReply(prev => ({ ...prev, [suggestionId]: false }));
    }
  };

  const handleDeleteSuggestion = async () => {
    if (!suggestionToDelete || !user) return;
    
    try {
      // Delete all related data first
      await supabase.from("suggestion_likes").delete().eq("suggestion_id", suggestionToDelete);
      await supabase.from("suggestion_replies").delete().eq("suggestion_id", suggestionToDelete);
      
      const { error } = await supabase
        .from("suggestions")
        .delete()
        .eq("id", suggestionToDelete)
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      toast.success("تم حذف الاقتراح بنجاح");
      fetchSuggestions();
    } catch (error) {
      console.error("Error deleting suggestion:", error);
      toast.error("فشل في حذف الاقتراح");
    } finally {
      setDeleteDialogOpen(false);
      setSuggestionToDelete(null);
    }
  };

  const handleEditSuggestion = async (suggestionId: string) => {
    if (!user || !editContent.trim()) return;
    
    try {
      const { error } = await supabase
        .from("suggestions")
        .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
        .eq("id", suggestionId)
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      toast.success("تم تعديل الاقتراح بنجاح");
      setEditingSuggestion(null);
      setEditContent("");
      fetchSuggestions();
    } catch (error) {
      console.error("Error editing suggestion:", error);
      toast.error("فشل في تعديل الاقتراح");
    }
  };

  const startEdit = (suggestion: Suggestion) => {
    setEditingSuggestion(suggestion.id);
    setEditContent(suggestion.content);
  };

  const confirmDelete = (suggestionId: string) => {
    setSuggestionToDelete(suggestionId);
    setDeleteDialogOpen(true);
  };

  // دوال تعديل وحذف الردود
  const startEditReply = (reply: SuggestionReply) => {
    setEditingReply(reply.id);
    setEditReplyContent(reply.content);
  };

  const handleEditReply = async (replyId: string) => {
    if (!user || !editReplyContent.trim()) return;
    
    try {
      const { error } = await supabase
        .from("suggestion_replies")
        .update({ content: editReplyContent.trim() })
        .eq("id", replyId)
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      toast.success("تم تعديل الرد بنجاح");
      setEditingReply(null);
      setEditReplyContent("");
      fetchSuggestions();
    } catch (error) {
      console.error("Error editing reply:", error);
      toast.error("فشل في تعديل الرد");
    }
  };

  const confirmDeleteReply = (replyId: string) => {
    setReplyToDelete(replyId);
    setDeleteReplyDialogOpen(true);
  };

  const handleDeleteReply = async () => {
    if (!replyToDelete || !user) return;
    
    try {
      const { error } = await supabase
        .from("suggestion_replies")
        .delete()
        .eq("id", replyToDelete)
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      toast.success("تم حذف الرد بنجاح");
      fetchSuggestions();
    } catch (error) {
      console.error("Error deleting reply:", error);
      toast.error("فشل في حذف الرد");
    } finally {
      setDeleteReplyDialogOpen(false);
      setReplyToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-white pb-24" dir="rtl">
      <Helmet>
        <title>سجلّ القُرَّاء - كتبي</title>
        <meta name="description" content="مساحتكم الخاصة لمشاركة الأفكار، الاقتراحات، والكلمات الملهمة حول منصة كتبي للكتب والروايات" />
      </Helmet>
      <Navbar />

      <div className="container mx-auto px-4 py-10 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10 space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            سجلّ القُرَّاء
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-md mx-auto">
            مساحتكم الخاصة لمشاركة الأفكار، الاقتراحات، والكلمات الملهمة حول منصتنا.
          </p>
        </div>

        {/* Improved Add Suggestion Box */}
        <div className="mb-12 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-[#1a1d23] border border-white/5 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-primary" />
              أضف كلمتك أو اقتراحك
            </h3>
            {user ? (
              <div className="space-y-4">
                <Textarea
                  placeholder="بماذا تفكر؟ شاركنا رأيك..."
                  value={newSuggestion}
                  onChange={(e) => setNewSuggestion(e.target.value)}
                  className="min-h-[120px] bg-[#0f1115] border-white/5 focus:border-primary/50 text-gray-200 placeholder:text-gray-600 resize-none rounded-xl"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitSuggestion}
                    disabled={submitting || !newSuggestion.trim()}
                    className="rounded-full px-8 bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    {submitting ? "جاري النشر..." : "نشر الآن"}
                    <Send className="h-4 w-4 mr-2 rotate-180" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-[#0f1115] rounded-xl border border-dashed border-white/10">
                <p className="text-gray-500 text-sm mb-3">يجب تسجيل الدخول لتتمكن من المشاركة</p>
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="rounded-full border-primary/50 text-primary hover:bg-primary/10">
                    تسجيل الدخول
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Suggestions List */}
        <div className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-20 opacity-40">
              <Lightbulb className="h-12 w-12 mx-auto mb-2" />
              <p>لا توجد مشاركات بعد..</p>
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                user={user}
                userProfile={userProfile}
                likes={likes[suggestion.id] || 0}
                isLiked={userLikes.has(suggestion.id)}
                onLike={() => handleLike(suggestion.id)}
                expanded={expandedReplies[suggestion.id]}
                onToggleExpand={() => setExpandedReplies(p => ({ ...p, [suggestion.id]: !p[suggestion.id] }))}
                showReplyForm={showReplyForm[suggestion.id]}
                onToggleReplyForm={() => toggleReplyForm(suggestion.id)}
                replyContent={replyContent[suggestion.id] || ""}
                onReplyContentChange={(value: string) => setReplyContent(prev => ({ ...prev, [suggestion.id]: value }))}
                onSubmitReply={() => handleSubmitReply(suggestion.id)}
                submittingReply={submittingReply[suggestion.id]}
                isEditing={editingSuggestion === suggestion.id}
                editContent={editContent}
                onEditContentChange={setEditContent}
                onStartEdit={() => startEdit(suggestion)}
                onCancelEdit={() => { setEditingSuggestion(null); setEditContent(""); }}
                onSaveEdit={() => handleEditSuggestion(suggestion.id)}
                onDelete={() => confirmDelete(suggestion.id)}
                // خصائص تعديل وحذف الردود
                editingReplyId={editingReply}
                editReplyContent={editReplyContent}
                onEditReplyContentChange={setEditReplyContent}
                onStartEditReply={startEditReply}
                onCancelEditReply={() => { setEditingReply(null); setEditReplyContent(""); }}
                onSaveEditReply={handleEditReply}
                onDeleteReply={confirmDeleteReply}
              />
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#1a1d23] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">حذف الاقتراح</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              هل أنت متأكد من حذف هذا الاقتراح؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSuggestion}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Reply Confirmation Dialog */}
      <AlertDialog open={deleteReplyDialogOpen} onOpenChange={setDeleteReplyDialogOpen}>
        <AlertDialogContent className="bg-[#1a1d23] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">حذف الرد</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              هل أنت متأكد من حذف هذا الرد؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteReply}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// المكون المصمم ليشبه الصورة تماماً
function SuggestionCard({ 
  suggestion, 
  user,
  userProfile, 
  likes, 
  isLiked, 
  onLike, 
  expanded, 
  onToggleExpand,
  showReplyForm,
  onToggleReplyForm,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  submittingReply,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  // خصائص تعديل وحذف الردود
  editingReplyId,
  editReplyContent,
  onEditReplyContentChange,
  onStartEditReply,
  onCancelEditReply,
  onSaveEditReply,
  onDeleteReply
}: any) {
  const authorName = suggestion.profiles?.username || "مستخدم";
  const isSupport = suggestion.profiles?.email === SUPPORT_EMAIL;
  const isOwner = user && user.id === suggestion.user_id;

  return (
    <div className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="shrink-0 pt-2">
          <UnifiedProfileLink userId={suggestion.user_id} className="block hover:opacity-80 transition-opacity">
            <Avatar className="h-12 w-12 border-2 border-[#2a2d35] shadow-xl cursor-pointer">
              <AvatarImage src={suggestion.profiles?.avatar_url ? optimizeImageUrl(suggestion.profiles.avatar_url, 'avatar') : ""} />
              <AvatarFallback className="bg-[#2a2d35]"><User className="h-6 w-6 text-gray-400" /></AvatarFallback>
            </Avatar>
          </UnifiedProfileLink>
        </div>

        {/* Bubble Style Like the Image */}
        <div className="flex-1">
          <div className="bg-[#1a1d23] rounded-[24px] rounded-tr-none p-5 shadow-sm border border-white/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <UnifiedProfileLink userId={suggestion.user_id} className="hover:text-primary transition-colors">
                  <span className="font-bold text-[#e1e1e1] text-[15px] hover:text-primary cursor-pointer">{authorName}</span>
                </UnifiedProfileLink>
                {isSupport && (
                  <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold border border-primary/20">
                    الدعم الفني
                  </span>
                )}
                <span className="text-gray-500 text-[11px] font-medium">
                  {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true, locale: ar })}
                </span>
              </div>

              {/* Owner Actions Menu */}
              {isOwner && !isEditing && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded-full hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100">
                      <MoreVertical className="h-4 w-4 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#1a1d23] border-white/10">
                    <DropdownMenuItem 
                      onClick={onStartEdit}
                      className="text-gray-300 focus:text-white focus:bg-white/10 cursor-pointer"
                    >
                      <Pencil className="h-4 w-4 ml-2" />
                      تعديل
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={onDelete}
                      className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Content or Edit Form */}
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editContent}
                  onChange={(e) => onEditContentChange(e.target.value)}
                  className="min-h-[80px] bg-[#0f1115] border-white/10 focus:border-primary/50 text-gray-200 resize-none rounded-xl text-sm"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancelEdit}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4 ml-1" />
                    إلغاء
                  </Button>
                  <Button
                    size="sm"
                    onClick={onSaveEdit}
                    disabled={!editContent?.trim()}
                    className="rounded-full px-4 bg-primary hover:bg-primary/90"
                  >
                    <Check className="h-4 w-4 ml-1" />
                    حفظ
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[#c5c5c5] text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                {suggestion.content}
              </p>
            )}
          </div>

          {/* Interaction Bar */}
          <div className="flex items-center gap-6 mt-2 px-2">
            <button
              onClick={onLike}
              className={cn(
                "flex items-center gap-1.5 text-[13px] font-bold transition-colors",
                isLiked ? "text-primary" : "text-gray-500 hover:text-gray-300"
              )}
            >
              {isLiked ? <Heart className="h-4 w-4 fill-current" /> : <Heart className="h-4 w-4" />}
              <span>{likes > 0 ? likes : "أعجبني"}</span>
            </button>

            {suggestion.replies?.length > 0 && (
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-[13px] font-bold transition-colors"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span>{suggestion.replies.length} رد</span>
              </button>
            )}

            <button
              onClick={onToggleReplyForm}
              className={cn(
                "flex items-center gap-1.5 text-[13px] font-bold transition-colors",
                showReplyForm ? "text-primary" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <MessageCircle className="h-4 w-4" />
              <span>رد</span>
            </button>
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <div className="mt-4 mr-2 animate-in fade-in slide-in-from-top-2 duration-300">
              {user ? (
                <div className="flex gap-3 items-start">
                  <Avatar className="h-8 w-8 border border-white/5 shrink-0">
                    <AvatarImage src={userProfile?.avatar_url ? optimizeImageUrl(userProfile.avatar_url, 'avatar') : ""} />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      id={`reply-input-${suggestion.id}`}
                      placeholder="اكتب ردك هنا..."
                      value={replyContent}
                      onChange={(e) => onReplyContentChange(e.target.value)}
                      className="min-h-[80px] bg-[#0f1115] border-white/10 focus:border-primary/50 text-gray-200 placeholder:text-gray-600 resize-none rounded-xl text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleReplyForm}
                        className="text-gray-400 hover:text-white"
                      >
                        إلغاء
                      </Button>
                      <Button
                        size="sm"
                        onClick={onSubmitReply}
                        disabled={submittingReply || !replyContent?.trim()}
                        className="rounded-full px-6 bg-primary hover:bg-primary/90"
                      >
                        {submittingReply ? "جاري الإرسال..." : "إرسال"}
                        <Send className="h-3 w-3 mr-1 rotate-180" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 bg-white/5 rounded-xl">
                  <p className="text-gray-500 text-xs mb-2">يجب تسجيل الدخول للرد</p>
                  <Link to="/auth">
                    <Button variant="outline" size="sm" className="rounded-full text-xs border-primary/50 text-primary hover:bg-primary/10">
                      تسجيل الدخول
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Replies Section */}
          {expanded && suggestion.replies?.length > 0 && (
            <div className="mt-4 mr-2 space-y-3 border-r border-white/5 pr-4">
              {suggestion.replies.map((reply: any) => {
                const isReplyOwner = user && user.id === reply.user_id;
                const isEditingThisReply = editingReplyId === reply.id;
                
                return (
                  <div key={reply.id} className="flex gap-3 group/reply">
                    <UnifiedProfileLink userId={reply.user_id} className="shrink-0 hover:opacity-80 transition-opacity">
                      <Avatar className="h-8 w-8 border border-white/5 cursor-pointer">
                        <AvatarImage src={reply.profiles?.avatar_url ? optimizeImageUrl(reply.profiles.avatar_url, 'avatar') : ""} />
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                    </UnifiedProfileLink>
                    <div className="bg-white/5 rounded-2xl p-3 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <UnifiedProfileLink userId={reply.user_id} className="hover:text-primary transition-colors">
                            <span className="text-xs font-bold text-gray-300 hover:text-primary cursor-pointer">{reply.profiles?.username}</span>
                          </UnifiedProfileLink>
                          <span className="text-gray-500 text-[10px]">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ar })}
                          </span>
                        </div>
                        
                        {/* Reply Owner Actions Menu */}
                        {isReplyOwner && !isEditingThisReply && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded-full hover:bg-white/10 transition-colors opacity-0 group-hover/reply:opacity-100">
                                <MoreVertical className="h-3 w-3 text-gray-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1a1d23] border-white/10">
                              <DropdownMenuItem 
                                onClick={() => onStartEditReply(reply)}
                                className="text-gray-300 focus:text-white focus:bg-white/10 cursor-pointer text-xs"
                              >
                                <Pencil className="h-3 w-3 ml-2" />
                                تعديل
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onDeleteReply(reply.id)}
                                className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer text-xs"
                              >
                                <Trash2 className="h-3 w-3 ml-2" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      
                      {/* Reply Content or Edit Form */}
                      {isEditingThisReply ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editReplyContent}
                            onChange={(e) => onEditReplyContentChange(e.target.value)}
                            className="min-h-[60px] bg-[#0f1115] border-white/10 focus:border-primary/50 text-gray-200 resize-none rounded-xl text-xs"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={onCancelEditReply}
                              className="text-gray-400 hover:text-white h-7 text-xs"
                            >
                              <X className="h-3 w-3 ml-1" />
                              إلغاء
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => onSaveEditReply(reply.id)}
                              disabled={!editReplyContent?.trim()}
                              className="rounded-full px-3 bg-primary hover:bg-primary/90 h-7 text-xs"
                            >
                              <Check className="h-3 w-3 ml-1" />
                              حفظ
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">{reply.content}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
