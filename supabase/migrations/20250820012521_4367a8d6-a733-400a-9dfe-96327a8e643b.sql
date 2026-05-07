-- إنشاء دالة لإصلاح بيانات المؤلفين المرفوعة بواسطة حساب الأدمن
CREATE OR REPLACE FUNCTION fix_admin_uploaded_authors_data()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_email TEXT := 'adilelbourachdi397@gmail.com';
  admin_user_id UUID;
  book_record RECORD;
  author_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- البحث عن معرف المستخدم الأدمن
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RETURN 'لم يتم العثور على حساب الأدمن: ' || admin_email;
  END IF;
  
  -- المرور عبر جميع الكتب المرفوعة بواسطة الأدمن
  FOR book_record IN 
    SELECT DISTINCT author, author_bio, author_image_url
    FROM public.book_submissions
    WHERE user_id = admin_user_id 
      AND status = 'approved'
      AND author IS NOT NULL
  LOOP
    -- التحقق من وجود المؤلف في جدول authors
    SELECT * INTO author_record
    FROM public.authors
    WHERE name = book_record.author;
    
    IF author_record IS NULL THEN
      -- إنشاء مؤلف جديد بالبيانات الصحيحة من الكتاب
      INSERT INTO public.authors (
        name,
        bio,
        avatar_url,
        slug,
        books_count,
        followers_count
      ) VALUES (
        book_record.author,
        book_record.author_bio,
        book_record.author_image_url,
        public.generate_author_slug(book_record.author),
        1,
        0
      );
      
      updated_count := updated_count + 1;
      
    ELSE
      -- تحديث بيانات المؤلف الموجود إذا كانت البيانات من الكتاب أفضل
      UPDATE public.authors 
      SET 
        bio = CASE 
          WHEN (authors.bio IS NULL OR authors.bio = '') 
               AND book_record.author_bio IS NOT NULL 
               AND book_record.author_bio != ''
          THEN book_record.author_bio
          ELSE authors.bio
        END,
        avatar_url = CASE 
          WHEN (authors.avatar_url IS NULL OR authors.avatar_url = '') 
               AND book_record.author_image_url IS NOT NULL 
               AND book_record.author_image_url != ''
          THEN book_record.author_image_url
          ELSE authors.avatar_url
        END,
        books_count = (
          SELECT COUNT(*)
          FROM public.book_submissions
          WHERE author = book_record.author 
            AND status = 'approved'
        )
      WHERE name = book_record.author;
      
      IF FOUND THEN
        updated_count := updated_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN 'تم إصلاح بيانات ' || updated_count || ' مؤلف بنجاح';
  
EXCEPTION WHEN OTHERS THEN
  RETURN 'خطأ في إصلاح البيانات: ' || SQLERRM;
END;
$$;