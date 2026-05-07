
// Edge function to delete a user and all their associated data
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a Supabase client with the admin key
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    })
  }

  // Only process POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Starting deletion process for user: ${userId}`)

    // Function to handle data deletion with better error reporting
    const deleteUserData = async (tableName: string, userId: string) => {
      try {
        const { error } = await supabaseAdmin
          .from(tableName)
          .delete()
          .eq('user_id', userId)

        if (error) {
          console.warn(`Warning: Error deleting from ${tableName}: ${error.message}`)
          return false
        }
        console.log(`Successfully deleted user data from ${tableName}`)
        return true
      } catch (error) {
        console.warn(`Warning: Exception deleting from ${tableName}: ${error.message || error}`)
        return false
      }
    }

    // 1. Delete reading history
    await deleteUserData('reading_history', userId)

    // 2. Delete book reviews
    await deleteUserData('book_reviews', userId)

    // 3. Delete book recommendations
    await deleteUserData('book_recommendations', userId)

    // 4. Delete user profile
    try {
      // Get the profile data first to check for an avatar
      const { data: profileData, error: profileFetchError } = await supabaseAdmin
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single()

      if (profileFetchError && !profileFetchError.message.includes('No rows found')) {
        console.warn(`Warning: Error fetching profile: ${profileFetchError.message}`)
      }

      // Delete the profile
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileDeleteError) {
        console.warn(`Warning: Error deleting profile: ${profileDeleteError.message}`)
      } else {
        console.log('Successfully deleted user profile')
      }

      // If there was an avatar, try to delete it from storage
      if (profileData?.avatar_url) {
        try {
          const avatarPath = profileData.avatar_url.split('/').pop()
          if (avatarPath) {
            const { error: storageError } = await supabaseAdmin
              .storage
              .from('avatars')
              .remove([avatarPath])

            if (storageError) {
              console.warn(`Warning: Error deleting avatar: ${storageError.message}`)
            } else {
              console.log('Successfully deleted user avatar')
            }
          }
        } catch (storageError) {
          console.warn(`Warning: Exception deleting avatar: ${storageError.message || storageError}`)
        }
      }
    } catch (profileError) {
      console.warn(`Warning: Exception handling profile deletion: ${profileError.message || profileError}`)
    }
    
    // Now delete the user from auth.users using admin API
    try {
      // Direct deletion using admin API
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      
      if (authError) {
        throw authError
      }
      
      console.log('User successfully deleted from auth.users:', userId)
    } catch (authDeleteError) {
      console.error('Error deleting user from auth.users:', authDeleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user from authentication system', details: authDeleteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ success: true, message: 'User and associated data deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
