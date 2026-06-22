'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

const DAYS_OF_WEEK = [
  { value: 0, short: 'Dom' }, { value: 1, short: 'Seg' }, { value: 2, short: 'Ter' },
  { value: 3, short: 'Qua' }, { value: 4, short: 'Qui' }, { value: 5, short: 'Sex' },
  { value: 6, short: 'Sáb' },
];

export function TaskModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [recurrenceType, setRecurrenceType] = useState('');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceDay, setRecurrenceDay] = useState<number | ''>(1);
  const [recurrenceEnd, setRecurrenceEnd] = useState('');

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{
    title: string; description: string; priority: string; dueAt: string; leadId: string;
  }>({ defaultValues: { priority: 'MEDIUM' } });

  const { data: leads } = useQuery({ queryKey: ['leads-select'], queryFn: () => api.get('/leads').then(r => r.data.data) });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/tasks', {
      ...data,
      leadId: data.leadId || null,
      dueAt: data.dueAt ? new Date(data.dueAt).toISOString() : null,
      recurrenceType: recurrenceType || null,
      recurrenceDays: recurrenceType === 'WEEKLY' ? recurrenceDays : [],
      recurrenceDay: recurrenceType === 'MONTHLY' ? (recurrenceDay || 1) : null,
      recurrenceEnd: recurrenceEnd || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Tarefa criada!'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro'),
  });

  function toggleDay(d: number) {
    setRecurrenceDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white dark:bg-slate-900 z-10">
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

          {/* Recorrência */}
          <div className="border-t pt-4 space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Repetir</label>
              <div className="grid grid-cols-4 gap-2">
                {[{ v: '', l: 'Não' }, { v: 'DAILY', l: 'Diário' }, { v: 'WEEKLY', l: 'Semanal' }, { v: 'MONTHLY', l: 'Mensal' }].map(o => (
                  <button key={o.v} type="button"
                    onClick={() => { setRecurrenceType(o.v); setRecurrenceDays([]); }}
                    className={`py-2 rounded-lg text-sm font-medium border transition-all ${recurrenceType === o.v ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {recurrenceType === 'MONTHLY' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Dia do mês</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min={1} max={31}
                    value={recurrenceDay}
                    onChange={e => setRecurrenceDay(Number(e.target.value))}
                    className="w-20 p-2 border rounded-lg text-sm text-center font-semibold"
                  />
                  <span className="text-sm text-slate-500">de cada mês</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[1,5,10,15,20,25,28,30].map(d => (
                    <button key={d} type="button" onClick={() => setRecurrenceDay(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${recurrenceDay === d ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                      Dia {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {recurrenceType === 'WEEKLY' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Dias da semana</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS_OF_WEEK.map(d => (
                    <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                      className={`w-10 h-10 rounded-lg text-xs font-semibold border transition-all ${recurrenceDays.includes(d.value) ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                      {d.short}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {recurrenceType && (
              <div>
                <label className="text-sm font-medium mb-1 block">Repetir até (opcional)</label>
                <input type="date" value={recurrenceEnd} onChange={e => setRecurrenceEnd(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm" />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
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
