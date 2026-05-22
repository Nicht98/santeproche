import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from './stores/auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Providers } from './pages/Providers';
import { ProviderDetail } from './pages/ProviderDetail';
import { Facilities } from './pages/Facilities';
import { FacilityDetail } from './pages/FacilityDetail';
import { Appointments } from './pages/Appointments';
import { AppointmentDetail } from './pages/AppointmentDetail';
import { Booking } from './pages/Booking';
import { Chat } from './pages/Chat';
import { SearchPage } from './pages/SearchPage';
import { PatientRegister } from './pages/PatientRegister';
import { Profile } from './pages/Profile';

import { ProviderDashboard } from './pages/ProviderDashboard';
import { ProviderRegister } from './pages/ProviderRegister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 3 * 60 * 1000, retry: 1 },
  },
});

/* Generic auth guard: guests allowed on public pages, auth required on protected */
/* Allows incomplete profiles to pass through (caller handles profile redirect) */
function AuthOrGuest({ children, allowGuest = false }: { children: React.ReactNode; allowGuest?: boolean }) {
  const { isAuthenticated, isGuest } = useAuthStore();

  if (isAuthenticated) return <>{children}</>;
  if (isGuest && allowGuest) return <>{children}</>;
  if (isGuest && !allowGuest) return <Navigate to="/login" replace />;
  return <Navigate to="/login" replace />;
}

/* Patient-only guard: redirect providers away from patient routes */
function PatientOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isProfileComplete, isProvider, isGuest } = useAuthStore();

  if (isGuest) return <Navigate to="/login" replace />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isProvider && !isProfileComplete) return <Navigate to="/register/provider" replace />;
  if (isProvider) return <Navigate to="/dashboard" replace />;
  if (!isProfileComplete) return <Navigate to="/register/patient" replace />;
  return <>{children}</>;
}

/* Provider-only guard: redirect patients away from provider routes */
function ProviderOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isProfileComplete, isPatient, isGuest } = useAuthStore();

  if (isGuest) return <Navigate to="/login" replace />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isPatient && !isProfileComplete) return <Navigate to="/register/patient" replace />;
  if (isPatient) return <Navigate to="/" replace />;
  if (!isProfileComplete) return <Navigate to="/register/provider" replace />;
  return <>{children}</>;
}

function AuthGate() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register/patient" element={<PatientRegister />} />
          <Route path="/register/provider" element={<ProviderRegister />} />
          <Route element={<Layout />}>
            {/* Public routes (guest OK) */}
            <Route path="/" element={<AuthOrGuest allowGuest><Home /></AuthOrGuest>} />
            <Route path="/providers" element={<AuthOrGuest allowGuest><Providers /></AuthOrGuest>} />
            <Route path="/provider/:id" element={<AuthOrGuest allowGuest><ProviderDetail /></AuthOrGuest>} />
            <Route path="/facilities" element={<AuthOrGuest allowGuest><Facilities /></AuthOrGuest>} />
            <Route path="/facility/:id" element={<AuthOrGuest allowGuest><FacilityDetail /></AuthOrGuest>} />

            {/* Protected patient routes: patients only */}
            <Route path="/appointments" element={<PatientOnly><Appointments /></PatientOnly>} />
            <Route path="/appointment/:id" element={<PatientOnly><AppointmentDetail /></PatientOnly>} />
            <Route path="/book" element={<PatientOnly><Booking /></PatientOnly>} />

            {/* Protected shared routes */}
            <Route path="/chat" element={<AuthOrGuest><Chat /></AuthOrGuest>} />
            <Route path="/search" element={<AuthOrGuest allowGuest><SearchPage /></AuthOrGuest>} />
            <Route path="/profile" element={<AuthOrGuest><Profile /></AuthOrGuest>} />

            {/* Protected provider routes: providers only */}
            <Route path="/dashboard" element={<ProviderOnly><ProviderDashboard /></ProviderOnly>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function App() {
  return <AuthGate />;
}

export default App;
