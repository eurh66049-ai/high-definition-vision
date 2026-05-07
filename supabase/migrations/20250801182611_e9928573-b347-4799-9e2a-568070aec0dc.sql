-- حذف الدوال القديمة أولاً
DROP FUNCTION IF EXISTS verify_author(uuid, text);
DROP FUNCTION IF EXISTS unverify_author(uuid);
DROP FUNCTION IF EXISTS is_author_verified(uuid);
DROP FUNCTION IF EXISTS is_author_verified_by_name(text);

-- إنشاء الدوال الجديدة
CREATE OR REPLACE FUNCTION verify_author(p_author_id UUID, p_author_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_email TEXT;
    is_admin BOOLEAN := FALSE;
BEGIN
    -- Get current user's email
    current_user_email := auth.jwt() ->> 'email';
    
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM admin_users 
        WHERE email = current_user_email AND is_active = true
    ) INTO is_admin;
    
    -- Check admin permission
    IF NOT is_admin THEN
        RAISE EXCEPTION 'غير مسموح - يجب أن تكون مدير للقيام بهذا الإجراء';
    END IF;
    
    -- Insert or update verification
    INSERT INTO verified_authors (author_id, author_name, verified_by, is_verified)
    VALUES (p_author_id, p_author_name, auth.uid(), true)
    ON CONFLICT (author_id) 
    DO UPDATE SET 
        is_verified = true,
        verified_by = auth.uid(),
        updated_at = now();
    
    RETURN TRUE;
END;
$$;

-- Create function to unverify an author
CREATE OR REPLACE FUNCTION unverify_author(p_author_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_email TEXT;
    is_admin BOOLEAN := FALSE;
BEGIN
    -- Get current user's email
    current_user_email := auth.jwt() ->> 'email';
    
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM admin_users 
        WHERE email = current_user_email AND is_active = true
    ) INTO is_admin;
    
    -- Check admin permission
    IF NOT is_admin THEN
        RAISE EXCEPTION 'غير مسموح - يجب أن تكون مدير للقيام بهذا الإجراء';
    END IF;
    
    -- Delete verification record
    DELETE FROM verified_authors WHERE author_id = p_author_id;
    
    RETURN TRUE;
END;
$$;

-- Create function to check if author is verified
CREATE OR REPLACE FUNCTION is_author_verified(p_author_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM verified_authors 
        WHERE author_id = p_author_id AND is_verified = true
    );
END;
$$;

-- Create function to check if author is verified by name
CREATE OR REPLACE FUNCTION is_author_verified_by_name(p_author_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM verified_authors 
        WHERE author_name = p_author_name AND is_verified = true
    );
END;
$$;