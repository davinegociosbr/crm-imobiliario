'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle, Circle, Clock, AlertCircle, Trash2, Bell, BellOff, X, ChevronDown, Pencil, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { TaskModal } from '@/components/tasks/task-modal';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const PRIORITY: Record<string, { label: string; color: string; dot: string; icon: any }> = {
  LOW:    { label: 'Baixa',   color: 'text-slate-400',  dot: 'bg-slate-300',  icon: Circle },
  MEDIUM: { label: 'Média',   color: 'text-blue-500',   dot: 'bg-blue-400',   icon: Clock },
  HIGH:   { label: 'Alta',    color: 'text-amber-500',  dot: 'bg-amber-400',  icon: AlertCircle },
  URGENT: { label: 'Urgente', color: 'text-red-500',    dot: 'bg-red-500',    icon: AlertCircle },
};

const FILTERS = [
  { value: '',            label: 'Todas' },
  { value: 'PENDING',     label: 'Pendentes' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'COMPLETED',   label: 'Concluídas' },
];

const DAYS_OF_WEEK = [
  { value: 0, short: 'Dom' }, { value: 1, short: 'Seg' }, { value: 2, short: 'Ter' },
  { value: 3, short: 'Qua' }, { value: 4, short: 'Qui' }, { value: 5, short: 'Sex' },
  { value: 6, short: 'Sáb' },
];

