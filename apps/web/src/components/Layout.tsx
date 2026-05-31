import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Stethoscope, MapPin, MessageSquare, User, Navigation, ClipboardList, HeartPulse } from 'lucide-react';
import { useAuthStore } from '../stores/auth';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.isGuest);
  const isProvider = useAuthStore((s) => s.isProvider);
  const hideNav = location.pathname === '/login' || location.pathname.startsWith('/register');

  if (!isAuth && !isGuest && !hideNav) {
    return <Outlet />;
  }

  const isGuestAuthRoute = isGuest && ['/chat', '/profile', '/appointments', '/book'].some((p) => location.pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <main className="pb-20">
        <Outlet />
      </main>

      {!hideNav && !isGuestAuthRoute && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-end justify-around pb-2 pt-1">
            <NavItem icon={Home} label="Accueil" onClick={() => navigate('/')} active={location.pathname === '/'} />
            {isProvider ? (
              <>
                <NavItem icon={ClipboardList} label="Dashboard" onClick={() => navigate('/dashboard')} active={location.pathname === '/dashboard'} />
                <NavItem icon={MessageSquare} label="Messages" onClick={() => navigate('/chat')} active={location.pathname === '/chat'} />
                <NavItem icon={User} label="Profil" onClick={() => navigate('/profile')} active={location.pathname === '/profile'} />
              </>
            ) : (
              <>
                <NavItem icon={Stethoscope} label="Annuaire" onClick={() => navigate('/providers')} active={location.pathname === '/providers' || location.pathname.startsWith('/provider/')} />
                <NavItem icon={Navigation} label="À proximité" onClick={() => navigate('/nearby')} active={location.pathname === '/nearby' || location.pathname.startsWith('/facility/')} />
                <NavItem icon={MapPin} label="Établiss." onClick={() => navigate('/facilities')} active={location.pathname === '/facilities'} />
                <NavItem icon={MessageSquare} label="Messages" onClick={() => navigate('/chat')} active={location.pathname === '/chat'} />
                <NavItem icon={User} label="Profil" onClick={() => navigate('/profile')} active={location.pathname === '/profile'} />
              </>
            )}
          </div>
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </nav>
      )}

      {/* Floating SOS button — always visible on patient routes */}
      {!hideNav && !isGuestAuthRoute && !isProvider && location.pathname !== '/sos' && (
        <button
          onClick={() => navigate('/sos')}
          className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-lg shadow-rose-500/30 transition-all duration-200 hover:scale-110 hover:shadow-xl active:scale-95"
          aria-label="SOS Urgence"
          title="SOS Urgence"
        >
          <HeartPulse className="h-6 w-6" />
          <span className="absolute inset-0 rounded-full ring-2 ring-white/30 animate-ping opacity-40" />
        </button>
      )}
    </div>
  );
}

function NavItem({ icon: Icon, label, onClick, active }: { icon: typeof Home; label: string; onClick: () => void; active: boolean }) {
  return (
    <button onClick={onClick} className="group relative flex flex-col items-center gap-0.5 px-2 py-1 transition-all duration-200">
      {active && <span className="absolute -top-1 h-1 w-8 rounded-full bg-brand-500 transition-all duration-300" />}
      <Icon className={`h-5 w-5 transition-all duration-200 ${active ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
      <span className={`text-[10px] font-medium transition-all duration-200 ${active ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`}>{label}</span>
    </button>
  );
}
