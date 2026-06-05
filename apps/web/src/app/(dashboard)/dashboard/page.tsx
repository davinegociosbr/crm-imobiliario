'use client';
import { useQuery } from '@tanstack/react-query';
import {
  Users, TrendingUp, Calendar, DollarSign, Target, BarChart2,
  ArrowUpRight, CheckCircle, Clock, Percent,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface Metric {
  totalLeads: number;
  newLeads: number;
  inProgressLeads: number;
  scheduledVisits: number;
  completedVisits: number;
  totalSales: number;
  totalSoldValue: number;
  avgTicket: number;
  totalCommission: number;
  conversionRate: number;
  overdueTasks: number;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'];

function MetricCard({ title, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: metrics } = useQuery<Metric>({
    queryKey: ['dashboard-metrics'],
    queryFn: () => api.get('/dashboard/metrics').then((r) => r.data),
  });

  const { data: salesByMonth } = useQuery<any[]>({
    queryKey: ['sales-by-month'],
    queryFn: () => api.get('/dashboard/sales-by-month').then((r) => r.data),
  });

  const { data: leadsByOrigin } = useQuery<any[]>({
    queryKey: ['leads-by-origin'],
    queryFn: () => api.get('/dashboard/leads-by-origin').then((r) => r.data),
  });

  const { data: stages } = useQuery<any[]>({
    queryKey: ['conversion-by-stage'],
    queryFn: () => api.get('/dashboard/conversion-by-stage').then((r) => r.data),
  });

  const { data: pipelineStages } = useQuery<any[]>({
    queryKey: ['leads-by-pipeline'],
    queryFn: () => api.get('/dashboard/leads-by-pipeline').then((r) => r.data),
  });

  const { data: brokers } = useQuery<any[]>({
    queryKey: ['broker-performance'],
    queryFn: () => api.get('/dashboard/broker-performance').then((r) => r.data),
  });

  const stageLabels: Record<string, string> = {
    INITIAL_CONTACT: 'Contato',
    QUALIFICATION: 'Qualificação',
    NEGOTIATION: 'Negociação',
    CONTRACT_SIGNING: 'Contrato',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total de Leads" value={metrics?.totalLeads || 0} icon={Users} color="bg-blue-600" sub="Todos os leads cadastrados" />
        <MetricCard title="Leads Novos" value={metrics?.newLeads || 0} icon={ArrowUpRight} color="bg-indigo-500" sub="Este mês" />
        <MetricCard title="Em Atendimento" value={metrics?.inProgressLeads || 0} icon={Clock} color="bg-amber-500" sub="Leads ativos" />
        <MetricCard title="Taxa de Conversão" value={`${metrics?.conversionRate || 0}%`} icon={Percent} color="bg-purple-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Visitas Agendadas" value={metrics?.scheduledVisits || 0} icon={Calendar} color="bg-cyan-500" sub="Este mês" />
        <MetricCard title="Visitas Realizadas" value={metrics?.completedVisits || 0} icon={CheckCircle} color="bg-emerald-500" />
        <MetricCard title="Vendas Realizadas" value={metrics?.totalSales || 0} icon={TrendingUp} color="bg-green-600" />
        <MetricCard title="Valor Vendido" value={formatCurrency(metrics?.totalSoldValue || 0)} icon={DollarSign} color="bg-green-700" sub={`Ticket médio: ${formatCurrency(metrics?.avgTicket || 0)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Vendas por Mês</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={salesByMonth || []}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [v, 'Qtd']} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#colorValue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Leads por Origem</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={leadsByOrigin || []} dataKey="count" nameKey="origin" cx="50%" cy="50%" outerRadius={80} label={({ origin, percent }) => `${origin} ${(percent * 100).toFixed(0)}%`}>
                {(leadsByOrigin || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Leads por Etapa do Funil</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pipelineStages || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="label" type="category" tick={{ fontSize: 10 }} width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Performance dos Corretores</h3>
          <div className="space-y-3">
            {(brokers || []).map((b: any) => (
              <div key={b.user.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                  {b.user.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{b.user.name}</p>
                  <p className="text-xs text-slate-500">{b.leads} leads · {b.sales} vendas</p>
                </div>
                <span className="text-sm font-semibold text-green-600">{formatCurrency(b.commission)}</span>
              </div>
            ))}
            {!brokers?.length && <p className="text-sm text-slate-400 text-center py-8">Nenhum dado disponível</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
