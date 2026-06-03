'use client';
import { usePathname } from 'next/navigation';
import { Bell, Moon, Sun, Search } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store/auth.store';
import { getInitials } from '@/lib/utils';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Clientes & Leads',
  '/pipeline': 'Funil de Vendas',
  '/properties': 'Imóveis',
  '/visits': 'Visitas',
  '/proposals': 'Propostas',
  '/reservations': 'Reservas',
  '/sales': 'Vendas',
  '/commissions': 'Comissões',
  '/tasks': 'Tarefas',
  '/reports': 'Relatórios',
  '/settings': 'Configurações',
};

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();

  const title = Object.entries(titles).find(([k]) => pathname.startsWith(k))?.[1] || 'CRM';

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-white">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Buscar..."
            className="pl-9 pr-4 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
          {user ? getInitials(user.name) : 'U'}
        </div>
      </div>
    </header>
  );
}
