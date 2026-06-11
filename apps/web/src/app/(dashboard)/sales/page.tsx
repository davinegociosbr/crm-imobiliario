'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, TrendingUp, DollarSign, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SaleModal } from '@/components/sales/sale-modal';

function CommissionBadge({ sale }: { sale: any }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (status: string) => api.put(`/sales/${sale.id}/commission-status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales'] }); toast.success('Status atualizado!'); },
    onError: () => toast.error('Erro ao atualizar'),
  });
  const received = sale.commissionStatus === 'RECEIVED';
  return (
    <button onClick={() => mutation.mutate(received ? 'PENDING' : 'RECEIVED')}
      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${received ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
      {received ? '✓ Recebida' : '⏳ Pendente'}
    </button>
  );
}

export default function SalesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editSale, setEditSale] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: () => api.get('/sales').then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sales/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales'] }); qc.invalidateQueries({ queryKey: ['sales-summary'] }); toast.success('Venda excluída!'); setDeleteConfirm(null); },
    onError: () => toast.error('Erro ao excluir'),
  });

  const { data: summary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => api.get('/sales/summary').then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Vendas', value: summary?.count || 0, icon: TrendingUp, color: 'bg-blue-600' },
          { label: 'Valor Vendido', value: formatCurrency(summary?.totalValue || 0), icon: DollarSign, color: 'bg-green-600' },
          { label: 'Ticket Médio', value: formatCurrency(summary?.avgTicket || 0), icon: TrendingUp, color: 'bg-indigo-600' },
          { label: 'Comissões', value: formatCurrency(summary?.totalCommission || 0), icon: DollarSign, color: 'bg-amber-500' },
        ].map((m) => (
          <div key={m.label} className="bg-white dark:bg-slate-900 rounded-xl p-5 border flex items-center gap-4">
            <div className={`p-3 rounded-xl ${m.color}`}><m.icon className="w-5 h-5 text-white" /></div>
            <div><p className="text-xs text-slate-500">{m.label}</p><p className="text-xl font-bold">{m.value}</p></div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" />Registrar Venda
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
              {['Cliente', 'Imóvel', 'Valor', 'Comissão', 'Status Comissão', 'Corretor', 'Data', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="text-center py-12 text-slate-400">Carregando...</td></tr>}
            {(sales || []).map((s: any) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium">{s.lead?.name}</td>
                <td className="px-4 py-3 text-slate-600">{s.property?.code} - {s.property?.name}</td>
                <td className="px-4 py-3 font-semibold text-green-700">{formatCurrency(Number(s.saleValue))}</td>
                <td className="px-4 py-3 text-amber-700">{formatCurrency(Number(s.commissionValue))} ({s.commissionPercent}%)</td>
                <td className="px-4 py-3"><CommissionBadge sale={s} /></td>
                <td className="px-4 py-3 text-slate-600">{s.user?.name}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(s.soldAt)}</td>
                <td className="px-4 py-3">
                  {deleteConfirm === s.id ? (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-slate-500">Excluir?</span>
                      <button onClick={() => deleteMutation.mutate(s.id)} className="text-red-600 font-medium hover:underline">Sim</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-slate-500 hover:underline">Não</button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => { setEditSale(s); setShowModal(true); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteConfirm(s.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && !sales?.length && <tr><td colSpan={7} className="text-center py-12 text-slate-400">Nenhuma venda registrada</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && <SaleModal sale={editSale} onClose={() => { setShowModal(false); setEditSale(null); }} />}
    </div>
  );
}
