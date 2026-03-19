import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';
import { AdminRoute } from '@/components/AdminRoute';
import LoginPage from '@/pages/LoginPage';
import AdminLayout from '@/layouts/AdminLayout';
import DashboardPage from '@/pages/admin/DashboardPage';
import ResourcesPage from '@/pages/admin/ResourcesPage';
import AvailabilityPage from '@/pages/admin/AvailabilityPage';
import BookingsPage from '@/pages/admin/BookingsPage';
import ExceptionsPage from '@/pages/admin/ExceptionsPage';
import BlocksPage from '@/pages/admin/BlocksPage';
import UsersPage from '@/pages/admin/UsersPage';
import BusinessPage from '@/pages/admin/BusinessPage';
import BookingPublicPage from '@/pages/BookingPublicPage';
import BusinessBookingPage from '@/pages/BusinessBookingPage';
import OnboardingPage from '@/pages/OnboardingPage';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/book/:resourceId" element={<BookingPublicPage />} />
            <Route path="/:slug" element={<BusinessBookingPage />} />

            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<DashboardPage />} />
                <Route path="/admin/business" element={<BusinessPage />} />
                <Route path="/admin/resources" element={<ResourcesPage />} />
                <Route path="/admin/resources/:id/availability" element={<AvailabilityPage />} />
                <Route path="/admin/bookings" element={<BookingsPage />} />
                <Route path="/admin/exceptions" element={<ExceptionsPage />} />
                <Route path="/admin/blocks" element={<BlocksPage />} />
                <Route path="/admin/users" element={<UsersPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
