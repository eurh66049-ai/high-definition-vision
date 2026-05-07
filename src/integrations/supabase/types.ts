export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_bot_accounts: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          personality: string
          profile_id: string
          review_style: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          personality?: string
          profile_id: string
          review_style?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          personality?: string
          profile_id?: string
          review_style?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_bot_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_bot_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_bot_book_activity_log: {
        Row: {
          action_type: string
          book_id: string
          bot_id: string
          created_at: string
          error_message: string | null
          id: string
          rating: number | null
          sentiment: string | null
          status: string
        }
        Insert: {
          action_type: string
          book_id: string
          bot_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          rating?: number | null
          sentiment?: string | null
          status?: string
        }
        Update: {
          action_type?: string
          book_id?: string
          bot_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          rating?: number | null
          sentiment?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_bot_book_activity_log_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "ai_bot_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_quote_generation_log: {
        Row: {
          book_id: string
          error_message: string | null
          generated_at: string
          id: string
          quotes_generated: number
          status: string
        }
        Insert: {
          book_id: string
          error_message?: string | null
          generated_at?: string
          id?: string
          quotes_generated?: number
          status?: string
        }
        Update: {
          book_id?: string
          error_message?: string | null
          generated_at?: string
          id?: string
          quotes_generated?: number
          status?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          books: Json | null
          created_at: string
          id: string
          is_bot: boolean
          message_text: string
          user_id: string
        }
        Insert: {
          books?: Json | null
          created_at?: string
          id?: string
          is_bot?: boolean
          message_text: string
          user_id: string
        }
        Update: {
          books?: Json | null
          created_at?: string
          id?: string
          is_bot?: boolean
          message_text?: string
          user_id?: string
        }
        Relationships: []
      }
      author_followers: {
        Row: {
          author_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "author_followers_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_followers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_followers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      authors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          books_count: number | null
          country_code: string | null
          country_name: string | null
          created_at: string
          email: string | null
          followers_count: number | null
          id: string
          name: string
          slug: string | null
          social_links: Json | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          books_count?: number | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          email?: string | null
          followers_count?: number | null
          id?: string
          name: string
          slug?: string | null
          social_links?: Json | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          books_count?: number | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          email?: string | null
          followers_count?: number | null
          id?: string
          name?: string
          slug?: string | null
          social_links?: Json | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_discover_config: {
        Row: {
          batch_size: number
          created_at: string
          cursor: string | null
          enabled: boolean
          id: number
          last_error: string | null
          last_run_at: string | null
          last_status: string | null
          min_pending_threshold: number
          search_query: string
          total_discovered: number
          updated_at: string
        }
        Insert: {
          batch_size?: number
          created_at?: string
          cursor?: string | null
          enabled?: boolean
          id?: number
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          min_pending_threshold?: number
          search_query?: string
          total_discovered?: number
          updated_at?: string
        }
        Update: {
          batch_size?: number
          created_at?: string
          cursor?: string | null
          enabled?: boolean
          id?: number
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          min_pending_threshold?: number
          search_query?: string
          total_discovered?: number
          updated_at?: string
        }
        Relationships: []
      }
      banned_users: {
        Row: {
          ban_type: string
          banned_at: string | null
          banned_by: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          reason: string
          user_id: string
        }
        Insert: {
          ban_type?: string
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason: string
          user_id: string
        }
        Update: {
          ban_type?: string
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      banned_words: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          language: string | null
          severity: string
          word: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          severity?: string
          word: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          severity?: string
          word?: string
        }
        Relationships: []
      }
      book_dislikes: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      book_extracted_text: {
        Row: {
          book_id: string | null
          created_at: string
          extracted_text: string | null
          extraction_error: string | null
          extraction_status: string | null
          file_hash: string | null
          id: string
          text_length: number | null
          updated_at: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          extracted_text?: string | null
          extraction_error?: string | null
          extraction_status?: string | null
          file_hash?: string | null
          id?: string
          text_length?: number | null
          updated_at?: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          extracted_text?: string | null
          extraction_error?: string | null
          extraction_status?: string | null
          file_hash?: string | null
          id?: string
          text_length?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      book_highlights: {
        Row: {
          book_id: string
          created_at: string
          end_offset: number
          highlight_color: string
          highlight_text: string
          id: string
          page_number: number
          start_offset: number
          text_layer_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          end_offset?: number
          highlight_color?: string
          highlight_text: string
          id?: string
          page_number: number
          start_offset?: number
          text_layer_index?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          end_offset?: number
          highlight_color?: string
          highlight_text?: string
          id?: string
          page_number?: number
          start_offset?: number
          text_layer_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      book_likes: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      book_media: {
        Row: {
          book_id: string
          book_table: string
          created_at: string
          id: string
          media_file_id: string
          media_type: string
        }
        Insert: {
          book_id: string
          book_table: string
          created_at?: string
          id?: string
          media_file_id: string
          media_type: string
        }
        Update: {
          book_id?: string
          book_table?: string
          created_at?: string
          id?: string
          media_file_id?: string
          media_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_media_media_file_id_fkey"
            columns: ["media_file_id"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
        ]
      }
      book_news: {
        Row: {
          author_name: string | null
          book_name: string | null
          created_at: string | null
          id: string
          image_url: string | null
          is_published: boolean | null
          news_type: string | null
          published_at: string | null
          source_name: string | null
          source_url: string | null
          summary: string | null
          title: string
        }
        Insert: {
          author_name?: string | null
          book_name?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          news_type?: string | null
          published_at?: string | null
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          author_name?: string | null
          book_name?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          news_type?: string | null
          published_at?: string | null
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      book_recommendations: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      book_reviews: {
        Row: {
          book_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          recommend: boolean | null
          user_id: string
        }
        Insert: {
          book_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          recommend?: boolean | null
          user_id: string
        }
        Update: {
          book_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          recommend?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_book_reviews_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_book_reviews_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      book_stats: {
        Row: {
          book_id: string
          created_at: string | null
          downloads: number | null
          rating: number | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          book_id: string
          created_at?: string | null
          downloads?: number | null
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string | null
          downloads?: number | null
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_stats_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "approved_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_stats_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "approved_books_covers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_stats_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "book_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_stats_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "public_books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_submissions: {
        Row: {
          author: string
          author_bio: string | null
          author_country_code: string | null
          author_country_name: string | null
          author_image_url: string | null
          author_social_facebook: string | null
          author_social_instagram: string | null
          author_social_linkedin: string | null
          author_social_tiktok: string | null
          author_social_twitter: string | null
          author_social_whatsapp: string | null
          author_social_youtube: string | null
          author_website: string | null
          book_file_type: string | null
          book_file_url: string | null
          category: string
          chunks_total: number | null
          chunks_uploaded: number | null
          cover_image_url: string | null
          created_at: string
          description: string
          device_type: string | null
          display_type: string
          edit_requested_at: string | null
          estimated_time_remaining: number | null
          file_metadata: Json | null
          file_size: number | null
          file_type: string | null
          id: string
          is_edit_request: boolean | null
          language: string
          mobile_upload: boolean | null
          original_book_id: string | null
          original_rating: number | null
          original_views: number | null
          page_count: number | null
          previous_status: string | null
          processing_status: string | null
          publication_year: number | null
          publisher: string | null
          rating: number | null
          reviewed_at: string | null
          reviewer_notes: string | null
          rights_confirmation: boolean | null
          slug: string | null
          source_book_file_url: string | null
          source_cover_image_url: string | null
          status: string
          subtitle: string | null
          title: string
          translator: string | null
          upload_end_time: string | null
          upload_error_message: string | null
          upload_method: string | null
          upload_progress: number | null
          upload_speed_mbps: number | null
          upload_start_time: string | null
          upload_status: string | null
          user_email: string | null
          user_id: string | null
          views: number | null
        }
        Insert: {
          author: string
          author_bio?: string | null
          author_country_code?: string | null
          author_country_name?: string | null
          author_image_url?: string | null
          author_social_facebook?: string | null
          author_social_instagram?: string | null
          author_social_linkedin?: string | null
          author_social_tiktok?: string | null
          author_social_twitter?: string | null
          author_social_whatsapp?: string | null
          author_social_youtube?: string | null
          author_website?: string | null
          book_file_type?: string | null
          book_file_url?: string | null
          category: string
          chunks_total?: number | null
          chunks_uploaded?: number | null
          cover_image_url?: string | null
          created_at?: string
          description: string
          device_type?: string | null
          display_type: string
          edit_requested_at?: string | null
          estimated_time_remaining?: number | null
          file_metadata?: Json | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_edit_request?: boolean | null
          language: string
          mobile_upload?: boolean | null
          original_book_id?: string | null
          original_rating?: number | null
          original_views?: number | null
          page_count?: number | null
          previous_status?: string | null
          processing_status?: string | null
          publication_year?: number | null
          publisher?: string | null
          rating?: number | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          rights_confirmation?: boolean | null
          slug?: string | null
          source_book_file_url?: string | null
          source_cover_image_url?: string | null
          status?: string
          subtitle?: string | null
          title: string
          translator?: string | null
          upload_end_time?: string | null
          upload_error_message?: string | null
          upload_method?: string | null
          upload_progress?: number | null
          upload_speed_mbps?: number | null
          upload_start_time?: string | null
          upload_status?: string | null
          user_email?: string | null
          user_id?: string | null
          views?: number | null
        }
        Update: {
          author?: string
          author_bio?: string | null
          author_country_code?: string | null
          author_country_name?: string | null
          author_image_url?: string | null
          author_social_facebook?: string | null
          author_social_instagram?: string | null
          author_social_linkedin?: string | null
          author_social_tiktok?: string | null
          author_social_twitter?: string | null
          author_social_whatsapp?: string | null
          author_social_youtube?: string | null
          author_website?: string | null
          book_file_type?: string | null
          book_file_url?: string | null
          category?: string
          chunks_total?: number | null
          chunks_uploaded?: number | null
          cover_image_url?: string | null
          created_at?: string
          description?: string
          device_type?: string | null
          display_type?: string
          edit_requested_at?: string | null
          estimated_time_remaining?: number | null
          file_metadata?: Json | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_edit_request?: boolean | null
          language?: string
          mobile_upload?: boolean | null
          original_book_id?: string | null
          original_rating?: number | null
          original_views?: number | null
          page_count?: number | null
          previous_status?: string | null
          processing_status?: string | null
          publication_year?: number | null
          publisher?: string | null
          rating?: number | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          rights_confirmation?: boolean | null
          slug?: string | null
          source_book_file_url?: string | null
          source_cover_image_url?: string | null
          status?: string
          subtitle?: string | null
          title?: string
          translator?: string | null
          upload_end_time?: string | null
          upload_error_message?: string | null
          upload_method?: string | null
          upload_progress?: number | null
          upload_speed_mbps?: number | null
          upload_start_time?: string | null
          upload_status?: string | null
          user_email?: string | null
          user_id?: string | null
          views?: number | null
        }
        Relationships: []
      }
      books: {
        Row: {
          author: string
          category: string
          cover_url_key: string | null
          created_at: string
          description: string | null
          downloads: number | null
          id: string
          is_free: boolean | null
          pdf_url: string
          rating: number | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          author: string
          category: string
          cover_url_key?: string | null
          created_at?: string
          description?: string | null
          downloads?: number | null
          id?: string
          is_free?: boolean | null
          pdf_url: string
          rating?: number | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          author?: string
          category?: string
          cover_url_key?: string | null
          created_at?: string
          description?: string | null
          downloads?: number | null
          id?: string
          is_free?: boolean | null
          pdf_url?: string
          rating?: number | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      books_cache: {
        Row: {
          cached_books: Json
          created_at: string
          displayed_books_count: number | null
          filters_state: Json | null
          id: string
          last_accessed: string | null
          page_identifier: string | null
          page_type: string
          session_id: string
          total_books_count: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cached_books?: Json
          created_at?: string
          displayed_books_count?: number | null
          filters_state?: Json | null
          id?: string
          last_accessed?: string | null
          page_identifier?: string | null
          page_type: string
          session_id: string
          total_books_count?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cached_books?: Json
          created_at?: string
          displayed_books_count?: number | null
          filters_state?: Json | null
          id?: string
          last_accessed?: string | null
          page_identifier?: string | null
          page_type?: string
          session_id?: string
          total_books_count?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bulk_upload_queue: {
        Row: {
          attempts: number
          batch_label: string | null
          book_file_url: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          error: string | null
          finished_at: string | null
          id: string
          max_attempts: number
          page_count: number | null
          result_book_id: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          batch_label?: string | null
          book_file_url: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          max_attempts?: number
          page_count?: number | null
          result_book_id?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          batch_label?: string | null
          book_file_url?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          max_attempts?: number
          page_count?: number | null
          result_book_id?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      canonical_urls: {
        Row: {
          canonical_url: string
          created_at: string | null
          id: string
          original_url: string
          page_type: string
        }
        Insert: {
          canonical_url: string
          created_at?: string | null
          id?: string
          original_url: string
          page_type: string
        }
        Update: {
          canonical_url?: string
          created_at?: string | null
          id?: string
          original_url?: string
          page_type?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      challenge_activities: {
        Row: {
          activity_data: Json | null
          activity_type: string
          challenge_id: string | null
          created_at: string | null
          id: string
          points: number | null
          user_id: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          challenge_id?: string | null
          created_at?: string | null
          id?: string
          points?: number | null
          user_id?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          challenge_id?: string | null
          created_at?: string | null
          id?: string
          points?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_activities_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          achievements: Json | null
          challenge_id: string | null
          current_score: number | null
          id: string
          is_active: boolean | null
          joined_at: string | null
          user_id: string | null
        }
        Insert: {
          achievements?: Json | null
          challenge_id?: string | null
          current_score?: number | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievements?: Json | null
          challenge_id?: string | null
          current_score?: number | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_reward_distributions: {
        Row: {
          book_reads_added: number | null
          challenge_id: string | null
          created_at: string | null
          distributed_at: string | null
          followers_added: number | null
          id: string
          reward_id: string | null
          selected_book_id: string | null
          user_id: string
          user_position: number
        }
        Insert: {
          book_reads_added?: number | null
          challenge_id?: string | null
          created_at?: string | null
          distributed_at?: string | null
          followers_added?: number | null
          id?: string
          reward_id?: string | null
          selected_book_id?: string | null
          user_id: string
          user_position: number
        }
        Update: {
          book_reads_added?: number | null
          challenge_id?: string | null
          created_at?: string | null
          distributed_at?: string | null
          followers_added?: number | null
          id?: string
          reward_id?: string | null
          selected_book_id?: string | null
          user_id?: string
          user_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_reward_distributions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_reward_distributions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "challenge_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_rewards: {
        Row: {
          book_reads_count: number | null
          challenge_id: string | null
          created_at: string | null
          followers_count: number | null
          id: string
          position: number
          reward_description: string | null
          reward_title: string
          reward_type: string | null
          reward_value: string | null
        }
        Insert: {
          book_reads_count?: number | null
          challenge_id?: string | null
          created_at?: string | null
          followers_count?: number | null
          id?: string
          position: number
          reward_description?: string | null
          reward_title: string
          reward_type?: string | null
          reward_value?: string | null
        }
        Update: {
          book_reads_count?: number | null
          challenge_id?: string | null
          created_at?: string | null
          followers_count?: number | null
          id?: string
          position?: number
          reward_description?: string | null
          reward_title?: string
          reward_type?: string | null
          reward_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_rewards_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenge_type: Database["public"]["Enums"]["challenge_type"]
          created_at: string | null
          created_by: string | null
          current_participants: number | null
          description: string
          end_date: string
          id: string
          max_participants: number | null
          prize_description: string | null
          rules: Json | null
          start_date: string
          status: Database["public"]["Enums"]["challenge_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          challenge_type: Database["public"]["Enums"]["challenge_type"]
          created_at?: string | null
          created_by?: string | null
          current_participants?: number | null
          description: string
          end_date: string
          id?: string
          max_participants?: number | null
          prize_description?: string | null
          rules?: Json | null
          start_date: string
          status?: Database["public"]["Enums"]["challenge_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          challenge_type?: Database["public"]["Enums"]["challenge_type"]
          created_at?: string | null
          created_by?: string | null
          current_participants?: number | null
          description?: string
          end_date?: string
          id?: string
          max_participants?: number | null
          prize_description?: string | null
          rules?: Json | null
          start_date?: string
          status?: Database["public"]["Enums"]["challenge_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_approved: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_message_reads: {
        Row: {
          created_at: string
          id: string
          message_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_date?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_messages: {
        Row: {
          created_at: string
          date: string
          day_name: string
          id: string
          message: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          day_name: string
          id?: string
          message: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          day_name?: string
          id?: string
          message?: string
          updated_at?: string
        }
        Relationships: []
      }
      deleted_files_backup: {
        Row: {
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          file_type: string
          id: string
          original_book_id: string
          original_file_url: string | null
        }
        Insert: {
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          file_type: string
          id?: string
          original_book_id: string
          original_file_url?: string | null
        }
        Update: {
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          file_type?: string
          id?: string
          original_book_id?: string
          original_file_url?: string | null
        }
        Relationships: []
      }
      dynamic_sitemap: {
        Row: {
          changefreq: string | null
          created_at: string | null
          entity_id: string | null
          id: string
          lastmod: string | null
          page_type: string
          priority: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          changefreq?: string | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          lastmod?: string | null
          page_type: string
          priority?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          changefreq?: string | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          lastmod?: string | null
          page_type?: string
          priority?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      file_cleanup_log: {
        Row: {
          author_image_url: string | null
          book_file_url: string | null
          cleaned_at: string
          cover_image_url: string | null
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          author_image_url?: string | null
          book_file_url?: string | null
          cleaned_at?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          author_image_url?: string | null
          book_file_url?: string | null
          cleaned_at?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      leaderboard_rank_points: {
        Row: {
          created_at: string
          points: number
          rank: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          points: number
          rank: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          points?: number
          rank?: number
          updated_at?: string
        }
        Relationships: []
      }
      leaderboard_settings: {
        Row: {
          created_at: string
          id: number
          season_started_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: number
          season_started_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          season_started_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_files: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          metadata: Json | null
          mime_type: string | null
          original_filename: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          original_filename?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          original_filename?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      message_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          receiver_id: string
          responded_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_id: string
          responded_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_duration_ms: number | null
          audio_mime_type: string | null
          audio_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          sender_id: string
          transcript: string | null
        }
        Insert: {
          audio_duration_ms?: number | null
          audio_mime_type?: string | null
          audio_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          sender_id: string
          transcript?: string | null
        }
        Update: {
          audio_duration_ms?: number | null
          audio_mime_type?: string | null
          audio_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          sender_id?: string
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      missing_files_log: {
        Row: {
          book_id: string
          error_message: string | null
          file_type: string
          file_url: string
          id: string
          reported_at: string | null
          status: string | null
        }
        Insert: {
          book_id: string
          error_message?: string | null
          file_type: string
          file_url: string
          id?: string
          reported_at?: string | null
          status?: string | null
        }
        Update: {
          book_id?: string
          error_message?: string | null
          file_type?: string
          file_url?: string
          id?: string
          reported_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      monthly_report_log: {
        Row: {
          id: string
          report_month: number
          report_year: number
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          report_month: number
          report_year: number
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          report_month?: number
          report_year?: number
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      navigation_direction: {
        Row: {
          created_at: string
          direction: string | null
          from_path: string | null
          id: string
          session_id: string
          to_path: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          direction?: string | null
          from_path?: string | null
          id?: string
          session_id: string
          to_path?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          direction?: string | null
          from_path?: string | null
          id?: string
          session_id?: string
          to_path?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      navigation_history: {
        Row: {
          created_at: string
          id: string
          page_data: Json | null
          path: string
          scroll_position: number | null
          session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page_data?: Json | null
          path: string
          scroll_position?: number | null
          session_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page_data?: Json | null
          path?: string
          scroll_position?: number | null
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          book_author: string | null
          book_category: string | null
          book_submission_id: string | null
          book_title: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read: boolean | null
          target_url: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          book_author?: string | null
          book_category?: string | null
          book_submission_id?: string | null
          book_title?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read?: boolean | null
          target_url?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          book_author?: string | null
          book_category?: string | null
          book_submission_id?: string | null
          book_title?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read?: boolean | null
          target_url?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_state_cache: {
        Row: {
          cache_key: string
          created_at: string
          data_payload: Json
          expires_at: string
          id: string
          page_path: string
          scroll_position: number | null
          session_id: string
          timestamp: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string
          data_payload: Json
          expires_at: string
          id?: string
          page_path: string
          scroll_position?: number | null
          session_id: string
          timestamp: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string
          data_payload?: Json
          expires_at?: string
          id?: string
          page_path?: string
          scroll_position?: number | null
          session_id?: string
          timestamp?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allow_messaging: boolean | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          country_code: string | null
          country_name: string | null
          created_at: string
          email: string | null
          followers_count: number | null
          following_count: number | null
          gender: string | null
          id: string
          is_ai_bot: boolean
          is_verified: boolean | null
          last_seen: string | null
          points: number | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_tiktok: string | null
          social_twitter: string | null
          social_whatsapp: string | null
          social_youtube: string | null
          username: string
          website: string | null
        }
        Insert: {
          allow_messaging?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          email?: string | null
          followers_count?: number | null
          following_count?: number | null
          gender?: string | null
          id: string
          is_ai_bot?: boolean
          is_verified?: boolean | null
          last_seen?: string | null
          points?: number | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_whatsapp?: string | null
          social_youtube?: string | null
          username: string
          website?: string | null
        }
        Update: {
          allow_messaging?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          email?: string | null
          followers_count?: number | null
          following_count?: number | null
          gender?: string | null
          id?: string
          is_ai_bot?: boolean
          is_verified?: boolean | null
          last_seen?: string | null
          points?: number | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_whatsapp?: string | null
          social_youtube?: string | null
          username?: string
          website?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quote_likes: {
        Row: {
          created_at: string
          id: string
          quote_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quote_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quote_id?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_replies: {
        Row: {
          created_at: string
          id: string
          parent_reply_id: string | null
          quote_id: string
          reply_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_reply_id?: string | null
          quote_id: string
          reply_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_reply_id?: string | null
          quote_id?: string
          reply_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "quote_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_replies_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          author_name: string
          book_author: string | null
          book_category: string | null
          book_cover_url: string | null
          book_id: string | null
          book_slug: string | null
          book_title: string
          created_at: string
          id: string
          is_public: boolean | null
          page_number: number | null
          quote_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name: string
          book_author?: string | null
          book_category?: string | null
          book_cover_url?: string | null
          book_id?: string | null
          book_slug?: string | null
          book_title: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          page_number?: number | null
          quote_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          book_author?: string | null
          book_category?: string | null
          book_cover_url?: string | null
          book_id?: string | null
          book_slug?: string | null
          book_title?: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          page_number?: number | null
          quote_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "approved_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "approved_books_covers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "book_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "public_books"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_assistant_messages: {
        Row: {
          book_id: string
          created_at: string
          id: string
          is_bot: boolean
          message_text: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          is_bot?: boolean
          message_text: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          is_bot?: boolean
          message_text?: string
          user_id?: string
        }
        Relationships: []
      }
      reader_fingerprints: {
        Row: {
          book_id: string
          created_at: string
          hint_message: string | null
          hint_type: string | null
          id: string
          page_number: number
          paragraph_index: number | null
          pause_count: number | null
          reread_count: number | null
          slow_read_count: number | null
          total_readers: number | null
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          hint_message?: string | null
          hint_type?: string | null
          id?: string
          page_number: number
          paragraph_index?: number | null
          pause_count?: number | null
          reread_count?: number | null
          slow_read_count?: number | null
          total_readers?: number | null
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          hint_message?: string | null
          hint_type?: string | null
          id?: string
          page_number?: number
          paragraph_index?: number | null
          pause_count?: number | null
          reread_count?: number | null
          slow_read_count?: number | null
          total_readers?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      reading_club_members: {
        Row: {
          club_id: string
          current_page: number | null
          id: string
          joined_at: string
          last_active_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          club_id: string
          current_page?: number | null
          id?: string
          joined_at?: string
          last_active_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          club_id?: string
          current_page?: number | null
          id?: string
          joined_at?: string
          last_active_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "reading_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_club_messages: {
        Row: {
          club_id: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          page_reference: number | null
          user_id: string
        }
        Insert: {
          club_id: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          page_reference?: number | null
          user_id: string
        }
        Update: {
          club_id?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          page_reference?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_club_messages_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "reading_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_clubs: {
        Row: {
          book_author: string | null
          book_cover_url: string | null
          book_id: string
          book_title: string
          created_at: string
          created_by: string
          current_members: number | null
          current_page: number | null
          description: string | null
          end_date: string | null
          id: string
          is_public: boolean | null
          max_members: number | null
          name: string
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          book_author?: string | null
          book_cover_url?: string | null
          book_id: string
          book_title: string
          created_at?: string
          created_by: string
          current_members?: number | null
          current_page?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_public?: boolean | null
          max_members?: number | null
          name: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          book_author?: string | null
          book_cover_url?: string | null
          book_id?: string
          book_title?: string
          created_at?: string
          created_by?: string
          current_members?: number | null
          current_page?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_public?: boolean | null
          max_members?: number | null
          name?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reading_history: {
        Row: {
          book_author: string | null
          book_cover_url: string | null
          book_id: string
          book_title: string
          completed_at: string | null
          created_at: string
          current_page: number
          id: string
          is_completed: boolean
          last_read_at: string
          progress_percentage: number | null
          reading_time_minutes: number
          started_at: string
          total_pages: number
          updated_at: string
          user_id: string
        }
        Insert: {
          book_author?: string | null
          book_cover_url?: string | null
          book_id: string
          book_title: string
          completed_at?: string | null
          created_at?: string
          current_page?: number
          id?: string
          is_completed?: boolean
          last_read_at?: string
          progress_percentage?: number | null
          reading_time_minutes?: number
          started_at?: string
          total_pages: number
          updated_at?: string
          user_id: string
        }
        Update: {
          book_author?: string | null
          book_cover_url?: string | null
          book_id?: string
          book_title?: string
          completed_at?: string | null
          created_at?: string
          current_page?: number
          id?: string
          is_completed?: boolean
          last_read_at?: string
          progress_percentage?: number | null
          reading_time_minutes?: number
          started_at?: string
          total_pages?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          book_id: string
          created_at: string
          current_page: number | null
          id: string
          last_read_at: string | null
          progress_percentage: number | null
          total_pages: number | null
          user_id: string | null
        }
        Insert: {
          book_id: string
          created_at?: string
          current_page?: number | null
          id?: string
          last_read_at?: string | null
          progress_percentage?: number | null
          total_pages?: number | null
          user_id?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string
          current_page?: number | null
          id?: string
          last_read_at?: string | null
          progress_percentage?: number | null
          total_pages?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      reading_sessions_tracking: {
        Row: {
          book_id: string
          created_at: string
          id: string
          page_number: number
          reading_speed: string | null
          scroll_backs: number | null
          session_id: string
          time_spent_seconds: number | null
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          page_number: number
          reading_speed?: string | null
          scroll_backs?: number | null
          session_id: string
          time_spent_seconds?: number | null
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          page_number?: number
          reading_speed?: string | null
          scroll_backs?: number | null
          session_id?: string
          time_spent_seconds?: number | null
        }
        Relationships: []
      }
      review_candles: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_candles_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "book_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_likes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_likes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "book_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      search_analytics: {
        Row: {
          clicked_results: Json | null
          created_at: string | null
          id: string
          ip_address: unknown
          results_count: number | null
          search_duration_ms: number | null
          search_query: string
          search_type: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          clicked_results?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          results_count?: number | null
          search_duration_ms?: number | null
          search_query: string
          search_type?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_results?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          results_count?: number | null
          search_duration_ms?: number | null
          search_query?: string
          search_type?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      search_settings: {
        Row: {
          api_provider: string
          created_at: string | null
          id: string
          is_active: boolean | null
          max_results: number | null
          search_mode: string | null
          similarity_threshold: number | null
          updated_at: string | null
        }
        Insert: {
          api_provider?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_results?: number | null
          search_mode?: string | null
          similarity_threshold?: number | null
          updated_at?: string | null
        }
        Update: {
          api_provider?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_results?: number | null
          search_mode?: string | null
          similarity_threshold?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      search_suggestions: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_trending: boolean | null
          language: string | null
          popularity_score: number | null
          suggestion_text: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_trending?: boolean | null
          language?: string | null
          popularity_score?: number | null
          suggestion_text: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_trending?: boolean | null
          language?: string | null
          popularity_score?: number | null
          suggestion_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      site_update_reads: {
        Row: {
          id: string
          read_at: string
          update_id: string
          user_id: string
        }
        Insert: {
          id?: string
          read_at?: string
          update_id: string
          user_id: string
        }
        Update: {
          id?: string
          read_at?: string
          update_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_update_reads_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "site_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_updates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          message: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          message: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          message?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sitemap_urls: {
        Row: {
          changefreq: string | null
          created_at: string | null
          id: string
          lastmod: string | null
          page_type: string
          priority: number | null
          url: string
        }
        Insert: {
          changefreq?: string | null
          created_at?: string | null
          id?: string
          lastmod?: string | null
          page_type: string
          priority?: number | null
          url: string
        }
        Update: {
          changefreq?: string | null
          created_at?: string | null
          id?: string
          lastmod?: string | null
          page_type?: string
          priority?: number | null
          url?: string
        }
        Relationships: []
      }
      storage_protection_log: {
        Row: {
          attempted_at: string | null
          attempted_by: string | null
          bucket_name: string | null
          file_path: string | null
          id: string
          operation_type: string
          reason: string | null
        }
        Insert: {
          attempted_at?: string | null
          attempted_by?: string | null
          bucket_name?: string | null
          file_path?: string | null
          id?: string
          operation_type: string
          reason?: string | null
        }
        Update: {
          attempted_at?: string | null
          attempted_by?: string | null
          bucket_name?: string | null
          file_path?: string | null
          id?: string
          operation_type?: string
          reason?: string | null
        }
        Relationships: []
      }
      stories: {
        Row: {
          book_id: string | null
          book_slug: string | null
          caption: string | null
          created_at: string
          duration: number
          expires_at: string
          id: string
          is_active: boolean
          media_type: string
          media_url: string
          user_id: string
        }
        Insert: {
          book_id?: string | null
          book_slug?: string | null
          caption?: string | null
          created_at?: string
          duration?: number
          expires_at?: string
          id?: string
          is_active?: boolean
          media_type?: string
          media_url: string
          user_id: string
        }
        Update: {
          book_id?: string | null
          book_slug?: string | null
          caption?: string | null
          created_at?: string
          duration?: number
          expires_at?: string
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          user_id?: string
        }
        Relationships: []
      }
      story_likes: {
        Row: {
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_likes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_likes: {
        Row: {
          created_at: string
          id: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_likes_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_replies_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      text_extraction_queue: {
        Row: {
          attempts: number
          book_id: string
          created_at: string
          finished_at: string | null
          id: string
          last_error: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          book_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          last_error?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          book_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          last_error?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      tools_used: {
        Row: {
          created_at: string | null
          id: string
          last_used_at: string | null
          tool_name: string
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          tool_name: string
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          tool_name?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      upload_sessions: {
        Row: {
          book_submission_id: string | null
          chunk_size: number
          chunks_metadata: Json | null
          created_at: string | null
          estimated_time_remaining: number | null
          expires_at: string | null
          file_name: string
          file_size: number
          id: string
          last_chunk_uploaded_at: string | null
          total_chunks: number
          updated_at: string | null
          upload_progress: number | null
          upload_speed_mbps: number | null
          upload_status: string | null
          uploaded_chunks: number | null
          user_id: string
        }
        Insert: {
          book_submission_id?: string | null
          chunk_size?: number
          chunks_metadata?: Json | null
          created_at?: string | null
          estimated_time_remaining?: number | null
          expires_at?: string | null
          file_name: string
          file_size: number
          id?: string
          last_chunk_uploaded_at?: string | null
          total_chunks: number
          updated_at?: string | null
          upload_progress?: number | null
          upload_speed_mbps?: number | null
          upload_status?: string | null
          uploaded_chunks?: number | null
          user_id: string
        }
        Update: {
          book_submission_id?: string | null
          chunk_size?: number
          chunks_metadata?: Json | null
          created_at?: string | null
          estimated_time_remaining?: number | null
          expires_at?: string | null
          file_name?: string
          file_size?: number
          id?: string
          last_chunk_uploaded_at?: string | null
          total_chunks?: number
          updated_at?: string | null
          upload_progress?: number | null
          upload_speed_mbps?: number | null
          upload_status?: string | null
          uploaded_chunks?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_sessions_book_submission_id_fkey"
            columns: ["book_submission_id"]
            isOneToOne: false
            referencedRelation: "approved_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_sessions_book_submission_id_fkey"
            columns: ["book_submission_id"]
            isOneToOne: false
            referencedRelation: "approved_books_covers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_sessions_book_submission_id_fkey"
            columns: ["book_submission_id"]
            isOneToOne: false
            referencedRelation: "book_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_sessions_book_submission_id_fkey"
            columns: ["book_submission_id"]
            isOneToOne: false
            referencedRelation: "public_books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activities: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_image_url: string | null
          target_title: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_image_url?: string | null
          target_title?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_image_url?: string | null
          target_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bookshelves: {
        Row: {
          book_id: string
          created_at: string | null
          id: string
          shelf_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string | null
          id?: string
          shelf_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string | null
          id?: string
          shelf_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_downloads: {
        Row: {
          book_author: string | null
          book_cover_url: string | null
          book_id: string
          book_slug: string | null
          book_title: string
          created_at: string
          downloaded_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_author?: string | null
          book_cover_url?: string | null
          book_id: string
          book_slug?: string | null
          book_title: string
          created_at?: string
          downloaded_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_author?: string | null
          book_cover_url?: string | null
          book_id?: string
          book_slug?: string | null
          book_title?: string
          created_at?: string
          downloaded_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_followers_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_followers_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          created_at: string
          id: string
          is_online: boolean
          last_ping: string
          session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_online?: boolean
          last_ping?: string
          session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_online?: boolean
          last_ping?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_purchases: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_date: string | null
          payment_status: string
          paypal_payer_id: string | null
          paypal_payment_id: string | null
          updated_at: string
          user_id: string
          verified_date: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_date?: string | null
          payment_status?: string
          paypal_payer_id?: string | null
          paypal_payment_id?: string | null
          updated_at?: string
          user_id: string
          verified_date?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_date?: string | null
          payment_status?: string
          paypal_payer_id?: string | null
          paypal_payment_id?: string | null
          updated_at?: string
          user_id?: string
          verified_date?: string | null
        }
        Relationships: []
      }
      verified_authors: {
        Row: {
          author_id: string
          author_name: string
          created_at: string | null
          id: string
          is_verified: boolean | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          author_id: string
          author_name: string
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          author_id?: string
          author_name?: string
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      weekly_challenge_winners: {
        Row: {
          achievements: Json | null
          avatar_url: string | null
          challenge_id: string
          created_at: string | null
          final_rank: number
          final_score: number
          id: string
          user_id: string
          username: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          achievements?: Json | null
          avatar_url?: string | null
          challenge_id: string
          created_at?: string | null
          final_rank: number
          final_score?: number
          id?: string
          user_id: string
          username: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          achievements?: Json | null
          avatar_url?: string | null
          challenge_id?: string
          created_at?: string | null
          final_rank?: number
          final_score?: number
          id?: string
          user_id?: string
          username?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_challenge_winners_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      approved_books: {
        Row: {
          author: string | null
          author_bio: string | null
          author_image_url: string | null
          book_file_url: string | null
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          display_type: string | null
          file_metadata: Json | null
          file_size: number | null
          file_type: string | null
          id: string | null
          is_active: boolean | null
          language: string | null
          page_count: number | null
          processing_status: string | null
          publication_year: number | null
          publisher: string | null
          rating: number | null
          reviewed_at: string | null
          rights_confirmation: boolean | null
          slug: string | null
          subtitle: string | null
          title: string | null
          translator: string | null
          user_email: string | null
          user_id: string | null
          views: number | null
        }
        Insert: {
          author?: string | null
          author_bio?: string | null
          author_image_url?: string | null
          book_file_url?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          display_type?: string | null
          file_metadata?: Json | null
          file_size?: number | null
          file_type?: string | null
          id?: string | null
          is_active?: never
          language?: string | null
          page_count?: number | null
          processing_status?: string | null
          publication_year?: number | null
          publisher?: string | null
          rating?: number | null
          reviewed_at?: string | null
          rights_confirmation?: boolean | null
          slug?: string | null
          subtitle?: string | null
          title?: string | null
          translator?: string | null
          user_email?: string | null
          user_id?: string | null
          views?: number | null
        }
        Update: {
          author?: string | null
          author_bio?: string | null
          author_image_url?: string | null
          book_file_url?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          display_type?: string | null
          file_metadata?: Json | null
          file_size?: number | null
          file_type?: string | null
          id?: string | null
          is_active?: never
          language?: string | null
          page_count?: number | null
          processing_status?: string | null
          publication_year?: number | null
          publisher?: string | null
          rating?: number | null
          reviewed_at?: string | null
          rights_confirmation?: boolean | null
          slug?: string | null
          subtitle?: string | null
          title?: string | null
          translator?: string | null
          user_email?: string | null
          user_id?: string | null
          views?: number | null
        }
        Relationships: []
      }
      approved_books_covers: {
        Row: {
          author: string | null
          cover_image_url: string | null
          id: string | null
          title: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country_code: string | null
          country_name: string | null
          created_at: string | null
          followers_count: number | null
          following_count: number | null
          id: string | null
          is_verified: boolean | null
          last_seen: string | null
          points: number | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_tiktok: string | null
          social_twitter: string | null
          social_whatsapp: string | null
          social_youtube: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string | null
          is_verified?: boolean | null
          last_seen?: string | null
          points?: number | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_whatsapp?: string | null
          social_youtube?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string | null
          is_verified?: boolean | null
          last_seen?: string | null
          points?: number | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_whatsapp?: string | null
          social_youtube?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      public_books: {
        Row: {
          author: string | null
          author_bio: string | null
          author_country_code: string | null
          author_country_name: string | null
          author_image_url: string | null
          author_social_facebook: string | null
          author_social_instagram: string | null
          author_social_linkedin: string | null
          author_social_tiktok: string | null
          author_social_twitter: string | null
          author_social_whatsapp: string | null
          author_social_youtube: string | null
          author_website: string | null
          book_file_type: string | null
          book_file_url: string | null
          category: string | null
          chunks_total: number | null
          chunks_uploaded: number | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          device_type: string | null
          display_type: string | null
          edit_requested_at: string | null
          estimated_time_remaining: number | null
          file_metadata: Json | null
          file_size: number | null
          file_type: string | null
          id: string | null
          is_edit_request: boolean | null
          language: string | null
          mobile_upload: boolean | null
          original_book_id: string | null
          original_rating: number | null
          original_views: number | null
          page_count: number | null
          previous_status: string | null
          processing_status: string | null
          publication_year: number | null
          publisher: string | null
          rating: number | null
          reviewed_at: string | null
          reviewer_notes: string | null
          rights_confirmation: boolean | null
          slug: string | null
          status: string | null
          subtitle: string | null
          title: string | null
          translator: string | null
          upload_end_time: string | null
          upload_error_message: string | null
          upload_method: string | null
          upload_progress: number | null
          upload_speed_mbps: number | null
          upload_start_time: string | null
          upload_status: string | null
          user_email: string | null
          user_id: string | null
          views: number | null
        }
        Insert: {
          author?: string | null
          author_bio?: string | null
          author_country_code?: string | null
          author_country_name?: string | null
          author_image_url?: string | null
          author_social_facebook?: string | null
          author_social_instagram?: string | null
          author_social_linkedin?: string | null
          author_social_tiktok?: string | null
          author_social_twitter?: string | null
          author_social_whatsapp?: string | null
          author_social_youtube?: string | null
          author_website?: string | null
          book_file_type?: string | null
          book_file_url?: string | null
          category?: string | null
          chunks_total?: number | null
          chunks_uploaded?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          device_type?: string | null
          display_type?: string | null
          edit_requested_at?: string | null
          estimated_time_remaining?: number | null
          file_metadata?: Json | null
          file_size?: number | null
          file_type?: string | null
          id?: string | null
          is_edit_request?: boolean | null
          language?: string | null
          mobile_upload?: boolean | null
          original_book_id?: string | null
          original_rating?: number | null
          original_views?: number | null
          page_count?: number | null
          previous_status?: string | null
          processing_status?: string | null
          publication_year?: number | null
          publisher?: string | null
          rating?: number | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          rights_confirmation?: boolean | null
          slug?: string | null
          status?: string | null
          subtitle?: string | null
          title?: string | null
          translator?: string | null
          upload_end_time?: string | null
          upload_error_message?: string | null
          upload_method?: string | null
          upload_progress?: number | null
          upload_speed_mbps?: number | null
          upload_start_time?: string | null
          upload_status?: string | null
          user_email?: string | null
          user_id?: string | null
          views?: number | null
        }
        Update: {
          author?: string | null
          author_bio?: string | null
          author_country_code?: string | null
          author_country_name?: string | null
          author_image_url?: string | null
          author_social_facebook?: string | null
          author_social_instagram?: string | null
          author_social_linkedin?: string | null
          author_social_tiktok?: string | null
          author_social_twitter?: string | null
          author_social_whatsapp?: string | null
          author_social_youtube?: string | null
          author_website?: string | null
          book_file_type?: string | null
          book_file_url?: string | null
          category?: string | null
          chunks_total?: number | null
          chunks_uploaded?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          device_type?: string | null
          display_type?: string | null
          edit_requested_at?: string | null
          estimated_time_remaining?: number | null
          file_metadata?: Json | null
          file_size?: number | null
          file_type?: string | null
          id?: string | null
          is_edit_request?: boolean | null
          language?: string | null
          mobile_upload?: boolean | null
          original_book_id?: string | null
          original_rating?: number | null
          original_views?: number | null
          page_count?: number | null
          previous_status?: string | null
          processing_status?: string | null
          publication_year?: number | null
          publisher?: string | null
          rating?: number | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          rights_confirmation?: boolean | null
          slug?: string | null
          status?: string | null
          subtitle?: string | null
          title?: string | null
          translator?: string | null
          upload_end_time?: string | null
          upload_error_message?: string | null
          upload_method?: string | null
          upload_progress?: number | null
          upload_speed_mbps?: number | null
          upload_start_time?: string | null
          upload_status?: string | null
          user_email?: string | null
          user_id?: string | null
          views?: number | null
        }
        Relationships: []
      }
      storage_protection_status: {
        Row: {
          bucket_id: string | null
          bucket_name: string | null
          is_public: boolean | null
          status: string | null
        }
        Insert: {
          bucket_id?: string | null
          bucket_name?: string | null
          is_public?: boolean | null
          status?: never
        }
        Update: {
          bucket_id?: string | null
          bucket_name?: string | null
          is_public?: boolean | null
          status?: never
        }
        Relationships: []
      }
    }
    Functions: {
      add_book_page: {
        Args: {
          p_book_id: string
          p_page_height?: number
          p_page_image_url: string
          p_page_number: number
          p_page_width?: number
        }
        Returns: string
      }
      add_book_review: {
        Args: {
          p_book_id: string
          p_comment?: string
          p_rating: number
          p_recommend?: boolean
          p_user_id: string
        }
        Returns: string
      }
      add_existing_books_to_sitemap: { Args: never; Returns: string }
      add_points_for_existing_reviews: { Args: never; Returns: number }
      add_review_like: {
        Args: { p_review_id: string; p_user_id: string }
        Returns: boolean
      }
      approve_book_edit: {
        Args: { p_edit_submission_id: string; p_reviewer_notes?: string }
        Returns: boolean
      }
      book_id_to_uuid: { Args: { p_book_id: string }; Returns: string }
      bulk_upload_queue_stats: {
        Args: never
        Returns: {
          count: number
          status: string
        }[]
      }
      bulk_upload_queue_stats_by_batch: {
        Args: never
        Returns: {
          batch_label: string
          count: number
          first_created_at: string
          last_updated_at: string
          status: string
        }[]
      }
      check_book_title_exists: {
        Args: { p_author?: string; p_title: string }
        Returns: boolean
      }
      check_books_file_integrity: {
        Args: never
        Returns: {
          author_image_url: string
          book_id: string
          cover_url: string
          missing_author_image: boolean
          missing_cover: boolean
          missing_pdf: boolean
          pdf_url: string
          title: string
        }[]
      }
      check_email_exists: { Args: { email_to_check: string }; Returns: boolean }
      check_file_exists_in_storage: {
        Args: { file_url: string }
        Returns: boolean
      }
      check_rls_policies: {
        Args: never
        Returns: {
          policy_command: string
          policy_name: string
          policy_permissive: string
          policy_qual: string
          policy_roles: string
          policy_with_check: string
          table_name: string
        }[]
      }
      check_storage_limits: {
        Args: { upload_size_bytes?: number }
        Returns: {
          can_upload: boolean
          current_usage_mb: number
          max_allowed_mb: number
          message: string
          remaining_mb: number
        }[]
      }
      check_storage_protection_status: {
        Args: never
        Returns: {
          last_protection_update: string
          protection_status: string
          total_files: number
        }[]
      }
      check_user_book_dislike: {
        Args: { p_book_id: string; p_user_id: string }
        Returns: boolean
      }
      check_user_book_like: {
        Args: { p_book_id: string; p_user_id: string }
        Returns: boolean
      }
      claim_bulk_upload_items: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          batch_label: string | null
          book_file_url: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          error: string | null
          finished_at: string | null
          id: string
          max_attempts: number
          page_count: number | null
          result_book_id: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "bulk_upload_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_text_extraction_items: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          book_id: string
          id: string
        }[]
      }
      clean_duplicate_books: { Args: never; Returns: number }
      clean_duplicate_notifications: { Args: never; Returns: number }
      cleanup_expired_cache: { Args: never; Returns: undefined }
      cleanup_expired_stories: { Args: never; Returns: undefined }
      cleanup_expired_upload_sessions: { Args: never; Returns: number }
      cleanup_old_books_cache: { Args: never; Returns: undefined }
      cleanup_old_file_cleanup_logs: { Args: never; Returns: number }
      cleanup_old_navigation_history: { Args: never; Returns: number }
      cleanup_old_presence: { Args: never; Returns: number }
      cleanup_orphaned_book_links: { Args: never; Returns: number }
      cleanup_orphaned_chunks: { Args: never; Returns: number }
      create_approved_book_from_submission: {
        Args: { p_submission_id: string }
        Returns: string
      }
      debug_book_submission_insert: {
        Args: {
          p_author: string
          p_category: string
          p_description: string
          p_language: string
          p_title: string
          p_user_id: string
        }
        Returns: {
          debug_info: string
          error_message: string
          result_status: string
        }[]
      }
      delete_all_user_notifications: {
        Args: { p_user_id: string }
        Returns: number
      }
      delete_approved_book_permanently: {
        Args: { p_book_id: string; p_user_id: string }
        Returns: {
          book_title: string
          deleted_files: number
          message: string
          success: boolean
        }[]
      }
      delete_approved_book_with_cleanup: {
        Args: { p_book_id: string; p_reason: string }
        Returns: Json
      }
      delete_book_permanently: {
        Args: { p_book_id: string; p_reason: string }
        Returns: {
          book_title: string
          deleted_files: number
          message: string
          success: boolean
        }[]
      }
      delete_user_notification: {
        Args: { p_notification_id: string; p_user_id: string }
        Returns: boolean
      }
      enhanced_search_books: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_query: string
          p_session_id?: string
          p_user_id?: string
        }
        Returns: {
          author: string
          category: string
          cover_image_url: string
          created_at: string
          description: string
          id: string
          rating: number
          relevance_score: number
          title: string
          views: number
        }[]
      }
      find_author_by_normalized_name: {
        Args: { author_name: string }
        Returns: string
      }
      find_existing_book_with_normalized_author: {
        Args: { p_author: string; p_status: string; p_title: string }
        Returns: {
          author: string
          id: string
          status: string
          title: string
        }[]
      }
      fix_admin_uploaded_authors_data: { Args: never; Returns: string }
      fix_authors_books_count: {
        Args: { author_name: string }
        Returns: number
      }
      fix_book_submission_issues: { Args: never; Returns: string }
      generate_author_slug: { Args: { p_name: string }; Returns: string }
      generate_book_slug: {
        Args: { p_author: string; p_title: string }
        Returns: string
      }
      get_all_books: {
        Args: never
        Returns: {
          author: string
          book_type: string
          category: string
          cover_image: string
          created_at: string
          description: string
          id: string
          is_free: boolean
          rating: number
          slug: string
          title: string
        }[]
      }
      get_approved_books: {
        Args: never
        Returns: {
          author: string
          book_file_type: string
          book_type: string
          category: string
          cover_image: string
          created_at: string
          description: string
          id: string
          is_free: boolean
          rating: number
          slug: string
          title: string
          views: number
        }[]
      }
      get_approved_books_count: { Args: never; Returns: number }
      get_approved_books_optimized: {
        Args: never
        Returns: {
          author: string
          book_type: string
          category: string
          cover_image: string
          created_at: string
          description: string
          id: string
          is_free: boolean
          rating: number
          title: string
          views: number
        }[]
      }
      get_approved_books_with_pagination: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author: string
          book_type: string
          category: string
          cover_image: string
          created_at: string
          description: string
          id: string
          is_free: boolean
          rating: number
          slug: string
          title: string
          views: number
        }[]
      }
      get_author_bio_smart: { Args: { p_book_id: string }; Returns: string }
      get_author_by_slug_or_name: {
        Args: { p_identifier: string }
        Returns: {
          avatar_url: string
          bio: string
          books_count: number
          country_code: string
          country_name: string
          created_at: string
          email: string
          followers_count: number
          id: string
          name: string
          slug: string
          social_links: Json
          user_id: string
          website: string
        }[]
      }
      get_author_details_safe: {
        Args: { author_identifier: string }
        Returns: {
          avatar_url: string
          bio: string
          books_count: number
          country_code: string
          country_name: string
          created_at: string
          email: string
          followers_count: number
          id: string
          name: string
          slug: string
          social_links: Json
          website: string
        }[]
      }
      get_author_page_data: { Args: { p_identifier: string }; Returns: Json }
      get_available_challenge_weeks: {
        Args: { p_challenge_id: string }
        Returns: {
          week_end_date: string
          week_start_date: string
          winners_count: number
        }[]
      }
      get_book_covers: {
        Args: { book_ids: string[] }
        Returns: {
          cover_image_url: string
          id: string
        }[]
      }
      get_book_details: {
        Args: { p_book_id: string }
        Returns: {
          author: string
          author_bio: string
          author_image_url: string
          book_file_url: string
          category: string
          cover_image_url: string
          created_at: string
          description: string
          display_type: string
          file_metadata: Json
          file_size: number
          file_type: string
          id: string
          is_active: boolean
          language: string
          page_count: number
          processing_status: string
          publication_year: number
          publisher: string
          rating: number
          reviewed_at: string
          rights_confirmation: boolean
          slug: string
          subtitle: string
          title: string
          translator: string
          user_email: string
          user_id: string
          views: number
        }[]
      }
      get_book_details_optimized: {
        Args: { p_book_id: string }
        Returns: {
          author: string
          author_bio: string
          author_image_url: string
          book_file_url: string
          category: string
          cover_image_url: string
          created_at: string
          description: string
          display_type: string
          file_size: number
          file_type: string
          id: string
          language: string
          page_count: number
          publication_year: number
          rating: number
          subtitle: string
          title: string
          user_email: string
          views: number
        }[]
      }
      get_book_details_safe: {
        Args: { book_identifier: string }
        Returns: {
          author: string
          author_bio: string
          author_image_url: string
          book_file_url: string
          category: string
          cover_image_url: string
          created_at: string
          description: string
          display_type: string
          file_size: number
          file_type: string
          id: string
          language: string
          page_count: number
          publication_year: number
          publisher: string
          rating: number
          slug: string
          subtitle: string
          title: string
          user_email: string
          views: number
        }[]
      }
      get_book_dislikes_count: { Args: { p_book_id: string }; Returns: number }
      get_book_extracted_text: { Args: { p_book_id: string }; Returns: string }
      get_book_for_sharing: {
        Args: { p_book_id: string }
        Returns: {
          author: string
          category: string
          cover_image_url: string
          description: string
          id: string
          rating: number
          title: string
          views: number
        }[]
      }
      get_book_likes_count: { Args: { p_book_id: string }; Returns: number }
      get_book_media: {
        Args: { p_book_id: string; p_book_table?: string }
        Returns: {
          file_size: number
          file_url: string
          media_type: string
          metadata: Json
        }[]
      }
      get_book_popularity_rank: {
        Args: { p_book_id: string }
        Returns: {
          category_rank: number
          category_total: number
          popularity_rank: number
          popularity_score: number
          total_books: number
        }[]
      }
      get_book_recommendations_count: {
        Args: { p_book_id: string }
        Returns: number
      }
      get_book_review_stats: {
        Args: { p_book_id: string }
        Returns: {
          average_rating: number
          rating_distribution: Json
          total_reviews: number
        }[]
      }
      get_book_reviews: {
        Args: { p_book_id: string }
        Returns: {
          avatar_url: string
          book_id: string
          comment: string
          created_at: string
          id: string
          rating: number
          recommend: boolean
          user_id: string
          username: string
        }[]
      }
      get_book_reviews_with_likes: {
        Args: { p_book_id: string; p_current_user_id: string }
        Returns: {
          avatar_url: string
          book_id: string
          comment: string
          created_at: string
          id: string
          liked_by_current_user: boolean
          likes_count: number
          rating: number
          recommend: boolean
          user_id: string
          username: string
        }[]
      }
      get_book_reviews_with_profiles: {
        Args: { p_book_id: string }
        Returns: {
          avatar_url: string
          book_id: string
          comment: string
          created_at: string
          id: string
          rating: number
          recommend: boolean
          user_email: string
          user_id: string
          username: string
        }[]
      }
      get_book_submissions_with_edit_info: {
        Args: { status_filter: string }
        Returns: {
          author: string
          book_file_url: string
          category: string
          changes_summary: Json
          cover_image_url: string
          created_at: string
          description: string
          display_type: string
          edit_requested_at: string
          file_type: string
          id: string
          is_edit_request: boolean
          language: string
          original_author: string
          original_book_id: string
          original_category: string
          original_description: string
          original_display_type: string
          original_language: string
          original_page_count: number
          original_publication_year: number
          original_title: string
          page_count: number
          publication_year: number
          publisher: string
          reviewed_at: string
          reviewer_notes: string
          rights_confirmation: boolean
          status: string
          subtitle: string
          title: string
          translator: string
          user_email: string
          user_id: string
        }[]
      }
      get_books_batch_stats_fixed: {
        Args: { book_ids: string[] }
        Returns: {
          average_rating: number
          book_id: string
          rating_distribution: Json
          total_reviews: number
        }[]
      }
      get_books_cache: {
        Args: {
          p_page_identifier?: string
          p_page_type: string
          p_session_id: string
          p_user_id?: string
        }
        Returns: {
          cached_books: Json
          displayed_books_count: number
          filters_state: Json
          last_accessed: string
          total_books_count: number
        }[]
      }
      get_books_with_optimized_images: {
        Args: never
        Returns: {
          author: string
          book_type: string
          category: string
          cover_image: string
          cover_image_url: string
          created_at: string
          description: string
          id: string
          is_free: boolean
          optimized_cover_url: string
          rating: number
          title: string
        }[]
      }
      get_books_with_stats_optimized: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author: string
          average_rating: number
          book_file_type: string
          category: string
          cover_image_url: string
          created_at: string
          display_type: string
          id: string
          language: string
          likes_count: number
          page_count: number
          rating: number
          slug: string
          title: string
          total_reviews: number
          views: number
        }[]
      }
      get_categories_with_counts: {
        Args: never
        Returns: {
          category: string
          count: number
        }[]
      }
      get_categories_with_pagination: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          category: string
          count: number
        }[]
      }
      get_challenge_leaderboard: {
        Args: { p_challenge_id: string }
        Returns: {
          avatar_url: string
          current_score: number
          joined_at: string
          rank: number
          user_id: string
          username: string
        }[]
      }
      get_challenge_leaderboard_enhanced: {
        Args: { p_challenge_id: string }
        Returns: {
          avatar_url: string
          current_score: number
          joined_at: string
          rank: number
          user_id: string
          username: string
        }[]
      }
      get_cleanup_statistics: {
        Args: never
        Returns: {
          cleanups_this_month: number
          cleanups_this_week: number
          cleanups_today: number
          most_common_reason: string
          newest_log_date: string
          oldest_log_date: string
          total_cleanups: number
        }[]
      }
      get_complete_author_data: {
        Args: { p_author_name: string }
        Returns: {
          author_id: string
          author_name: string
          avatar_url: string
          bio: string
          books_count: number
          country_name: string
          followers_count: number
          is_verified: boolean
          profile_avatar: string
          profile_bio: string
          social_links: Json
          user_id: string
        }[]
      }
      get_current_user_role: { Args: never; Returns: string }
      get_email_normalized: {
        Args: { email_to_check: string }
        Returns: string
      }
      get_existing_book_details: {
        Args: { p_author?: string; p_title: string }
        Returns: {
          book_author: string
          book_category: string
          book_title: string
          created_date: string
          source_type: string
        }[]
      }
      get_last_navigation_direction: {
        Args: { p_session_id: string }
        Returns: {
          created_at: string
          direction: string
          from_path: string
          to_path: string
        }[]
      }
      get_last_navigation_state: {
        Args: { p_session_id: string }
        Returns: {
          created_at: string
          page_data: Json
          path: string
          scroll_position: number
        }[]
      }
      get_leaderboard: {
        Args: { p_category?: string; p_limit?: number }
        Returns: {
          avatar_url: string
          books_read: number
          followers_count: number
          id: string
          points: number
          rank: number
          reviews_count: number
          username: string
        }[]
      }
      get_optimized_books_home: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author: string
          book_file_type: string
          category: string
          cover_image_url: string
          created_at: string
          display_type: string
          id: string
          language: string
          page_count: number
          rating: number
          slug: string
          title: string
          views: number
        }[]
      }
      get_optimized_books_home_shuffled: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author: string
          book_file_type: string
          category: string
          cover_image_url: string
          created_at: string
          display_type: string
          id: string
          language: string
          page_count: number
          rating: number
          slug: string
          title: string
          views: number
        }[]
      }
      get_or_create_conversation: {
        Args: { p_user1_id: string; p_user2_id: string }
        Returns: string
      }
      get_page_hints: {
        Args: { p_book_id: string; p_page_number: number }
        Returns: {
          hint_message: string
          hint_type: string
          paragraph_index: number
          relevance_score: number
        }[]
      }
      get_pdf_pages: {
        Args: { p_book_id: string; p_limit?: number; p_start_page?: number }
        Returns: {
          id: string
          page_height: number
          page_image_url: string
          page_number: number
          page_text: string
          page_width: number
        }[]
      }
      get_pdf_viewer_config: {
        Args: { p_book_id: string }
        Returns: {
          book_id: string
          download_enabled: boolean
          fullscreen_enabled: boolean
          pdf_url: string
          print_enabled: boolean
          search_enabled: boolean
          sidebar_visible: boolean
          theme: string
          thumbnails_enabled: boolean
          toolbar_visible: boolean
          total_pages: number
          viewer_mode: string
        }[]
      }
      get_previous_weekly_winners: {
        Args: { p_challenge_id: string; p_weeks_back?: number }
        Returns: {
          achievements: Json
          avatar_url: string
          final_rank: number
          final_score: number
          user_id: string
          username: string
          week_end_date: string
          week_start_date: string
        }[]
      }
      get_protected_files_stats: {
        Args: never
        Returns: {
          bucket_name: string
          files_count: number
          protection_level: string
          total_size_mb: number
        }[]
      }
      get_public_stats: { Args: never; Returns: Json }
      get_random_approved_books: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author: string
          category: string
          cover_image_url: string
          created_at: string
          description: string
          id: string
          language: string
          page_count: number
          rating: number
          slug: string
          title: string
          views: number
        }[]
      }
      get_review_candle_stats: {
        Args: { p_review_id: string }
        Returns: {
          candle_count: number
          user_has_lit: boolean
        }[]
      }
      get_smart_suggestions: {
        Args: { p_limit?: number; p_partial_query?: string }
        Returns: {
          category: string
          is_trending: boolean
          suggestion: string
        }[]
      }
      get_storage_usage: {
        Args: never
        Returns: {
          bucket_name: string
          total_files: number
          total_size_mb: number
        }[]
      }
      get_unread_notifications_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_conversations: {
        Args: { p_user_id: string }
        Returns: {
          conversation_id: string
          is_online: boolean
          last_message: string
          last_message_at: string
          last_seen: string
          participant_avatar_url: string
          participant_email: string
          participant_id: string
          participant_username: string
          unread_count: number
        }[]
      }
      get_user_interaction_status: {
        Args: { p_current_user_id: string; p_target_user_id: string }
        Returns: Json
      }
      get_user_notifications_stats: {
        Args: { p_user_id: string }
        Returns: {
          approved_books: number
          pending_books: number
          rejected_books: number
          total_notifications: number
          unread_notifications: number
        }[]
      }
      handle_edit_approved_book: {
        Args: {
          p_author: string
          p_author_bio?: string
          p_author_image_url?: string
          p_book_file_url?: string
          p_category: string
          p_cover_image_url?: string
          p_description: string
          p_display_type?: string
          p_language: string
          p_original_book_id: string
          p_page_count?: number
          p_publication_year?: number
          p_publisher?: string
          p_subtitle?: string
          p_title: string
          p_translator?: string
          p_user_id: string
        }
        Returns: string
      }
      has_active_upload_timer: {
        Args: { p_user_id: string }
        Returns: {
          has_timer: boolean
          hours_remaining: number
          timer_end: string
        }[]
      }
      has_pending_book_submission: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      has_user_reviewed: {
        Args: { p_book_id: string; p_user_id: string }
        Returns: boolean
      }
      increment_book_views: { Args: { p_book_id: string }; Returns: undefined }
      is_admin: { Args: { user_email: string }; Returns: boolean }
      is_admin_user: { Args: { user_email: string }; Returns: boolean }
      is_author_verified: { Args: { p_author_id: string }; Returns: boolean }
      is_author_verified_by_name: {
        Args: { p_author_name: string }
        Returns: boolean
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_text_corrupted: { Args: { p_text: string }; Returns: boolean }
      is_user_banned: { Args: { p_user_id: string }; Returns: boolean }
      is_user_following_author:
        | { Args: { p_author_id: string; p_user_id: string }; Returns: boolean }
        | { Args: { p_author_id: string; p_user_id: string }; Returns: boolean }
      log_missing_file: {
        Args: {
          p_book_id: string
          p_error_message?: string
          p_file_type: string
          p_file_url: string
        }
        Returns: undefined
      }
      log_upload_attempt: {
        Args: {
          p_browser_info?: Json
          p_device_info?: Json
          p_upload_method?: string
          p_user_id: string
        }
        Returns: string
      }
      manual_cleanup_book_files: {
        Args: { submission_id: string }
        Returns: string
      }
      manual_cleanup_navigation_history: { Args: never; Returns: string }
      mark_all_notifications_read: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      mark_messages_as_read: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: number
      }
      mark_user_as_verified: {
        Args: { p_payment_id: string; p_user_id: string }
        Returns: boolean
      }
      merge_duplicate_authors: {
        Args: never
        Returns: {
          books_transferred: number
          merged_with: string
          original_name: string
        }[]
      }
      migrate_author_bio_to_profiles: { Args: never; Returns: undefined }
      migrate_media_files: { Args: never; Returns: undefined }
      normalize_author_name: { Args: { author_name: string }; Returns: string }
      permanently_delete_approved_book: {
        Args: { p_book_id: string; p_reason: string }
        Returns: {
          book_title: string
          deleted_files: number
          error: string
          message: string
          success: boolean
        }[]
      }
      populate_dynamic_sitemap: { Args: never; Returns: string }
      prevent_storage_deletion: { Args: never; Returns: boolean }
      recalculate_authors_books_count: { Args: never; Returns: undefined }
      record_reading_activity: {
        Args: { p_book_id: string; p_progress: number; p_user_id: string }
        Returns: undefined
      }
      refresh_approved_covers: { Args: never; Returns: undefined }
      remove_file_size_limits: { Args: never; Returns: string }
      remove_review_like: {
        Args: { p_review_id: string; p_user_id: string }
        Returns: boolean
      }
      reset_weekly_challenges: {
        Args: never
        Returns: {
          challenge_id: string
          participants_reset: number
          winners_saved: number
        }[]
      }
      restore_broken_media_links: {
        Args: never
        Returns: {
          action_taken: string
          book_id: string
          book_title: string
        }[]
      }
      restore_missing_files: { Args: never; Returns: number }
      safe_cleanup_orphaned_files: {
        Args: never
        Returns: {
          cleanup_summary: string
          deleted_covers: number
          deleted_pdfs: number
          protected_books: number
        }[]
      }
      safe_uuid_cast: { Args: { input_text: string }; Returns: string }
      save_books_cache: {
        Args: {
          p_cached_books: Json
          p_displayed_books_count?: number
          p_filters_state?: Json
          p_page_identifier?: string
          p_page_type: string
          p_session_id: string
          p_total_books_count?: number
          p_user_id?: string
        }
        Returns: boolean
      }
      save_navigation_state: {
        Args: {
          p_page_data?: Json
          p_path: string
          p_scroll_position?: number
          p_session_id: string
        }
        Returns: undefined
      }
      send_notification_to_all_users: {
        Args: {
          p_admin_user_id?: string
          p_message: string
          p_title: string
          p_type?: string
        }
        Returns: number
      }
      send_push_notification: {
        Args: {
          p_message: string
          p_target_url?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      storage_protection_message: { Args: never; Returns: string }
      sync_author_data: { Args: never; Returns: undefined }
      sync_author_data_no_duplicates: { Args: never; Returns: undefined }
      sync_authors_from_books: { Args: never; Returns: undefined }
      test_leaderboard_data: {
        Args: { p_challenge_id?: string }
        Returns: {
          challenge_info: Json
          leaderboard_data: Json
          participants_count: number
        }[]
      }
      toggle_author_follow: { Args: { p_author_id: string }; Returns: boolean }
      toggle_book_dislike: { Args: { p_book_id: string }; Returns: boolean }
      toggle_book_like: { Args: { p_book_id: string }; Returns: boolean }
      toggle_book_recommendation: {
        Args: { p_book_id: string; p_user_id: string }
        Returns: boolean
      }
      toggle_review_candle: { Args: { p_review_id: string }; Returns: boolean }
      toggle_user_follow: { Args: { p_following_id: string }; Returns: boolean }
      track_navigation_direction: {
        Args: { p_from_path: string; p_session_id: string; p_to_path: string }
        Returns: string
      }
      trigger_html_generation: {
        Args: { p_book_id: string }
        Returns: undefined
      }
      unapprove_book_instead_of_delete: {
        Args: { p_book_id: string; p_reason: string }
        Returns: {
          book_title: string
          deleted_files: number
          error: string
          message: string
          success: boolean
        }[]
      }
      unban_user: { Args: { p_user_id: string }; Returns: boolean }
      unverify_author: { Args: { p_author_id: string }; Returns: boolean }
      update_approved_book_slugs: { Args: never; Returns: undefined }
      update_author_bio_from_books: { Args: never; Returns: undefined }
      update_author_bio_in_books: {
        Args: { p_author_name: string; p_new_bio: string }
        Returns: number
      }
      update_book_cache_status: {
        Args: { p_book_id: string; p_cache_key?: string; p_status: string }
        Returns: undefined
      }
      update_book_cover_metadata: {
        Args: {
          p_book_id: string
          p_cover_format?: string
          p_cover_height?: number
          p_cover_size?: number
          p_cover_width?: number
        }
        Returns: undefined
      }
      update_book_submission_status: {
        Args: {
          p_new_status: string
          p_reviewer_notes?: string
          p_submission_id: string
        }
        Returns: boolean
      }
      update_book_submission_status_enhanced: {
        Args: {
          p_new_status: string
          p_reviewer_notes?: string
          p_submission_id: string
        }
        Returns: boolean
      }
      update_challenge_score: {
        Args: {
          p_activity_data?: Json
          p_activity_type: string
          p_challenge_id: string
          p_points: number
          p_user_id: string
        }
        Returns: boolean
      }
      update_large_file_upload_progress:
        | {
            Args: {
              p_error_message?: string
              p_progress: number
              p_status?: string
              p_submission_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_device_type?: string
              p_error_message?: string
              p_progress: number
              p_status?: string
              p_submission_id: string
            }
            Returns: undefined
          }
      update_pdf_display_settings: {
        Args: { p_book_id: string; p_config?: Json; p_display_mode?: string }
        Returns: undefined
      }
      update_pdf_display_settings_with_validation: {
        Args: { p_book_id: string; p_config?: Json; p_display_mode?: string }
        Returns: undefined
      }
      update_pdf_info: {
        Args: {
          p_book_id: string
          p_file_size?: number
          p_pdf_version?: string
          p_total_pages: number
        }
        Returns: undefined
      }
      update_pdf_processing: {
        Args: {
          p_base_image_url: string
          p_book_id: string
          p_status?: string
          p_total_pages: number
        }
        Returns: undefined
      }
      update_reader_fingerprint: {
        Args: {
          p_book_id: string
          p_is_pause?: boolean
          p_is_reread?: boolean
          p_is_slow?: boolean
          p_page_number: number
          p_paragraph_index?: number
        }
        Returns: undefined
      }
      update_reading_progress: {
        Args: {
          p_book_id: string
          p_current_page: number
          p_total_pages?: number
          p_user_id: string
        }
        Returns: undefined
      }
      update_subscription_status: {
        Args: { p_endpoint: string; p_is_active: boolean; p_user_id: string }
        Returns: boolean
      }
      update_upload_progress: {
        Args: {
          p_chunks_total?: number
          p_chunks_uploaded?: number
          p_error_message?: string
          p_estimated_time?: number
          p_progress: number
          p_status?: string
          p_submission_id: string
          p_upload_speed?: number
        }
        Returns: boolean
      }
      update_upload_progress_batch: {
        Args: {
          p_chunks_total?: number
          p_chunks_uploaded?: number
          p_error_message?: string
          p_estimated_time?: number
          p_progress?: number
          p_status?: string
          p_submission_id: string
          p_upload_speed?: number
        }
        Returns: boolean
      }
      update_upload_progress_optimized: {
        Args: {
          p_chunks_total?: number
          p_chunks_uploaded?: number
          p_error_message?: string
          p_progress: number
          p_status?: string
          p_submission_id: string
        }
        Returns: undefined
      }
      update_upload_session_progress: {
        Args: {
          p_chunk_metadata?: Json
          p_chunk_number: number
          p_session_id: string
        }
        Returns: boolean
      }
      update_upload_session_with_retry: {
        Args: {
          p_device_info?: Json
          p_error_message?: string
          p_network_info?: Json
          p_progress: number
          p_stage: string
          p_submission_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      update_user_last_seen: { Args: { p_user_id: string }; Returns: undefined }
      update_user_presence: {
        Args: {
          p_is_online?: boolean
          p_session_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      user_has_recommended: {
        Args: { p_book_id: string; p_user_id: string }
        Returns: boolean
      }
      validate_and_fix_image_urls: { Args: never; Returns: number }
      validate_book_file_type: { Args: { file_type: string }; Returns: boolean }
      validate_pdf_url: { Args: { pdf_url: string }; Returns: boolean }
      validate_pdf_url_format: { Args: { pdf_url: string }; Returns: boolean }
      verify_author: {
        Args: { p_author_id: string; p_author_name: string }
        Returns: boolean
      }
      verify_email_code: {
        Args: { p_code: string; p_email: string }
        Returns: boolean
      }
    }
    Enums: {
      challenge_status: "upcoming" | "active" | "completed" | "cancelled"
      challenge_type: "reading" | "writing" | "quotes" | "reviews" | "followers"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      challenge_status: ["upcoming", "active", "completed", "cancelled"],
      challenge_type: ["reading", "writing", "quotes", "reviews", "followers"],
    },
  },
} as const
