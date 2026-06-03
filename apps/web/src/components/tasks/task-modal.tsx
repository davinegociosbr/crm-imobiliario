'use client';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export function TaskModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ title: string; description: string; priority: string; dueAt: string; leadId: string }>({ defaultValues: { priority: 'MEDIUM' } });
  const { data: leads } = useQuery({ queryKey: ['leads-select'], queryFn: () => api.get('/leads').then(r => r.data.data) });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/tasks', { ...data, dueAt: data.dueAt ? new Date(data.dueAt).toISOString() : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Tarefa criada!'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Nova Tarefa</h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Título *</label>
            <input {...register('title', { required: true })} className="w-full p-2 border rounded-lg text-sm" placeholder="Ligar para cliente..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Descrição</label>
            <textarea {...register('description')} className="w-full p-2 border rounded-lg text-sm" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Prioridade</label>
              <select {...register('priority')} className="w-full p-2 border rounded-lg text-sm">
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Vencimento</label>
              <input {...register('dueAt')} type="datetime-local" className="w-full p-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Lead relacionado</label>
            <select {...register('leadId')} className="w-full p-2 border rounded-lg text-sm">
              <option value="">Nenhum</option>
              {(leads || []).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-lg text-sm">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
