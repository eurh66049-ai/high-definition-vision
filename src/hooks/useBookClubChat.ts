import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useClubDetails } from './useReadingClubs';

export const useBookClubChat = (bookId: string | undefined) => {
  const { user } = useAuth();
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(true);

  useEffect(() => {
    if (!bookId || !user) {
      setSearchLoading(false);
      setActiveClubId(null);
      return;
    }

    const findActiveClub = async () => {
      setSearchLoading(true);
      try {
        console.log('🔍 البحث عن نادي نشط للكتاب:', bookId);
        
        const { data: clubs, error: clubsError } = await supabase
          .from('reading_clubs')
          .select('id')
          .eq('book_id', bookId)
          .eq('status', 'active');

        if (clubsError) {
          console.error('خطأ في جلب النوادي:', clubsError);
          setActiveClubId(null);
          return;
        }

        if (!clubs?.length) {
          console.log('❌ لا توجد نوادي نشطة لهذا الكتاب');
          setActiveClubId(null);
          return;
        }

        const clubIds = clubs.map(c => c.id);
        console.log('📋 نوادي محتملة:', clubIds);

        const { data: membership, error: memError } = await supabase
          .from('reading_club_members')
          .select('club_id')
          .eq('user_id', user.id)
          .in('club_id', clubIds)
          .limit(1);

        if (memError) {
          console.error('خطأ في جلب العضوية:', memError);
          setActiveClubId(null);
          return;
        }

        const foundClubId = membership?.[0]?.club_id || null;
        console.log('✅ نادي نشط:', foundClubId);
        setActiveClubId(foundClubId);
      } catch (error) {
        console.error('Error finding active club:', error);
        setActiveClubId(null);
      } finally {
        setSearchLoading(false);
      }
    };

    findActiveClub();
  }, [bookId, user?.id]);

  const clubDetails = useClubDetails(activeClubId || '');

  return {
    activeClubId,
    loading: searchLoading || clubDetails.loading,
    hasActiveClub: !!activeClubId && clubDetails.isMember,
    ...clubDetails
  };
};
