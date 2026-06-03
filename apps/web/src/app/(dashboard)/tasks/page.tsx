'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle, Circle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { TaskModal } from '@/components/tasks/task-modal';

const PRIORITY: Record<string, { label: string; color: string; icon: any }> = {
  LOW: { label: 'Baixa', color: 'text-slate-400', icon: Circle },
  MEDIUM: { label: 'Média', color: 'text-blue-500', icon: Clock },
  HIGH: { label: 'Alta', color: 'text-amber-500', icon: AlertCircle },
  URGENT: { label: 'Urgente', color: 'text-red-500', icon: AlertCircle },
};

export default function TasksPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter],
    queryFn: () => api.get('/tasks', { params: { status: statusFilter || undefined } }).then((r) => r.data.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/tasks/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Tarefa removida'); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'}`}
            >
              {s === '' ? 'Todas' : s === 'PENDING' ? 'Pendentes' : s === 'IN_PROGRESS' ? 'Em andamento' : 'Concluídas'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" />Nova Tarefa
        </button>
      </div>

      <div className="space-y-2">
        {isLoading && <div className="text-center py-12 text-slate-400">Carregando...</div>}
        {(data || []).map((task: any) => {
          const p = PRIORITY[task.priority];
          const PIcon = p?.icon || Circle;
          const done = task.status === 'COMPLETED';
          return (
            <div key={task.id} className={`bg-white dark:bg-slate-900 rounded-xl border p-4 flex items-start gap-4 transition-opacity ${done ? 'opacity-60' : ''}`}>
              <button
                onClick={() => updateStatus.mutate({ id: task.id, status: done ? 'PENDING' : 'COMPLETED' })}
                className="mt-0.5 shrink-0"
              >
                {done ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-slate-300" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-slate-800 dark:text-white ${done ? 'line-through' : ''}`}>{task.title}</p>
                {task.description && <p className="text-sm text-slate-500 mt-0.5">{task.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className={`flex items-center gap-1 ${p?.color}`}>
                    <PIcon className="w-3 h-3" />{p?.label}
                  </span>
                  {task.dueAt && <span className="text-slate-400">Vence: {formatDate(task.dueAt)}</span>}
                  {task.lead && <span className="text-blue-600">{task.lead.name}</span>}
                  <span className="text-slate-400">{task.assignedUser?.name}</span>
                </div>
              </div>
              <button onClick={() => deleteMutation.mutate(task.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
        {!isLoading && !data?.length && <div className="text-center py-12 text-slate-400">Nenhuma tarefa encontrada</div>}
      </div>

      {showModal && <TaskModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
