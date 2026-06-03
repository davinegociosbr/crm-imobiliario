'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ProposalModal } from '@/components/proposals/proposal-modal';

const STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-slate-100 text-slate-600' },
  SENT: { label: 'Enviada', color: 'bg-blue-100 text-blue-700' },
  ACCEPTED: { label: 'Aceita', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Recusada', color: 'bg-red-100 text-red-700' },
  EXPIRED: { label: 'Expirada', color: 'bg-amber-100 text-amber-700' },
  NEGOTIATING: { label: 'Negociando', color: 'bg-purple-100 text-purple-700' },
};

export default function ProposalsPage() {
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => api.get('/proposals').then((r) => r.data.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/proposals/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proposals'] }); toast.success('Status atualizado'); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" />Nova Proposta
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading && <div className="col-span-2 text-center py-12 text-slate-400">Carregando...</div>}
        {(data || []).map((p: any) => {
          const s = STATUS[p.status];
          return (
            <div key={p.id} className="bg-white dark:bg-slate-900 rounded-xl border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">{p.lead?.name}</p>
                  <p className="text-sm text-blue-600">{p.property?.name} <span className="text-slate-400 text-xs">v{p.version}</span></p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${s?.color}`}>{s?.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-3">
                <div><p className="text-xs text-slate-400">Valor</p><p className="font-semibold text-slate-800">{formatCurrency(Number(p.propertyValue))}</p></div>
                {p.downPayment && <div><p className="text-xs text-slate-400">Entrada</p><p className="font-semibold text-slate-800">{formatCurrency(Number(p.downPayment))}</p></div>}
                {p.installments && <div><p className="text-xs text-slate-400">Parcelas</p><p className="font-semibold text-slate-800">{p.installments}x de {formatCurrency(Number(p.installmentValue))}</p></div>}
                <div><p className="text-xs text-slate-400">Data</p><p>{formatDate(p.createdAt)}</p></div>
              </div>
              <div className="flex gap-2">
                {p.status === 'DRAFT' && <button onClick={() => updateStatus.mutate({ id: p.id, status: 'SENT' })} className="px-3 py-1.5 text-xs rounded-lg bg-blue-50 text-blue-700 font-medium">Marcar Enviada</button>}
                {p.status === 'SENT' && <>
                  <button onClick={() => updateStatus.mutate({ id: p.id, status: 'ACCEPTED' })} className="px-3 py-1.5 text-xs rounded-lg bg-green-50 text-green-700 font-medium">Aceita</button>
                  <button onClick={() => updateStatus.mutate({ id: p.id, status: 'REJECTED' })} className="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-700 font-medium">Recusada</button>
                </>}
              </div>
            </div>
          );
        })}
        {!isLoading && !data?.length && <div className="col-span-2 text-center py-12 text-slate-400">Nenhuma proposta</div>}
      </div>

      {showModal && <ProposalModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
