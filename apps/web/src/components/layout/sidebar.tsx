'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Kanban, Building2, Calendar,
  FileText, Key, TrendingUp, DollarSign, CheckSquare,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
  MessageCircle, CalendarDays, Wallet, Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/leads', label: 'Clientes / Leads', icon: Users },
  { href: '/pipeline', label: 'Funil de Vendas', icon: Kanban },
  { href: '/properties', label: 'Imóveis', icon: Building2 },
  { href: '/visits', label: 'Visitas', icon: Calendar },
  { href: '/proposals', label: 'Propostas', icon: FileText },
  { href: '/reservations', label: 'Reservas', icon: Key },
  { href: '/sales', label: 'Vendas', icon: TrendingUp },
  { href: '/commissions', label: 'Comissões', icon: DollarSign },
  { href: '/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/tasks', label: 'Tarefas', icon: CheckSquare },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
  { href: '/simulacao', label: 'Simulação', icon: Calculator },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className={cn(
      'flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 relative',
      collapsed ? 'w-16' : 'w-64',
    )}>
      <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
        <div className="shrink-0">
          <Image
            src="/logo-brolezi-white.png"
            alt="Brolezi"
            width={collapsed ? 28 : 36}
            height={collapsed ? 28 : 36}
            className="object-contain"
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-semibold text-sm truncate">{user?.company?.name || 'Brolezi'}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.name}</p>
          </div>
        )}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-sidebar border border-sidebar-border rounded-full flex items-center justify-center z-10 hover:bg-sidebar-accent"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );
}
