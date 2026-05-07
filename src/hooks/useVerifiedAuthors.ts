import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sendAuthorVerificationEmail, formatVerificationDate } from '@/utils/authorVerificationEmailService';

interface VerifiedAuthor {
  id: string;
  author_id: string;
  author_name: string;
  verified_by: string | null;
  verified_at: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthorCandidate {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  books_count: number;
  followers_count: number;
  is_verified?: boolean;
}

export const useVerifiedAuthors = () => {
  const [verifiedAuthors, setVerifiedAuthors] = useState<VerifiedAuthor[]>([]);
  const [authorCandidates, setAuthorCandidates] = useState<AuthorCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchVerifiedAuthors = async () => {
    try {
      const { data, error } = await supabase
        .from('verified_authors')
        .select('*')
        .order('verified_at', { ascending: false });

      if (error) throw error;
      setVerifiedAuthors(data || []);
    } catch (error) {
      console.error('Error fetching verified authors:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب المؤلفين الموثقين",
        variant: "destructive",
      });
    }
  };

  const fetchAuthorCandidates = async () => {
    try {
      const { data: authors, error } = await supabase
        .from('authors')
        .select('*')
        .order('books_count', { ascending: false })
        .order('followers_count', { ascending: false });

      if (error) throw error;

      // Check verification status for each author
      const authorsWithVerification = await Promise.all(
        (authors || []).map(async (author) => {
          const { data: verificationData } = await supabase
            .from('verified_authors')
            .select('is_verified')
            .eq('author_id', author.id)
            .single();

          return {
            ...author,
            is_verified: verificationData?.is_verified || false
          };
        })
      );

      setAuthorCandidates(authorsWithVerification);
    } catch (error) {
      console.error('Error fetching author candidates:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب قائمة المؤلفين",
        variant: "destructive",
      });
    }
  };

  const verifyAuthor = async (authorId: string, authorName: string) => {
    setActionLoading(authorId);
    try {
      console.log('🔍 بدء عملية توثيق المؤلف:', { authorId, authorName });
      console.log('🔧 التحقق من معرف المؤلف والاسم:', { authorId, authorName });
      
      // First get the author's email from the database
      const { data: authorData, error: authorError } = await supabase
        .from('authors')
        .select('email, user_id, name')
        .eq('id', authorId)
        .single();

      console.log('📊 بيانات المؤلف من جدول authors:', { authorData, authorError });

      if (authorError) {
        console.error('❌ خطأ في جلب بيانات المؤلف:', authorError);
        throw new Error(`فشل في جلب بيانات المؤلف: ${authorError.message}`);
      }

      let authorEmail = authorData?.email;
      console.log('📧 البريد الإلكتروني من جدول authors:', authorEmail);

      // If no email in authors table, try to get it from profiles table
      if (!authorEmail && authorData?.user_id) {
        console.log('🔍 البحث عن البريد في جدول profiles للمستخدم:', authorData.user_id);
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email, username')
          .eq('id', authorData.user_id)
          .single();
        
        console.log('👤 بيانات المستخدم من جدول profiles:', { profileData, profileError });
        authorEmail = profileData?.email;
      }

      console.log('✅ البريد الإلكتروني النهائي المستخدم:', authorEmail);

      if (!authorEmail) {
        console.error('❌ لم يتم العثور على بريد إلكتروني للمؤلف:', authorName);
        toast({
          title: "تحذير",
          description: `لم يتم العثور على بريد إلكتروني للمؤلف ${authorName}. لن يتم إرسال رسالة التوثيق.`,
          variant: "destructive",
        });
      }

      const { data, error } = await supabase.rpc('verify_author', {
        p_author_id: authorId,
        p_author_name: authorName
      });

      if (error) throw error;

      // Send email notification only if we have an email
      if (authorEmail) {
        console.log('📧 محاولة إرسال بريد التوثيق إلى:', authorEmail);
        
        const emailData = {
          user_name: authorName,
          user_email: authorEmail,
          author_name: authorName,
          verification_date: formatVerificationDate()
        };
        
        console.log('📝 بيانات البريد الإلكتروني:', emailData);
        
        const emailResult = await sendAuthorVerificationEmail(emailData);
        
        console.log('📨 نتيجة إرسال البريد:', emailResult);

        if (emailResult) {
          toast({
            title: "تم إرسال رسالة التوثيق",
            description: `تم إرسال رسالة التوثيق إلى ${authorEmail}`,
            variant: "default",
          });
        } else {
          console.error('❌ فشل في إرسال بريد التوثيق للمؤلف:', authorName);
          toast({
            title: "فشل في إرسال الرسالة",
            description: `فشل في إرسال رسالة التوثيق إلى ${authorEmail}. يرجى المحاولة مرة أخرى.`,
            variant: "destructive",
          });
        }
      } else {
        console.warn('⚠️ لا يمكن إرسال بريد التوثيق - لم يتم العثور على بريد إلكتروني للمؤلف:', authorName);
      }

      toast({
        title: "تم التوثيق بنجاح",
        description: `تم توثيق المؤلف ${authorName}`,
        variant: "default",
      });

      // Refresh data
      await Promise.all([fetchVerifiedAuthors(), fetchAuthorCandidates()]);
    } catch (error: any) {
      console.error('Error verifying author:', error);
      toast({
        title: "خطأ في التوثيق",
        description: error.message || "فشل في توثيق المؤلف",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const unverifyAuthor = async (authorId: string, authorName: string) => {
    setActionLoading(authorId);
    try {
      const { data, error } = await supabase.rpc('unverify_author', {
        p_author_id: authorId
      });

      if (error) throw error;

      toast({
        title: "تم إلغاء التوثيق",
        description: `تم إلغاء توثيق المؤلف ${authorName}`,
        variant: "default",
      });

      // Refresh data
      await Promise.all([fetchVerifiedAuthors(), fetchAuthorCandidates()]);
    } catch (error: any) {
      console.error('Error unverifying author:', error);
      toast({
        title: "خطأ في إلغاء التوثيق",
        description: error.message || "فشل في إلغاء توثيق المؤلف",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const checkAuthorVerification = async (authorId: string) => {
    try {
      const { data, error } = await supabase.rpc('is_author_verified', {
        p_author_id: authorId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking author verification:', error);
      return false;
    }
  };

  const checkAuthorVerificationByName = async (authorName: string) => {
    try {
      const { data, error } = await supabase.rpc('is_author_verified_by_name', {
        p_author_name: authorName
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking author verification by name:', error);
      return false;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchVerifiedAuthors(), fetchAuthorCandidates()]);
      setLoading(false);
    };

    fetchData();
  }, []);

  return {
    verifiedAuthors,
    authorCandidates,
    loading,
    actionLoading,
    verifyAuthor,
    unverifyAuthor,
    checkAuthorVerification,
    checkAuthorVerificationByName,
    refetch: () => Promise.all([fetchVerifiedAuthors(), fetchAuthorCandidates()])
  };
};