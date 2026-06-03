'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  RECEIVED: { label: 'Recebida', color: 'bg-blue-100 text-blue-700' },
  PAID: { label: 'Paga', color: 'bg-green-100 text-green-700' },
};

export default function CommissionsPage() {
  const qc = useQueryClient();
  const { data: commissions, isLoading } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => api.get('/commissions').then((r) => r.data.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['commissions-summary'],
    queryFn: () => api.get('/commissions/summary').then((r) => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/commissions/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commissions'] }); toast.success('Status atualizado'); },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(summary || []).slice(0, 3).map((b: any) => (
          <div key={b.user.id} className="bg-white dark:bg-slate-900 rounded-xl border p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">{b.user.name[0]}</div>
              <p className="font-semibold">{b.user.name}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Pendente</span><span className="text-amber-600 font-medium">{formatCurrency(b.pending.value)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Recebida</span><span className="text-blue-600 font-medium">{formatCurrency(b.received.value)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Paga</span><span className="text-green-600 font-medium">{formatCurrency(b.paid.value)}</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
              {['Corretor', 'Venda', 'Valor', 'Status', 'Ações'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="text-center py-12 text-slate-400">Carregando...</td></tr>}
            {(commissions || []).map((c: any) => {
              const s = STATUS[c.status];
              return (
                <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium">{c.user?.name}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    <p>{c.sale?.lead?.name}</p>
                    <p className="text-slate-400">{c.sale?.property?.name}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-700">{formatCurrency(Number(c.value))}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s?.color}`}>{s?.label}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {c.status === 'PENDING' && (
                        <button onClick={() => updateStatus.mutate({ id: c.id, status: 'RECEIVED' })} className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100">Recebida</button>
                      )}
                      {c.status === 'RECEIVED' && (
                        <button onClick={() => updateStatus.mutate({ id: c.id, status: 'PAID' })} className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100">Marcar Paga</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
