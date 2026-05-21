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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 3 * 60 * 1000, retry: 1 },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isProfileComplete } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isProfileComplete) return <Navigate to="/register/patient" replace />;
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
          <Route element={<Layout />}>
            <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
            <Route path="/providers" element={<RequireAuth><Providers /></RequireAuth>} />
            <Route path="/provider/:id" element={<RequireAuth><ProviderDetail /></RequireAuth>} />
            <Route path="/facilities" element={<RequireAuth><Facilities /></RequireAuth>} />
            <Route path="/facility/:id" element={<RequireAuth><FacilityDetail /></RequireAuth>} />
            <Route path="/appointments" element={<RequireAuth><Appointments /></RequireAuth>} />
            <Route path="/book" element={<RequireAuth><Booking /></RequireAuth>} />
            <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
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