function RecurrenceFields({ recurrenceType, setRecurrenceType, recurrenceDays, setRecurrenceDays, recurrenceDay, setRecurrenceDay, recurrenceEnd, setRecurrenceEnd }: any) {
  function toggleDay(d: number) {
    setRecurrenceDays((prev: number[]) => prev.includes(d) ? prev.filter((x: number) => x !== d) : [...prev, d]);
  }
  return (
    <div className="space-y-3 pt-1">
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Repetir</p>
        <div className="grid grid-cols-4 gap-2">
          {[{ v: '', l: 'Não' }, { v: 'DAILY', l: 'Diário' }, { v: 'WEEKLY', l: 'Semanal' }, { v: 'MONTHLY', l: 'Mensal' }].map(o => (
            <button key={o.v} type="button" onClick={() => { setRecurrenceType(o.v); setRecurrenceDays([]); }}
              className={`py-2 rounded-xl text-sm font-medium border transition-all ${recurrenceType === o.v ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {recurrenceType === 'MONTHLY' && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Dia do mês</p>
          <div className="flex items-center gap-3 mb-2">
            <input type="number" min={1} max={31} value={recurrenceDay || 1}
              onChange={e => setRecurrenceDay(Number(e.target.value))}
              className="w-16 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-center font-semibold bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-500">de cada mês</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[1,5,10,15,20,25,28,30].map(d => (
              <button key={d} type="button" onClick={() => setRecurrenceDay(d)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${recurrenceDay === d ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                Dia {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {recurrenceType === 'WEEKLY' && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Dias da semana</p>
          <div className="flex gap-1.5 flex-wrap">
            {DAYS_OF_WEEK.map(d => (
              <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                className={`w-10 h-10 rounded-xl text-xs font-semibold border transition-all ${recurrenceDays.includes(d.value) ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                {d.short}
              </button>
            ))}
          </div>
        </div>
      )}

      {recurrenceType && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">Repetir até (opcional)</p>
          <input type="date" value={recurrenceEnd} onChange={e => setRecurrenceEnd(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}
    </div>
  );
}

// ── Formulário rápido mobile ─────────────────────────────────────────────────
function QuickTaskForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueAt, setDueAt] = useState('');
  const [recurrenceType, setRecurrenceType] = useState('');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceDay, setRecurrenceDay] = useState<number>(1);
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.post('/tasks', {
        title, priority, dueAt: dueAt || null,
        recurrenceType: recurrenceType || null,
        recurrenceDays: recurrenceType === 'WEEKLY' ? recurrenceDays : [],
        recurrenceDay: recurrenceType === 'MONTHLY' ? recurrenceDay : null,
        recurrenceEnd: recurrenceEnd || null,
      });
      toast.success('✅ Tarefa criada!');
      onSaved();
      onClose();
    } catch {
      toast.error('Erro ao criar tarefa');
    } finally {
      setSaving(false);
    }
  }

  // Atalhos de data
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 16);
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 pb-8 sm:pb-5 overflow-y-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar mobile */}
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Nova Tarefa</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <textarea
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="O que precisa ser feito?"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Prioridade */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Prioridade</p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(PRIORITY).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPriority(k)}
                  className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                    priority === k
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data — atalhos rápidos */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Prazo</p>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setDueAt(todayStr)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${dueAt === todayStr ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setDueAt(tomorrowStr)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${dueAt === tomorrowStr ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
              >
                Amanhã
              </button>
              <button
                type="button"
                onClick={() => setDueAt('')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${!dueAt ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
              >
                Sem data
              </button>
            </div>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <RecurrenceFields
            recurrenceType={recurrenceType} setRecurrenceType={setRecurrenceType}
            recurrenceDays={recurrenceDays} setRecurrenceDays={setRecurrenceDays}
            recurrenceDay={recurrenceDay} setRecurrenceDay={setRecurrenceDay}
            recurrenceEnd={recurrenceEnd} setRecurrenceEnd={setRecurrenceEnd}
          />

          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-base transition-colors"
          >
            {saving ? 'Criando...' : '✅ Criar Tarefa'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Modal de edição de tarefa ─────────────────────────────────────────────────
function EditTaskModal({ task, onClose, onSaved }: { task: any; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'MEDIUM');
  const [dueAt, setDueAt] = useState(task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : '');
  const [recurrenceType, setRecurrenceType] = useState(task.recurrenceType || '');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(task.recurrenceDays || []);
  const [recurrenceDay, setRecurrenceDay] = useState<number>(task.recurrenceDay || 1);
  const [recurrenceEnd, setRecurrenceEnd] = useState(task.recurrenceEnd ? new Date(task.recurrenceEnd).toISOString().slice(0, 10) : '');
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 16);
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0, 16);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.put(`/tasks/${task.id}`, {
        title, description: description || null, priority, dueAt: dueAt || null,
        recurrenceType: recurrenceType || null,
        recurrenceDays: recurrenceType === 'WEEKLY' ? recurrenceDays : [],
        recurrenceDay: recurrenceType === 'MONTHLY' ? recurrenceDay : null,
        recurrenceEnd: recurrenceEnd || null,
      });
      toast.success('Tarefa atualizada!');
      onSaved();
      onClose();
    } catch {
      toast.error('Erro ao salvar tarefa');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 pb-8 sm:pb-5 overflow-y-auto max-h-[92vh]" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Editar Tarefa</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Título da tarefa"
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Prioridade</p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(PRIORITY).map(([k, v]) => (
                <button key={k} type="button" onClick={() => setPriority(k)}
                  className={`py-2 rounded-xl text-sm font-medium border transition-all ${priority === k ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Prazo</p>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setDueAt(todayStr)} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${dueAt === todayStr ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>Hoje</button>
              <button type="button" onClick={() => setDueAt(tomorrowStr)} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${dueAt === tomorrowStr ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>Amanhã</button>
              <button type="button" onClick={() => setDueAt('')} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${!dueAt ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>Sem data</button>
            </div>
            <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <RecurrenceFields
            recurrenceType={recurrenceType} setRecurrenceType={setRecurrenceType}
            recurrenceDays={recurrenceDays} setRecurrenceDays={setRecurrenceDays}
            recurrenceDay={recurrenceDay} setRecurrenceDay={setRecurrenceDay}
            recurrenceEnd={recurrenceEnd} setRecurrenceEnd={setRecurrenceEnd}
          />

          <button type="submit" disabled={!title.trim() || saving}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-base transition-colors">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Botão de notificações push ────────────────────────────────────────────────
function PushButton() {
  const { permission, isSubscribed, isLoading, supported, subscribe, unsubscribe } = usePushNotifications();

  if (!supported) return null;

  if (isSubscribed) {
    return (
      <button
        onClick={unsubscribe}
        disabled={isLoading}
        title="Desativar notificações"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-green-600 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 hover:bg-green-100 transition-colors"
      >
        <Bell className="w-4 h-4" />
        <span className="hidden sm:inline">Notificações ativas</span>
      </button>
    );
  }

  return (
    <button
      onClick={subscribe}
      disabled={isLoading || permission === 'denied'}
      title={permission === 'denied' ? 'Permissão negada no navegador' : 'Ativar notificações push'}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
    >
      <BellOff className="w-4 h-4" />
      <span className="hidden sm:inline">{permission === 'denied' ? 'Bloqueado' : 'Ativar alertas'}</span>
    </button>
  );
}

// ── Botão de teste de notificação ────────────────────────────────────────────
function TestPushButton() {
  const [loading, setLoading] = useState(false);
  const handleTest = async () => {
    setLoading(true);
    try {
      await api.post('/push/test');
      toast.success('Notificação enviada! Verifique seu dispositivo.');
    } catch {
      toast.error('Erro ao enviar notificação de teste');
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={handleTest}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
    >
      {loading ? '...' : '🔔 Testar'}
    </button>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function TasksPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('PENDING');

  // Abre formulário rápido se vier da URL com ?new=true (PWA shortcut)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === 'true') setShowQuick(true);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter],
    queryFn: () => api.get('/tasks', { params: { status: statusFilter || undefined } }).then((r) => r.data.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Tarefa removida'); },
  });

  const pending = (data || []).filter((t: any) => t.status !== 'COMPLETED').length;

  return (
    <div className="space-y-4 pb-24 sm:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Tarefas</h1>
          {pending > 0 && <p className="text-xs text-slate-500">{pending} pendente(s)</p>}
        </div>
        <div className="flex items-center gap-2">
          <PushButton />
          <TestPushButton />
          {/* Botão desktop */}
          <button
            onClick={() => setShowModal(true)}
            className="hidden sm:flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de tarefas */}
      <div className="space-y-2">
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {(data || []).map((task: any) => {
          const p = PRIORITY[task.priority] || PRIORITY.MEDIUM;
          const done = task.status === 'COMPLETED';
          const overdue = task.dueAt && new Date(task.dueAt) < new Date() && !done;

          return (
            <div
              key={task.id}
              className={`bg-white dark:bg-slate-900 rounded-xl border transition-all ${
                done ? 'opacity-50 border-slate-100 dark:border-slate-800' : overdue ? 'border-red-200 dark:border-red-900' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3 p-4">
                {/* Checkbox */}
                <button
                  onClick={() => updateStatus.mutate({ id: task.id, status: done ? 'PENDING' : 'COMPLETED' })}
                  className="mt-0.5 shrink-0"
                >
                  {done
                    ? <CheckCircle className="w-6 h-6 text-green-500" />
                    : <Circle className="w-6 h-6 text-slate-300 hover:text-blue-500 transition-colors" />}
                </button>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-slate-800 dark:text-white leading-snug ${done ? 'line-through text-slate-400' : ''}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                    <span className={`flex items-center gap-1 text-xs font-medium ${p.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                      {p.label}
                    </span>
                    {task.dueAt && (
                      <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                        {overdue ? '⚠️ ' : '📅 '}{formatDate(task.dueAt)}
                      </span>
                    )}
                    {task.lead && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        👤 {task.lead.name}
                      </span>
                    )}
                    {(task.recurrenceType || task.parentTaskId) && (
                      <span className="flex items-center gap-1 text-xs text-violet-500 font-medium">
                        <Repeat className="w-3 h-3" />
                        {task.recurrenceType === 'DAILY' ? 'Diário' : task.recurrenceType === 'WEEKLY' ? 'Semanal' : task.recurrenceType === 'MONTHLY' ? 'Mensal' : 'Recorrente'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Editar + Deletar */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingTask(task)}
                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(task.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {!isLoading && !data?.length && (
          <div className="text-center py-16">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
            <p className="text-slate-400 font-medium">Nenhuma tarefa encontrada</p>
            <p className="text-slate-300 text-sm mt-1">Toque no + para criar uma nova</p>
          </div>
        )}
      </div>

      {/* FAB mobile — botão flutuante */}
      <button
        onClick={() => setShowQuick(true)}
        className="fixed bottom-6 right-6 sm:hidden z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Modais */}
      {showQuick && (
        <QuickTaskForm
          onClose={() => setShowQuick(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['tasks'] })}
        />
      )}
      {showModal && <TaskModal onClose={() => setShowModal(false)} />}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['tasks'] })}
        />
      )}
    </div>
  );
}
