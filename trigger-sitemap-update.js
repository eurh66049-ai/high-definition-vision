// Script to trigger sitemap update
const updateSitemap = async () => {
  try {
    const response = await fetch('https://kydmyxsgyxeubhmqzrgo.supabase.co/functions/v1/update-sitemap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0'
      },
      body: JSON.stringify({})
    });
    
    const result = await response.json();
    console.log('Sitemap update result:', result);
  } catch (error) {
    console.error('Error updating sitemap:', error);
  }
};

updateSitemap();