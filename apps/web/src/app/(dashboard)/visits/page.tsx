'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, MapPin, User2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDateTime, VISIT_STATUS } from '@/lib/utils';
import { VisitModal } from '@/components/visits/visit-modal';

export default function VisitsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['visits', statusFilter],
    queryFn: () => api.get('/visits', { params: { status: statusFilter || undefined } }).then((r) => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/visits/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['visits'] }); toast.success('Status atualizado'); },
  });

  const visits = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="py-2 px-3 text-sm border rounded-lg bg-white dark:bg-slate-900">
          <option value="">Todos os status</option>
          {Object.entries(VISIT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" />Agendar Visita
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading && <div className="col-span-2 text-center py-12 text-slate-400">Carregando...</div>}
        {visits.map((v: any) => {
          const statusInfo = VISIT_STATUS[v.status as keyof typeof VISIT_STATUS];
          return (
            <div key={v.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{v.lead?.name}</p>
                  <p className="text-sm text-blue-600 font-medium">{v.property?.name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo?.color}`}>{statusInfo?.label}</span>
              </div>
              <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{formatDateTime(v.scheduledAt)}</div>
                {v.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{v.address}</div>}
                <div className="flex items-center gap-2"><User2 className="w-4 h-4" />{v.user?.name}</div>
              </div>
              {v.status === 'SCHEDULED' || v.status === 'CONFIRMED' ? (
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <button onClick={() => updateStatus.mutate({ id: v.id, status: 'CONFIRMED' })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100">
                    <Clock className="w-3.5 h-3.5" />Confirmar
                  </button>
                  <button onClick={() => updateStatus.mutate({ id: v.id, status: 'COMPLETED' })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100">
                    <CheckCircle className="w-3.5 h-3.5" />Realizada
                  </button>
                  <button onClick={() => updateStatus.mutate({ id: v.id, status: 'CANCELLED' })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100">
                    <XCircle className="w-3.5 h-3.5" />Cancelar
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
        {!isLoading && visits.length === 0 && <div className="col-span-2 text-center py-12 text-slate-400">Nenhuma visita encontrada</div>}
      </div>

      {showModal && <VisitModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
