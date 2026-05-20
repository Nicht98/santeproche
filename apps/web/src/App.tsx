import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home } from './pages/Home';
import { SearchResults } from './pages/SearchResults';
import { FacilityDetail } from './pages/FacilityDetail';
import { Chat } from './pages/Chat';
import { Booking } from './pages/Booking';
import { PatientRegister } from './pages/PatientRegister';
import { ProviderRegister } from './pages/ProviderRegister';
import { ProviderDashboard } from './pages/ProviderDashboard';
import { Layout } from './components/Layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/facility/:id" element={<FacilityDetail />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/book" element={<Booking />} />
            <Route path="/register/patient" element={<PatientRegister />} />
            <Route path="/register/provider" element={<ProviderRegister />} />
            <Route path="/dashboard" element={<ProviderDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
