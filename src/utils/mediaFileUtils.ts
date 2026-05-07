
import { supabase } from '@/integrations/supabase/client';

export interface MediaFileInfo {
  id: string;
  file_type: 'cover_image' | 'book_pdf' | 'author_image';
  file_url: string;
  file_size?: number;
  mime_type?: string;
  original_filename?: string;
  metadata?: any;
}

export interface BookMediaFile {
  media_type: string;
  file_url: string;
  file_size: number | null;
  metadata: any;
}

export const createMediaFile = async (mediaInfo: Omit<MediaFileInfo, 'id'>): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('media_files')
      .insert([mediaInfo])
      .select('id')
      .single();

    if (error) {
      console.error('Error creating media file:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Unexpected error creating media file:', error);
    return null;
  }
};

export const linkBookToMedia = async (
  bookId: string, 
  mediaFileId: string, 
  mediaType: 'cover' | 'pdf' | 'thumbnail',
  bookTable: 'books' | 'approved_books' | 'book_submissions' = 'approved_books'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('book_media')
      .insert([{
        book_id: bookId,
        media_file_id: mediaFileId,
        media_type: mediaType,
        book_table: bookTable
      }]);

    if (error) {
      console.error('Error linking book to media:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error linking book to media:', error);
    return false;
  }
};

export const getBookMedia = async (
  bookId: string, 
  bookTable: string = 'approved_books'
): Promise<BookMediaFile[]> => {
  try {
    const { data, error } = await supabase.rpc('get_book_media', {
      p_book_id: bookId,
      p_book_table: bookTable
    });

    if (error) {
      console.error('Error getting book media:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error getting book media:', error);
    return [];
  }
};

export const getCoverImageUrl = (mediaFiles: BookMediaFile[]): string | null => {
  const coverFile = mediaFiles.find(file => file.media_type === 'cover');
  return coverFile?.file_url || null;
};

export const getPdfUrl = (mediaFiles: BookMediaFile[]): string | null => {
  const pdfFile = mediaFiles.find(file => file.media_type === 'pdf');
  return pdfFile?.file_url || null;
};
