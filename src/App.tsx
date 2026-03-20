import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';
import { AdminRoute } from '@/components/AdminRoute';
import { RequireBusiness, RequireAvailability } from '@/components/RequireBusiness';
import LoginPage from '@/pages/LoginPage';
import AdminLayout from '@/layouts/AdminLayout';
import DashboardPage from '@/pages/admin/DashboardPage';
import ResourcesPage from '@/pages/admin/ResourcesPage';
import AvailabilityPage from '@/pages/admin/AvailabilityPage';
import BookingsPage from '@/pages/admin/BookingsPage';
import UsersPage from '@/pages/admin/UsersPage';
import BusinessPage from '@/pages/admin/BusinessPage';
import AvailabilitySummaryPage from '@/pages/admin/AvailabilitySummaryPage';
import HomePage from '@/pages/HomePage';
import BookingPublicPage from '@/pages/BookingPublicPage';
import BusinessBookingPage from '@/pages/BusinessBookingPage';
import OnboardingPage from '@/pages/OnboardingPage';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/book/:resourceId" element={<BookingPublicPage />} />
            <Route path="/:slug" element={<BusinessBookingPage />} />

            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<RequireBusiness><RequireAvailability><DashboardPage /></RequireAvailability></RequireBusiness>} />
                <Route path="/admin/business" element={<BusinessPage />} />
                <Route path="/admin/resources" element={<RequireBusiness><RequireAvailability><ResourcesPage /></RequireAvailability></RequireBusiness>} />
                <Route path="/admin/resources/:id/availability" element={<RequireBusiness><RequireAvailability><AvailabilityPage /></RequireAvailability></RequireBusiness>} />
                <Route path="/admin/availability-summary" element={<RequireBusiness><RequireAvailability><AvailabilitySummaryPage /></RequireAvailability></RequireBusiness>} />
                <Route path="/admin/bookings" element={<RequireBusiness><RequireAvailability><BookingsPage /></RequireAvailability></RequireBusiness>} />
                <Route path="/admin/exceptions" element={<Navigate to="/admin/business?tab=excepciones" replace />} />
                <Route path="/admin/blocks" element={<Navigate to="/admin/business?tab=bloqueos" replace />} />
                <Route path="/admin/users" element={<UsersPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
