import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import BottomNavigation from './components/layout/BottomNavigation';
import { startPeriodicCleanup } from './utils/localStorageManager';
import { useUserPresenceTracker } from '@/hooks/useUserPresenceTracker';
import { useAISmartNotifications } from '@/hooks/useAISmartNotifications';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import UnlimitedDownloadsPrompt from '@/components/pwa/UnlimitedDownloadsPrompt';

// Critical route - eagerly loaded
import Index from './pages/Index';

// Lazy-loaded routes
const NotFound = lazy(() => import('./pages/NotFound'));
const BookDetails = lazy(() => import('./pages/BookDetails'));
const PDFReaderPage = lazy(() => import('./pages/PDFReaderPage'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Auth = lazy(() => import('./pages/Auth'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const UploadBook = lazy(() => import('./pages/UploadBook'));
const AdminBooks = lazy(() => import('./pages/AdminBooks'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Quotes = lazy(() => import('./pages/Quotes'));
const SiteUpdates = lazy(() => import('./pages/SiteUpdates'));
const MyBooks = lazy(() => import('./pages/MyBooks'));
const Donation = lazy(() => import('./pages/Donation'));
const DonationSuccess = lazy(() => import('./pages/DonationSuccess'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const BookCategories = lazy(() => import('./pages/BookCategories'));
const CategoryBooks = lazy(() => import('./pages/CategoryBooks'));
const Authors = lazy(() => import('./pages/Authors'));
const AuthorPage = lazy(() => import('./pages/AuthorPage'));
const PublicUserProfile = lazy(() => import('./pages/PublicUserProfile'));
const Suggestions = lazy(() => import('./pages/Suggestions'));
const Messages = lazy(() => import('./pages/Messages'));



const ReadingClubs = lazy(() => import('./pages/ReadingClubs'));
const ReadingClubRoom = lazy(() => import('./pages/ReadingClubRoom'));
const Timeline = lazy(() => import('./pages/Timeline'));
const CoverDesigner = lazy(() => import('./pages/CoverDesigner'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const PageFallback = () => (
  <div className="flex justify-center items-center min-h-[50vh]">
    <LoadingSpinner size="lg" color="red" />
  </div>
);

// مكون للتحكم في عرض العناصر حسب المسار
function AppContent() {
  const location = useLocation();
  const isReaderPage = location.pathname.includes('/book/reading/');

  // تتبع آخر نشاط المستخدم (Last seen) عبر Supabase
  useUserPresenceTracker();

  // إشعارات ذكية بالذكاء الاصطناعي
  useAISmartNotifications();

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Toaster />
      <Sonner />
      
    
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/book/:id" element={<BookDetails />} />
          <Route path="/book/reading/:id" element={<PDFReaderPage />} />
          <Route path="/upload-book" element={<UploadBook />} />
          <Route path="/admin/books" element={<AdminBooks />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/my-books" element={<MyBooks />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/site-updates" element={<SiteUpdates />} />
          <Route path="/daily-messages" element={<SiteUpdates />} />
          <Route path="/donation" element={<Donation />} />
          <Route path="/donation-success" element={<DonationSuccess />} />
          <Route path="/categories" element={<BookCategories />} />
          <Route path="/category/:category" element={<CategoryBooks />} />
          <Route path="/authors" element={<Authors />} />
          <Route path="/author/:authorIdentifier" element={<AuthorPage />} />
          <Route path="/user/:userIdentifier" element={<PublicUserProfile />} />
          <Route path="/suggestions" element={<Suggestions />} />
          <Route path="/messages" element={<Messages />} />
          
          <Route path="/reading-clubs" element={<ReadingClubs />} />
          <Route path="/reading-clubs/:clubId" element={<ReadingClubRoom />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/cover-designer" element={<CoverDesigner />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      
      {!isReaderPage && <BottomNavigation />}
      {!isReaderPage && <UnlimitedDownloadsPrompt />}
    </div>
  );
}

function App() {
  useEffect(() => {
    startPeriodicCleanup();
    
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        let refreshing = false;
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          registration.update();
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
          });
        } catch (e) {
          console.log('SW registration failed:', e);
        }
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <HelmetProvider>
          <AuthProvider>
            <FavoritesProvider>
              <ThemeProvider>
                <NotificationProvider>
                  <AppContent />
                </NotificationProvider>
              </ThemeProvider>
            </FavoritesProvider>
          </AuthProvider>
        </HelmetProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;