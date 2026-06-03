'use client';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export function VisitModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  const { data: leads } = useQuery({ queryKey: ['leads-select'], queryFn: () => api.get('/leads').then(r => r.data.data) });
  const { data: properties } = useQuery({ queryKey: ['properties-select'], queryFn: () => api.get('/properties', { params: { status: 'AVAILABLE' } }).then(r => r.data.data) });
  const { data: users } = useQuery({ queryKey: ['users-select'], queryFn: () => api.get('/users').then(r => r.data) });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/visits', { ...data, scheduledAt: new Date(data.scheduledAt).toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['visits'] }); toast.success('Visita agendada!'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Agendar Visita</h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Cliente *</label>
            <select {...register('leadId', { required: true })} className="w-full p-2 border rounded-lg text-sm">
              <option value="">Selecione</option>
              {(leads || []).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Imóvel *</label>
            <select {...register('propertyId', { required: true })} className="w-full p-2 border rounded-lg text-sm">
              <option value="">Selecione</option>
              {(properties || []).map((p: any) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Corretor</label>
            <select {...register('userId')} className="w-full p-2 border rounded-lg text-sm">
              <option value="">Eu mesmo</option>
              {(users || []).map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Data e Hora *</label>
            <input {...register('scheduledAt', { required: true })} type="datetime-local" className="w-full p-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Observações</label>
            <textarea {...register('notes')} className="w-full p-2 border rounded-lg text-sm" rows={3} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-lg text-sm">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}Agendar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
