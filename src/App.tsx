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
import PlanPage from '@/pages/admin/PlanPage';
import AvailabilitySummaryPage from '@/pages/admin/AvailabilitySummaryPage';
import HomePage from '@/pages/HomePage';
import BookingPublicPage from '@/pages/BookingPublicPage';
import BusinessBookingPage from '@/pages/BusinessBookingPage';
import ViewBookingPage from '@/pages/ViewBookingPage';
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
            <Route path="/:slug/bookings/:id" element={<ViewBookingPage />} />
            <Route path="/:slug" element={<BusinessBookingPage />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route element={<AdminRoute />}>
                <Route index element={<RequireBusiness><RequireAvailability><DashboardPage /></RequireAvailability></RequireBusiness>} />
                <Route path="business" element={<BusinessPage />} />
                <Route path="plan" element={<PlanPage />} />
                <Route path="resources" element={<RequireBusiness><RequireAvailability><ResourcesPage /></RequireAvailability></RequireBusiness>} />
                <Route path="resources/:id/availability" element={<RequireBusiness><RequireAvailability><AvailabilityPage /></RequireAvailability></RequireBusiness>} />
                <Route path="availability-summary" element={<RequireBusiness><RequireAvailability><AvailabilitySummaryPage /></RequireAvailability></RequireBusiness>} />
                <Route path="bookings" element={<RequireBusiness><RequireAvailability><BookingsPage /></RequireAvailability></RequireBusiness>} />
                <Route path="exceptions" element={<Navigate to="/admin/business?tab=excepciones" replace />} />
                <Route path="blocks" element={<Navigate to="/admin/business?tab=bloqueos" replace />} />
                <Route path="users" element={<UsersPage />} />
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
