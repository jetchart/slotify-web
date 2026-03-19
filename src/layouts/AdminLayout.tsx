import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Building2,
  Box,
  CalendarDays,
  CalendarOff,
  Ban,
  Users,
  LogOut,
  Menu,
} from 'lucide-react';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/business', label: 'Mi Negocio', icon: Building2 },
  { to: '/admin/resources', label: 'Agendas', icon: Box },
  { to: '/admin/exceptions', label: 'Excepciones', icon: CalendarOff },
  { to: '/admin/blocks', label: 'Bloqueos', icon: Ban },
  { to: '/admin/bookings', label: 'Turnos', icon: CalendarDays },
  { to: '/admin/users', label: 'Usuarios', icon: Users },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const visibleNavItems = isAdmin === true
    ? navItems
    : navItems.filter((item) => item.to !== '/admin/users');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <h1 className="text-lg font-semibold tracking-tight">Slotify</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Panel de administración</p>
      </div>
      <Separator />
      <nav className="flex-1 p-3 space-y-1">
        {visibleNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              }`
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <Separator />
      <div className="p-4 space-y-3">
        {user && (
          <div className="flex items-center gap-3">
            {user.pictureUrl && (
              <img
                src={user.pictureUrl}
                alt={user.name}
                className="size-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
          <LogOut className="size-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r bg-sidebar text-sidebar-foreground flex-col">
        <NavContent />
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-sidebar text-sidebar-foreground">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="size-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground">
              <NavContent onNavigate={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="font-semibold text-sm">Slotify</span>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
