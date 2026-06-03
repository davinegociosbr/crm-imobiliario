'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Users, Calendar, DollarSign, Percent } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, LEAD_ORIGINS, LEAD_STATUS } from '@/lib/utils';

export default function ReportsPage() {
  const [tab, setTab] = useState('kpi');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const params = { startDate: startDate || undefined, endDate: endDate || undefined };

  const { data: kpi } = useQuery({
    queryKey: ['kpi', params],
    queryFn: () => api.get('/reports/kpi', { params }).then((r) => r.data),
    enabled: tab === 'kpi',
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

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-white border rounded-lg p-1">
          {[
            { id: 'kpi', label: 'KPIs', icon: BarChart3 },
            { id: 'sales', label: 'Vendas', icon: TrendingUp },
            { id: 'leads', label: 'Leads', icon: Users },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded-lg text-sm" />
          <span className="text-slate-400">até</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded-lg text-sm" />
        </div>
      </div>

      {tab === 'kpi' && kpi && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Total de Leads', value: kpi.totalLeads, icon: Users, color: 'bg-blue-600' },
            { label: 'Leads Convertidos', value: kpi.convertedLeads, icon: TrendingUp, color: 'bg-green-600' },
            { label: 'Taxa de Conversão', value: `${kpi.conversionRate}%`, icon: Percent, color: 'bg-purple-600' },
            { label: 'Total de Vendas', value: kpi.totalSales, icon: TrendingUp, color: 'bg-indigo-600' },
            { label: 'Valor Total', value: formatCurrency(kpi.totalSalesValue), icon: DollarSign, color: 'bg-emerald-600' },
            { label: 'Ticket Médio', value: formatCurrency(kpi.avgTicket), icon: DollarSign, color: 'bg-amber-500' },
          ].map((m) => (
            <div key={m.label} className="bg-white dark:bg-slate-900 rounded-xl p-5 border flex items-center gap-4">
              <div className={`p-3 rounded-xl ${m.color}`}><m.icon className="w-5 h-5 text-white" /></div>
              <div><p className="text-xs text-slate-500">{m.label}</p><p className="text-2xl font-bold mt-0.5">{m.value}</p></div>
            </div>
          ))}

          <div className="col-span-2 lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border p-5">
            <h3 className="font-semibold mb-3">Visitas por Status</h3>
            <div className="flex flex-wrap gap-3">
              {(kpi.visitStats || []).map((s: any) => (
                <div key={s.status} className="bg-slate-50 rounded-lg px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{s._count}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'sales' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                {['Cliente', 'Imóvel', 'Corretor', 'Valor', 'Comissão', 'Data'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(salesReport || []).map((s: any) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50">
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

      {tab === 'leads' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                {['Nome', 'Telefone', 'Origem', 'Interesse', 'Status', 'Atividades', 'Cadastro'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(leadsReport || []).map((l: any) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50">
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
