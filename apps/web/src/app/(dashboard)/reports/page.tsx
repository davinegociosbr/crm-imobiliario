'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Users, DollarSign, Percent, Target, ArrowUp, ArrowDown } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, LEAD_ORIGINS, LEAD_STATUS } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const ORIGIN_COLORS: Record<string, string> = {
  WHATSAPP: '#22c55e', INSTAGRAM: '#a855f7', REFERRAL: '#f59e0b',
  PORTAL_IMOVEIS: '#3b82f6', FACEBOOK: '#1d4ed8', SITE: '#06b6d4',
  INDICATION: '#f97316', OTHER: '#94a3b8',
};

const STAGE_COLORS: Record<string, string> = {
  INITIAL_CONTACT: '#3b82f6', REDIRECT: '#8b5cf6', ATTENDANCE: '#f59e0b',
  TODAY: '#10b981', FOLLOW_UP: '#f97316', CLIENTS: '#22c55e', INACTIVE: '#94a3b8',
};

export default function ReportsPage() {
  const [tab, setTab] = useState('performance');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const params = { startDate: startDate || undefined, endDate: endDate || undefined };

  const { data: kpi } = useQuery({
    queryKey: ['kpi', params],
    queryFn: () => api.get('/reports/kpi', { params }).then((r) => r.data),
  });

  const { data: salesReport } = useQuery({
    queryKey: ['sales-report', params],
    queryFn: () => api.get('/reports/sales', { params }).then((r) => r.data),
    enabled: tab === 'sales',
  });

  const { data: leadsReport } = useQuery({
    queryKey: ['leads-report', params],
    queryFn: () => api.get('/reports/leads', { params }).then((r) => r.data),
    enabled: tab === 'leads',
  });

  const { data: originData = [] } = useQuery<any[]>({
    queryKey: ['leads-by-origin'],
    queryFn: () => api.get('/dashboard/leads-by-origin').then(r => r.data),
    enabled: tab === 'performance',
  });

  const { data: pipelineData = [] } = useQuery<any[]>({
    queryKey: ['leads-by-pipeline'],
    queryFn: () => api.get('/dashboard/leads-by-pipeline').then(r => r.data),
    enabled: tab === 'performance',
  });

  const { data: salesByMonth = [] } = useQuery<any[]>({
    queryKey: ['sales-by-month'],
    queryFn: () => api.get('/dashboard/sales-by-month').then(r => r.data),
    enabled: tab === 'performance',
  });

  const originChartData = originData.map((o: any) => ({
    name: LEAD_ORIGINS[o.origin as keyof typeof LEAD_ORIGINS] || o.origin,
    value: o.count,
    color: ORIGIN_COLORS[o.origin] || '#94a3b8',
  })).filter(o => o.value > 0);

  const pipelineChartData = pipelineData.map((p: any) => ({
    name: p.label,
    leads: p.count,
    color: STAGE_COLORS[p.stage] || '#94a3b8',
  }));

  const totalLeadsOrigin = originChartData.reduce((acc, o) => acc + o.value, 0);

  return (
    <div className="space-y-5">
      {/* Filtros + Tabs */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-white dark:bg-slate-900 border rounded-lg p-1">
          {[
            { id: 'performance', label: 'Desempenho', icon: BarChart3 },
            { id: 'sales', label: 'Vendas', icon: TrendingUp },
            { id: 'leads', label: 'Leads', icon: Users },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700" />
          <span className="text-slate-400">até</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700" />
        </div>
      </div>

      {/* ── KPI Cards (sempre visíveis) ── */}
      {kpi && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: 'Total de Leads', value: kpi.totalLeads, icon: Users, color: 'bg-blue-600', sub: `${kpi.newLeads} novos` },
            { label: 'Em Andamento', value: kpi.inProgressLeads, icon: Target, color: 'bg-indigo-600', sub: 'em negociação' },
            { label: 'Conversão', value: `${kpi.conversionRate}%`, icon: Percent, color: 'bg-purple-600', sub: 'de leads' },
            { label: 'Vendas', value: kpi.totalSales, icon: TrendingUp, color: 'bg-green-600', sub: 'fechadas' },
            { label: 'Valor Total', value: formatCurrency(kpi.totalSoldValue), icon: DollarSign, color: 'bg-emerald-600', sub: 'em vendas' },
            { label: 'Ticket Médio', value: formatCurrency(kpi.avgTicket), icon: DollarSign, color: 'bg-amber-500', sub: 'por venda' },
          ].map((m) => (
            <div key={m.label} className="bg-white dark:bg-slate-900 rounded-xl p-4 border flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">{m.label}</p>
                <div className={`p-1.5 rounded-lg ${m.color}`}><m.icon className="w-3.5 h-3.5 text-white" /></div>
              </div>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{m.value}</p>
              <p className="text-xs text-slate-400">{m.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Aba Desempenho ── */}
      {tab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Leads por mês (bar chart) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border p-5">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Vendas por Mês</h3>
            {salesByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={salesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: any, name: string) => [name === 'count' ? `${v} venda(s)` : formatCurrency(v), name === 'count' ? 'Vendas' : 'Valor']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Vendas" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Nenhuma venda registrada</div>
            )}
          </div>

          {/* Origem dos leads (pie) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border p-5">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Leads por Origem</h3>
            {originChartData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={originChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                      {originChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} leads (${((v / totalLeadsOrigin) * 100).toFixed(0)}%)`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {originChartData.sort((a, b) => b.value - a.value).map((o) => (
                    <div key={o.name} className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} />
                      <span className="flex-1 text-slate-600 dark:text-slate-300 truncate">{o.name}</span>
                      <span className="font-semibold text-slate-800 dark:text-white">{o.value}</span>
                      <span className="text-xs text-slate-400">{((o.value / totalLeadsOrigin) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sem dados de origem</div>
            )}
          </div>

          {/* Funil de conversão por etapa */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border p-5 lg:col-span-2">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Leads por Etapa do Funil</h3>
            {pipelineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pipelineChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip formatter={(v: any) => [`${v} leads`, 'Leads']} />
                  <Bar dataKey="leads" radius={[0, 4, 4, 0]}>
                    {pipelineChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sem dados do funil</div>
            )}
          </div>
        </div>
      )}

      {/* ── Aba Vendas ── */}
      {tab === 'sales' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                {['Cliente', 'Imóvel', 'Corretor', 'Valor', 'Comissão', 'Data'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(salesReport || []).map((s: any) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3">{s.lead?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.property?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.user?.name}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{formatCurrency(Number(s.saleValue))}</td>
                  <td className="px-4 py-3 text-amber-700">{formatCurrency(Number(s.commissionValue))}</td>
                  <td className="px-4 py-3 text-slate-400">{new Date(s.soldAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
              {!salesReport?.length && <tr><td colSpan={6} className="text-center py-8 text-slate-400">Nenhuma venda no período</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Aba Leads ── */}
      {tab === 'leads' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                {['Nome', 'Telefone', 'Origem', 'Interesse', 'Status', 'Atividades', 'Cadastro'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(leadsReport || []).map((l: any) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium">{l.name}</td>
                  <td className="px-4 py-3 text-slate-600">{l.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{LEAD_ORIGINS[l.origin as keyof typeof LEAD_ORIGINS] || l.origin}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{l.interest || '-'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEAD_STATUS[l.status as keyof typeof LEAD_STATUS]?.color}`}>{LEAD_STATUS[l.status as keyof typeof LEAD_STATUS]?.label}</span></td>
                  <td className="px-4 py-3 text-center">{l._count?.activities}</td>
                  <td className="px-4 py-3 text-slate-400">{new Date(l.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
              {!leadsReport?.length && <tr><td colSpan={7} className="text-center py-8 text-slate-400">Nenhum lead no período</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
