import { Outlet, useLocation } from 'react-router-dom';
import { Home, Stethoscope, MapPin, MessageSquare, User } from 'lucide-react';
import { useAuthStore } from '../stores/auth';

export function Layout() {
  const location = useLocation();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const isProfileComplete = useAuthStore((s) => s.isProfileComplete);
  const hideNav = location.pathname === '/login' || location.pathname.startsWith('/register');

  if (!isAuth || !isProfileComplete) {
    // Only allow /login and /register/patient without being fully onboarded
    if (!hideNav && location.pathname !== '/') {
      return <Outlet />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-20">
        <Outlet />
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
          <div className="mx-auto flex max-w-lg justify-around py-1">
            <NavItem icon={Home} label="Accueil" to="/" active={location.pathname === '/'} />
            <NavItem icon={Stethoscope} label="Annuaire" to="/providers" active={location.pathname === '/providers' || location.pathname.startsWith('/provider/')} />
            <NavItem icon={MapPin} label="Lieux" to="/facilities" active={location.pathname === '/facilities' || location.pathname.startsWith('/facility/')} />
            <NavItem icon={MessageSquare} label="Chat" to="/chat" active={location.pathname === '/chat'} />
            <NavItem icon={User} label="Profil" to="/profile" active={location.pathname === '/profile'} />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavItem({ icon: Icon, label, to: _ignore, active }: { icon: typeof Home; label: string; to: string; active: boolean }) {
  return (
    <button
      className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${active ? 'text-brand-600' : 'text-gray-400'}`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
