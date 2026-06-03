'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Key, Calendar, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReservationModal } from '@/components/reservations/reservation-modal';

const STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Ativa', color: 'bg-green-100 text-green-700' },
  EXPIRED: { label: 'Expirada', color: 'bg-slate-100 text-slate-500' },
  CONVERTED: { label: 'Convertida', color: 'bg-blue-100 text-blue-700' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
};

export default function ReservationsPage() {
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: () => api.get('/reservations').then((r) => r.data.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/reservations/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reservations'] }); toast.success('Status atualizado'); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" />Nova Reserva
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading && <div className="col-span-2 text-center py-12 text-slate-400">Carregando...</div>}
        {(data || []).map((r: any) => {
          const s = STATUS[r.status];
          const expired = new Date(r.expiresAt) < new Date() && r.status === 'ACTIVE';
          return (
            <div key={r.id} className={`bg-white dark:bg-slate-900 rounded-xl border p-5 ${expired ? 'border-amber-300' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">{r.lead?.name}</p>
                  <p className="text-sm text-blue-600">{r.property?.name}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s?.color}`}>{s?.label}</span>
                  {expired && <span className="text-xs text-amber-600 font-medium">⚠️ Vencida</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div><p className="text-xs text-slate-400">Valor da Reserva</p><p className="font-semibold text-slate-800">{formatCurrency(Number(r.reservationValue))}</p></div>
                <div><p className="text-xs text-slate-400">Validade</p><p className="text-slate-700">{formatDate(r.expiresAt)}</p></div>
              </div>
              {r.status === 'ACTIVE' && (
                <div className="flex gap-2">
                  <button onClick={() => updateStatus.mutate({ id: r.id, status: 'CONVERTED' })} className="px-3 py-1.5 text-xs rounded-lg bg-green-50 text-green-700 font-medium">Convertida</button>
                  <button onClick={() => updateStatus.mutate({ id: r.id, status: 'CANCELLED' })} className="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-700 font-medium">Cancelar</button>
                </div>
              )}
            </div>
          );
        })}
        {!isLoading && !data?.length && <div className="col-span-2 text-center py-12 text-slate-400">Nenhuma reserva</div>}
      </div>

      {showModal && <ReservationModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
