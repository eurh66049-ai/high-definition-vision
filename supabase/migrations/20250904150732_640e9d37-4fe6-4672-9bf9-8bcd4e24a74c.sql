-- حذف جميع بيانات التحديات للبدء من جديد

-- حذف جميع أنشطة التحديات والنقاط
DELETE FROM public.challenge_activities;

-- حذف جميع توزيعات الجوائز
DELETE FROM public.challenge_reward_distributions;

-- حذف جميع المشتركين في التحديات
DELETE FROM public.challenge_participants;

-- إعادة تعيين عدد المشتركين في جدول التحديات إلى الصفر
UPDATE public.challenges SET current_participants = 0;