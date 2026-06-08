'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Moon, Sun, Search, Phone, AlertCircle, Calendar, X, RotateCw } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getInitials, PIPELINE_STAGES } from '@/lib/utils';
import { api } from '@/lib/api';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/agenda': 'Agenda',
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
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const [showReminders, setShowReminders] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const title = Object.entries(titles).find(([k]) => pathname.startsWith(k))?.[1] || 'CRM';

  // Busca lembretes (leads com próximo contato hoje ou vencido)
  const { data: reminders = [] } = useQuery<any[]>({
    queryKey: ['reminders'],
    queryFn: () => api.get('/dashboard/reminders').then(r => r.data),
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 min
  });

  const overdueCount = reminders.filter(r => r.overdue).length;
  const totalCount = reminders.length;

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowReminders(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

        {/* Botão atualizar */}
        <button
          onClick={() => {
            setRefreshing(true);
            router.refresh();
            setTimeout(() => setRefreshing(false), 1000);
          }}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Atualizar página"
        >
          <RotateCw className={`w-4 h-4 transition-transform duration-700 ${refreshing ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Sino de lembretes */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setShowReminders(v => !v)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
            title="Lembretes de contato"
          >
            <Bell className="w-4 h-4" />
            {totalCount > 0 && (
              <span className={`absolute top-1 right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full text-white text-[9px] font-bold ${overdueCount > 0 ? 'bg-red-500' : 'bg-blue-500'}`}>
                {totalCount > 9 ? '9+' : totalCount}
              </span>
            )}
          </button>

          {/* Dropdown de lembretes */}
          {showReminders && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-700">
                <div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-white">Lembretes de Contato</p>
                  {overdueCount > 0 && (
                    <p className="text-xs text-red-500 mt-0.5">{overdueCount} vencido{overdueCount > 1 ? 's' : ''}</p>
                  )}
                </div>
                <button onClick={() => setShowReminders(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Lista */}
              <div className="max-h-80 overflow-y-auto">
                {reminders.length === 0 && (
                  <div className="py-8 text-center text-sm text-slate-400">
                    ✅ Nenhum contato pendente
                  </div>
                )}
                {reminders.map((lead: any) => (
                  <button
                    key={lead.id}
                    onClick={() => { router.push(`/leads/${lead.id}`); setShowReminders(false); }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-b dark:border-slate-800 last:border-0"
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${lead.overdue ? 'bg-red-50 dark:bg-red-950/30' : 'bg-blue-50 dark:bg-blue-950/30'}`}>
                      {lead.overdue
                        ? <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        : <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{lead.name}</p>
                      {lead.nextAction && (
                        <p className="text-xs text-slate-500 truncate">{lead.nextAction}</p>
                      )}
                      <p className={`text-xs font-medium mt-0.5 ${lead.overdue ? 'text-red-500' : 'text-blue-500'}`}>
                        {lead.overdue ? '⚠️ Vencido — ' : '📅 Hoje — '}
                        {new Date(lead.nextContactAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <a
                      href={`tel:${lead.phone}`}
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-500 shrink-0"
                      title="Ligar"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </button>
                ))}
              </div>

              {reminders.length > 0 && (
                <div className="px-4 py-2.5 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <button
                    onClick={() => { router.push('/leads'); setShowReminders(false); }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Ver todos os leads →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
          {user ? getInitials(user.name) : 'U'}
        </div>
      </div>
    </header>
  );
}
