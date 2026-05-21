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
import { Booking } from './pages/Booking';
import { Chat } from './pages/Chat';
import { PatientRegister } from './pages/PatientRegister';
import { Profile } from './pages/Profile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 3 * 60 * 1000, retry: 1 },
  },
});

/* Allow guest users for public pages, redirect guests to /login for protected pages */
function AuthOrGuest({ children, allowGuest = false }: { children: React.ReactNode; allowGuest?: boolean }) {
  const { isAuthenticated, isProfileComplete, isGuest } = useAuthStore();

  // Fully authenticated + profile complete → OK
  if (isAuthenticated && isProfileComplete) return <>{children}</>;

  // Incomplete profile → force registration
  if (isAuthenticated && !isProfileComplete) return <Navigate to="/register/patient" replace />;

  // Guest on public route → OK
  if (isGuest && allowGuest) return <>{children}</>;

  // Guest on protected route → login
  if (isGuest && !allowGuest) return <Navigate to="/login" replace />;

  // Not logged in at all → login
  return <Navigate to="/login" replace />;
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
          <Route element={<Layout />}>
            {/* Public routes (guest OK) */}
            <Route path="/" element={<AuthOrGuest allowGuest><Home /></AuthOrGuest>} />
            <Route path="/providers" element={<AuthOrGuest allowGuest><Providers /></AuthOrGuest>} />
            <Route path="/provider/:id" element={<AuthOrGuest allowGuest><ProviderDetail /></AuthOrGuest>} />
            <Route path="/facilities" element={<AuthOrGuest allowGuest><Facilities /></AuthOrGuest>} />
            <Route path="/facility/:id" element={<AuthOrGuest allowGuest><FacilityDetail /></AuthOrGuest>} />

            {/* Protected routes (auth required) */}
            <Route path="/appointments" element={<AuthOrGuest><Appointments /></AuthOrGuest>} />
            <Route path="/book" element={<AuthOrGuest><Booking /></AuthOrGuest>} />
            <Route path="/chat" element={<AuthOrGuest><Chat /></AuthOrGuest>} />
            <Route path="/profile" element={<AuthOrGuest><Profile /></AuthOrGuest>} />
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
