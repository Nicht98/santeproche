import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Stethoscope, MapPin, MessageSquare, User, Navigation } from 'lucide-react';
import { useAuthStore } from '../stores/auth';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.isGuest);
  const isProvider = useAuthStore((s) => s.isProvider);
  const hideNav = location.pathname === '/login' || location.pathname.startsWith('/register');

  // Unauthenticated (not guest) → bare outlet, no nav wrapper
  if (!isAuth && !isGuest && !hideNav) {
    return <Outlet />;
  }

  // For guests: hide nav on pages that require auth (they'll be redirected to login)
  const isGuestAuthRoute =
    isGuest &&
    ['/chat', '/profile', '/appointments', '/book'].some((p) =>
      location.pathname.startsWith(p)
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-20">
        <Outlet />
      </main>

      {/* Bottom nav visible for authenticated users everywhere, for guests only on public pages */}
      {!hideNav && !isGuestAuthRoute && (
        <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
          <div className="mx-auto flex max-w-lg justify-around py-1">
            <NavItem icon={Home} label="Accueil" onClick={() => navigate('/')} active={location.pathname === '/'} />
            {isProvider ? (
              <>
                <NavItem icon={Stethoscope} label="Dashboard" onClick={() => navigate('/dashboard')} active={location.pathname === '/dashboard'} />
                <NavItem icon={MessageSquare} label="Chat" onClick={() => navigate('/chat')} active={location.pathname === '/chat'} />
                <NavItem icon={User} label="Profil" onClick={() => navigate('/profile')} active={location.pathname === '/profile'} />
              </>
            ) : (
              <>
                <NavItem icon={Stethoscope} label="Annuaire" onClick={() => navigate('/providers')} active={location.pathname === '/providers' || location.pathname.startsWith('/provider/')} />
                <NavItem icon={Navigation} label="À proximité" onClick={() => navigate('/nearby')} active={location.pathname === '/nearby' || location.pathname.startsWith('/facility/')} />
                <NavItem icon={MapPin} label="Établissements" onClick={() => navigate('/facilities')} active={location.pathname === '/facilities'} />
                <NavItem icon={MessageSquare} label="Chat" onClick={() => navigate('/chat')} active={location.pathname === '/chat'} />
                <NavItem icon={User} label="Profil" onClick={() => navigate('/profile')} active={location.pathname === '/profile'} />
              </>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

function NavItem({ icon: Icon, label, onClick, active }: { icon: typeof Home; label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${active ? 'text-brand-600' : 'text-gray-400'}`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
