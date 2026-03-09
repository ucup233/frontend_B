'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, ChevronDown, ChevronRight, Menu } from 'lucide-react';

interface NavChild {
  href: string;
  label: string;
  icon: string;
  roles?: string[];
}

interface NavItem {
  href?: string;
  label: string;
  icon: string;
  children?: NavChild[];
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/muzakki', label: 'Muzakki', icon: '🧑‍💼', roles: ['superadmin', 'pendistribusian', 'keuangan', 'penerimaan'] },
  { href: '/pelayanan', label: 'Mustahiq', icon: '👥' },
  { href: '/distribusi', label: 'Distribusi', icon: '📦' },
  { href: '/pengumpulan', label: 'Penerimaan', icon: '💵', roles: ['superadmin', 'pendistribusian', 'keuangan', 'penerimaan'] },
  { href: '/migrasi-excel', label: 'Migrasi Excel', icon: '📁' },
  { href: '/laporan', label: 'Laporan & Export', icon: '📄' },
  {
    label: 'Administrasi',
    icon: '⚙️',
    roles: ['superadmin'],
    children: [
      { href: '/admin/users', label: 'Manajemen User', icon: '👤' },
      { href: '/admin/reference', label: 'Data Referensi', icon: '📚' },
    ],
  },
];

function NavGroup({ item, pathname, isCollapsed }: { item: NavItem; pathname: string; isCollapsed: boolean }) {
  const isChildActive = item.children?.some((c) => pathname.startsWith(c.href)) ?? false;
  const [open, setOpen] = useState(isChildActive);

  if (item.href) {
    // Simple link
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <li>
        <Link
          href={item.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${active
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'hover:bg-sidebar-primary hover:text-sidebar-primary-foreground'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
          title={isCollapsed ? item.label : undefined}
        >
          <span className="text-lg">{item.icon}</span>
          {!isCollapsed && <span>{item.label}</span>}
        </Link>
      </li>
    );
  }

  // Group with children (dropdown)
  return (
    <li>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${isChildActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'hover:bg-sidebar-primary hover:text-sidebar-primary-foreground'
          } ${isCollapsed ? 'justify-center px-0' : ''}`}
        title={isCollapsed ? item.label : undefined}
      >
        <span className="text-lg">{item.icon}</span>
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </>
        )}
      </button>

      {open && !isCollapsed && (
        <ul className="mt-1 ml-4 space-y-1 border-l border-sidebar-border pl-3">
          {item.children?.map((child) => {
            const active = pathname === child.href || pathname.startsWith(child.href + '/');
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                    : 'hover:bg-sidebar-primary hover:text-sidebar-primary-foreground'
                    }`}
                >
                  <span className="text-xs">{child.icon}</span>
                  <span>{child.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-primary text-primary-foreground shadow-sm">
        <div className="flex h-16 w-full items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="BAZNAS Batam" className="h-10 w-auto" />
            </div>
            <div className="hidden text-sm md:block">
              Sistem Manajemen Dana Zakat Batam
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{user?.nama}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-primary-foreground border border-primary-foreground/50 hover:bg-primary-foreground hover:text-primary"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Sidebar Navigation */}
        <nav className={`hidden shrink-0 border-r border-border bg-sidebar text-sidebar-foreground md:block transition-all duration-300 sticky top-16 h-[calc(100vh-4rem)] z-40 ${isCollapsed ? 'w-0 overflow-hidden border-none' : 'w-64 overflow-y-auto overflow-x-hidden'}`}>
          <div className={`p-4 transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
            <ul className="space-y-1">
              {navItems
                .filter(item => !item.roles || (user && item.roles.includes(user.role)))
                .map((item) => {
                  const filteredChildren = item.children?.filter(child => !child.roles || (user && child.roles.includes(user.role)));
                  const filteredItem = { ...item, children: filteredChildren };
                  return (
                    <NavGroup
                      key={item.href ?? item.label}
                      item={filteredItem}
                      pathname={pathname}
                      isCollapsed={isCollapsed}
                    />
                  );
                })
              }
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
