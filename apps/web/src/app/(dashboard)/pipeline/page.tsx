'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Phone, MessageCircle, Calendar, Briefcase, X, Loader2, Plus, StickyNote, Clock, Palette, Trash2, Pencil, Check, CheckCircle2, Circle, Search, Filter, History } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { PIPELINE_STAGES, LEAD_ORIGINS, formatDateTime, LEAD_STATUS } from '@/lib/utils';

// ─── Paleta de cores disponíveis ────────────────────────────────────────────
const COLOR_OPTIONS = [
  { label: 'Cinza',     value: 'bg-slate-500' },
  { label: 'Roxo',      value: 'bg-purple-500' },
  { label: 'Azul',      value: 'bg-blue-500' },
  { label: 'Ciano',     value: 'bg-cyan-500' },
  { label: 'Âmbar',     value: 'bg-amber-500' },
  { label: 'Verde',     value: 'bg-green-500' },
  { label: 'Vermelho',  value: 'bg-red-400' },
  { label: 'Rosa',      value: 'bg-pink-500' },
  { label: 'Laranja',   value: 'bg-orange-500' },
  { label: 'Índigo',    value: 'bg-indigo-500' },
  { label: 'Teal',      value: 'bg-teal-500' },
  { label: 'Lima',      value: 'bg-lime-500' },
];

// Preview real das cores (necessário para Tailwind não purgar as classes)
const COLOR_PREVIEW: Record<string, string> = {
  'bg-slate-500':  '#64748b',
  'bg-purple-500': '#a855f7',
  'bg-blue-500':   '#3b82f6',
  'bg-cyan-500':   '#06b6d4',
  'bg-amber-500':  '#f59e0b',
  'bg-green-500':  '#22c55e',
  'bg-red-400':    '#f87171',
  'bg-pink-500':   '#ec4899',
  'bg-orange-500': '#f97316',
  'bg-indigo-500': '#6366f1',
  'bg-teal-500':   '#14b8a6',
  'bg-lime-500':   '#84cc16',
};

const STAGES = ['INITIAL_CONTACT', 'REDIRECT', 'ATTENDANCE', 'TODAY', 'FOLLOW_UP', 'CLIENTS', 'INACTIVE'] as const;

// ─── Card de nota individual ──────────────────────────────────────────────────
function NoteCard({ activity: a, leadId, onRefresh }: { activity: any; leadId: string; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(a.description);
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/activities/${a.id}`),
    onSuccess: () => { onRefresh(); toast.success('Nota removida'); },
    onError: () => toast.error('Erro ao remover nota'),
  });

  const editMutation = useMutation({
    mutationFn: () => api.put(`/activities/${a.id}`, { description: editText }),
    onSuccess: () => { onRefresh(); setEditing(false); toast.success('Nota atualizada'); },
    onError: () => toast.error('Erro ao editar nota'),
  });

  const toggleMutation = useMutation({
    mutationFn: () => api.patch(`/activities/${a.id}/toggle-completed`),
    onSuccess: () => onRefresh(),
    onError: () => toast.error('Erro ao atualizar status'),
  });

  const nextContactDate = a.nextContactAt ? new Date(a.nextContactAt) : null;
  const contactOverdue = nextContactDate && nextContactDate < new Date();

  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 transition-opacity ${a.isCompleted ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 shrink-0 mt-0.5">
          <StickyNote className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={3}
                className="w-full p-2 text-sm border border-slate-600 rounded-lg bg-slate-700 text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => editMutation.mutate()}
                  disabled={editMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium"
                >
                  <Check className="w-3 h-3" /> Salvar
                </button>
                <button
                  onClick={() => { setEditing(false); setEditText(a.description); }}
                  className="px-3 py-1 border border-slate-600 text-slate-400 rounded-lg text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className={`text-sm text-slate-800 dark:text-white leading-relaxed ${a.isCompleted ? 'line-through' : ''}`}>
              {a.description}
            </p>
          )}

          {/* Próxima ação */}
          {a.nextAction && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-500">
              <Clock className="w-3 h-3" />
              <span>{a.nextAction}</span>
            </div>
          )}

          {/* Data do próximo contato */}
          {nextContactDate && (
            <div className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium ${
              contactOverdue ? 'text-red-500' : 'text-green-500'
            }`}>
              <Calendar className="w-3 h-3" />
              <span>
                Contato: {nextContactDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                {contactOverdue && ' · Vencido'}
              </span>
            </div>
          )}

          {/* Observações */}
          {a.notes && (
            <div className="mt-1.5 text-xs text-slate-400">
              <span className="font-medium">Obs:</span> {a.notes}
            </div>
          )}

          {/* Data da nota + ações */}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">
              {new Date(a.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
            {!editing && (
              <div className="flex gap-1">
                {/* Flag: concluído / pendente */}
                <button
                  onClick={() => toggleMutation.mutate()}
                  disabled={toggleMutation.isPending}
                  title={a.isCompleted ? 'Marcar como pendente' : 'Marcar como concluído'}
                  className={`p-1.5 rounded-lg transition-colors ${
                    a.isCompleted
                      ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30'
                      : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-green-500'
                  }`}
                >
                  {a.isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors"
                  title="Editar nota"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { if (confirm('Remover esta nota?')) deleteMutation.mutate(); }}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 transition-colors"
                  title="Apagar nota"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de detalhes do lead ────────────────────────────────────────────────
function LeadDetailModal({ lead, onClose }: { lead: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'edit' | 'notes' | 'history'>('edit');

  // Busca lead completo com atividades
  const { data: leadFull } = useQuery({
    queryKey: ['lead-detail', lead.id],
    queryFn: () => api.get(`/leads/${lead.id}`).then(r => r.data),
  });

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    values: leadFull || lead,
  });

  const { register: regNote, handleSubmit: hsNote, reset: resetNote, formState: { isSubmitting: submittingNote } } = useForm();

  const updateLead = useMutation({
    mutationFn: (data: any) => {
      // Envia apenas campos permitidos pelo backend
      const allowed = ['name', 'interest', 'phone', 'whatsapp', 'email', 'city', 'state',
        'cpf', 'rg', 'birthDate', 'maritalStatus', 'incomeRange', 'investmentRange',
        'notes', 'origin', 'status', 'pipelineStage', 'nextAction', 'nextContactAt',
        'lostReason', 'potentialValue', 'assignedUserId'];
      const clean: any = {};
      // Campos de data que devem virar null quando apagados
      const dateFields = ['nextContactAt', 'birthDate'];
      allowed.forEach(k => {
        const v = data[k];
        if (dateFields.includes(k)) {
          clean[k] = (v === '' || v === null || v === undefined) ? null : v;
        } else if (v !== '' && v !== null && v !== undefined) {
          clean[k] = v;
        }
      });
      if (clean.nextContactAt) clean.nextContactAt = new Date(clean.nextContactAt + 'T12:00:00').toISOString();
      return api.put(`/leads/${lead.id}`, clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-kanban'] });
      qc.invalidateQueries({ queryKey: ['lead-detail', lead.id] });
      toast.success('Lead atualizado!');
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao salvar'),
  });

  const addNote = useMutation({
    mutationFn: (data: any) => api.post('/activities', {
      leadId: lead.id,
      type: 'NOTE',
      description: data.note,
      nextAction: data.nextAction || undefined,
      nextContactAt: data.nextContactAt ? new Date(data.nextContactAt + 'T12:00:00').toISOString() : undefined,
      notes: data.observations || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-detail', lead.id] });
      qc.invalidateQueries({ queryKey: ['pipeline-kanban'] });
      toast.success('Nota adicionada!');
      resetNote();
    },
    onError: () => toast.error('Erro ao adicionar nota'),
  });

  // Filtra apenas atividades manuais (exclui movimentações automáticas do funil)
  const activities = (leadFull?.activities || []).filter(
    (a: any) => !(a.type === 'NOTE' && a.description?.startsWith('Movido'))
  );

  // Histórico de etapas (movimentações do funil)
  const stageHistory = (leadFull?.activities || []).filter(
    (a: any) => a.type === 'NOTE' && a.description?.startsWith('Movido')
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{lead.name}</h2>
            {lead.interest && <p className="text-sm text-blue-600 mt-0.5">{lead.interest}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-5">
          {[
            { id: 'edit', label: 'Dados do Cliente' },
            { id: 'notes', label: `Notas (${activities.length})` },
            { id: 'history', label: `Histórico (${stageHistory.length})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ABA: EDITAR */}
          {tab === 'edit' && (
            <form onSubmit={handleSubmit(d => updateLead.mutate(d))} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="field-label">Nome do Cliente</label>
                  <input {...register('name')} className="field-input" />
                </div>
                <div className="col-span-2">
                  <label className="field-label">Empreendimento / Negócio</label>
                  <input {...register('interest')} className="field-input" placeholder="Ex: Residencial Novo Horizonte" />
                </div>
                <div>
                  <label className="field-label">Telefone</label>
                  <input {...register('phone')} className="field-input" />
                </div>
                <div>
                  <label className="field-label">WhatsApp</label>
                  <input {...register('whatsapp')} className="field-input" />
                </div>
                <div>
                  <label className="field-label">E-mail</label>
                  <input {...register('email')} type="email" className="field-input" />
                </div>
                <div>
                  <label className="field-label">Cidade</label>
                  <input {...register('city')} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Faixa de Investimento</label>
                  <input {...register('investmentRange')} className="field-input" placeholder="R$ 500k - R$ 1M" />
                </div>
                <div>
                  <label className="field-label">Origem</label>
                  <select {...register('origin')} className="field-input">
                    {Object.entries(LEAD_ORIGINS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar Alterações
              </button>
            </form>
          )}

          {/* ABA: NOTAS */}
          {/* ABA: HISTÓRICO */}
          {tab === 'history' && (
            <div className="p-5 space-y-3">
              {stageHistory.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-6">Nenhuma movimentação registrada</p>
              )}
              {stageHistory.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 shrink-0">
                    <History className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-200">{a.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(a.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      {a.user?.name && ` · ${a.user.name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'notes' && (
            <div className="p-5 space-y-4">
              {/* Formulário nova nota */}
              <form onSubmit={hsNote(d => addNote.mutate(d))} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-500" />
                  Nova Nota
                </p>
                <textarea
                  {...regNote('note', { required: true })}
                  rows={3}
                  className="w-full p-3 text-sm border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-slate-100 placeholder-slate-400 resize-none"
                  placeholder="Descreva o que foi tratado nessa negociação..."
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Próxima ação</label>
                    <input
                      {...regNote('nextAction')}
                      className="w-full p-2 text-sm border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-slate-100 placeholder-slate-400"
                      placeholder="Ligar, enviar proposta..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Data do próximo contato</label>
                    <input
                      {...regNote('nextContactAt')}
                      type="date"
                      className="w-full p-2 text-sm border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-slate-100 placeholder-slate-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Observações</label>
                    <input
                      {...regNote('observations')}
                      className="w-full p-2 text-sm border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-slate-100 placeholder-slate-400"
                      placeholder="Informações adicionais..."
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submittingNote}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submittingNote && <Loader2 className="w-4 h-4 animate-spin" />}
                  Adicionar Nota
                </button>
              </form>

              {/* Histórico de notas */}
              <div className="space-y-3">
                {activities.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-6">Nenhuma nota ainda</p>
                )}
                {activities.map((a: any) => (
                  <NoteCard
                    key={a.id}
                    activity={a}
                    leadId={lead.id}
                    onRefresh={() => {
                      qc.invalidateQueries({ queryKey: ['lead-detail', lead.id] });
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .field-label { display: block; font-size: 12px; font-weight: 500; margin-bottom: 4px; color: #94a3b8; }
        .field-input { width: 100%; padding: 8px 12px; border: 1px solid #334155; border-radius: 8px; font-size: 14px; outline: none; background: #1e293b; color: #f1f5f9; }
        .field-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,.2); }
        .field-input::placeholder { color: #475569; }
      `}</style>
    </div>
  );
}

// ─── Modal de nova tarefa ─────────────────────────────────────────────────────
function TaskModal({ lead, onClose }: { lead: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/tasks', {
      title: data.title,
      description: data.description || undefined,
      dueAt: data.dueAt ? new Date(`${data.dueAt}T${data.dueTime || '08:00'}`).toISOString() : undefined,
      priority: data.priority || 'MEDIUM',
      leadId: lead.id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-kanban'] });
      qc.invalidateQueries({ queryKey: ['lead-tasks', lead.id] });
      toast.success('Tarefa criada!');
      onClose();
    },
    onError: () => toast.error('Erro ao criar tarefa'),
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Nova Tarefa</h3>
            <p className="text-xs text-slate-400 mt-0.5">{lead.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">O que precisa fazer? *</label>
            <input
              {...register('title', { required: true })}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Ligar para confirmar visita..."
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Descrição</label>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Detalhes adicionais..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Data</label>
              <input
                {...register('dueAt')}
                type="date"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Hora</label>
              <input
                {...register('dueTime')}
                type="time"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue="09:00"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Prioridade</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'LOW',    label: 'Baixa',   color: 'bg-slate-100 text-slate-600 border-slate-200' },
                { value: 'MEDIUM', label: 'Média',   color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { value: 'HIGH',   label: 'Alta',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { value: 'URGENT', label: 'Urgente', color: 'bg-red-50 text-red-700 border-red-200' },
              ].map(p => (
                <label key={p.value} className="cursor-pointer">
                  <input {...register('priority')} type="radio" value={p.value} className="sr-only" defaultChecked={p.value === 'MEDIUM'} />
                  <span className={`block text-center text-xs font-medium py-1.5 rounded-lg border ${p.color} hover:opacity-80 transition-opacity`}>{p.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar Tarefa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PRIORITY_OPTIONS = [
  { value: 'LOW',    label: 'Baixa',   cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200' },
  { value: 'MEDIUM', label: 'Média',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 hover:bg-blue-200' },
  { value: 'HIGH',   label: 'Alta',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 hover:bg-amber-200' },
  { value: 'URGENT', label: 'Urgente', cls: 'bg-red-100 text-red-700 dark:bg-red-950/40 hover:bg-red-200' },
];

// ─── Card do Kanban ───────────────────────────────────────────────────────────
function LeadCard({ lead, index, onOpen }: { lead: any; index: number; onOpen: (lead: any) => void }) {
  const qc = useQueryClient();
  const nextContact = lead.nextContactAt ? new Date(lead.nextContactAt) : null;
  const isOverdue = nextContact && nextContact < new Date();
  const [priority, setPriority] = useState<string>(lead.status === 'NEW' ? 'LOW' : 'MEDIUM');

  const updatePriority = useMutation({
    mutationFn: (p: string) => api.put(`/leads/${lead.id}`, { priority: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline-kanban'] }),
  });

  const currentPriority = PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[1];

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white dark:bg-slate-800 rounded-lg p-2.5 border shadow-sm cursor-grab active:cursor-grabbing transition-shadow ${
            snapshot.isDragging
              ? 'shadow-lg ring-2 ring-blue-500'
              : 'border-slate-200 dark:border-slate-700 hover:shadow-md'
          }`}
          onClick={() => !snapshot.isDragging && onOpen(lead)}
        >
          {/* Linha 1: Nome + data */}
          <div className="flex items-start justify-between gap-1 mb-1">
            <p className="font-semibold text-slate-900 dark:text-white text-xs leading-tight line-clamp-1 flex-1">
              {lead.name}
            </p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
              !nextContact
                ? 'bg-slate-100 text-slate-400 dark:bg-slate-700'
                : isOverdue
                ? 'bg-red-50 text-red-600 dark:bg-red-950/30'
                : 'bg-green-50 text-green-700 dark:bg-green-950/30'
            }`}>
              {nextContact
                ? nextContact.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                : 'Sem data'}
            </span>
          </div>

          {/* Linha 2: Interesse */}
          {lead.interest && (
            <p className="text-[11px] text-blue-500 dark:text-blue-400 line-clamp-1 mb-1">{lead.interest}</p>
          )}

          {/* Linha 3: Ações */}
          <div className="flex items-center gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-700">
            <a
              href={`tel:${lead.phone}`}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-medium"
            >
              <Phone className="w-2.5 h-2.5" /> Ligar
            </a>
            {lead.whatsapp && (
              <a
                href={`https://wa.me/55${lead.whatsapp?.replace(/\D/g, '')}`}
                target="_blank"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-50 text-green-600 hover:bg-green-100 text-[10px] font-medium"
              >
                <MessageCircle className="w-2.5 h-2.5" /> WA
              </a>
            )}
            <div className="flex gap-0.5 ml-auto" onClick={e => e.stopPropagation()}>
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p.value}
                  title={p.label}
                  onClick={() => { setPriority(p.value); updatePriority.mutate(p.value); }}
                  className={`w-5 h-5 rounded text-[9px] font-bold transition-all ${
                    priority === p.value ? `${p.cls} opacity-100` : `${p.cls} opacity-30`
                  }`}
                >
                  {p.label[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Seletor de cor da coluna ─────────────────────────────────────────────────
function ColorPicker({ stage, currentColor, onSelect }: { stage: string; currentColor: string; onSelect: (color: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded hover:bg-white/20 transition-colors"
        title="Mudar cor"
      >
        <Palette className="w-3.5 h-3.5 text-white" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 w-48">
          <p className="text-xs font-semibold text-slate-500 mb-2">Escolha uma cor</p>
          <div className="grid grid-cols-4 gap-1.5">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => { onSelect(c.value); setOpen(false); }}
                className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                  currentColor === c.value ? 'border-white shadow-lg scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: COLOR_PREVIEW[c.value] }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PipelinePage() {
  const qc = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [originFilter, setOriginFilter] = useState('');

  // Cores salvas no localStorage para persistir entre sessões
  const [stageColors, setStageColors] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('pipeline-colors') || '{}'); } catch { return {}; }
  });

  const updateColor = (stage: string, color: string) => {
    const updated = { ...stageColors, [stage]: color };
    setStageColors(updated);
    localStorage.setItem('pipeline-colors', JSON.stringify(updated));
  };

  const { data: kanban } = useQuery<Record<string, any[]>>({
    queryKey: ['pipeline-kanban'],
    queryFn: () => api.get('/pipeline/kanban').then((r) => r.data),
  });

  const moveMutation = useMutation({
    mutationFn: ({ leadId, stage }: { leadId: string; stage: string }) =>
      api.put(`/pipeline/${leadId}/move`, { stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-kanban'] });
      toast.success('Lead movido com sucesso');
    },
    onError: () => toast.error('Erro ao mover lead'),
  });

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    moveMutation.mutate({ leadId: draggableId, stage: destination.droppableId });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Barra de busca + filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar lead..."
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:border-slate-700"
          />
        </div>
        <select
          value={originFilter}
          onChange={e => setOriginFilter(e.target.value)}
          className="py-2 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:border-slate-700"
        >
          <option value="">Todas as origens</option>
          {Object.entries(LEAD_ORIGINS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {(search || originFilter) && (
          <button
            onClick={() => { setSearch(''); setOriginFilter(''); }}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Limpar filtros
          </button>
        )}
        <p className="text-xs text-slate-400 ml-auto hidden sm:block">
          Clique para editar • Arraste para mover • <Palette className="w-3 h-3 inline" /> muda cor
        </p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageInfo = PIPELINE_STAGES[stage];
            const color = stageColors[stage] || stageInfo.color;
            const leads = (kanban?.[stage] || []).filter((lead: any) => {
              if (search && !lead.name?.toLowerCase().includes(search.toLowerCase()) && !lead.phone?.includes(search)) return false;
              if (originFilter && lead.origin !== originFilter) return false;
              return true;
            });

            return (
              <div key={stage} className="w-72 shrink-0 flex flex-col">
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${color} text-white mb-3`}>
                  <span className="font-medium text-sm">{stageInfo.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                      {(search || originFilter) && leads.length !== (kanban?.[stage] || []).length
                        ? `${leads.length}/${(kanban?.[stage] || []).length}`
                        : leads.length}
                    </span>
                    <ColorPicker stage={stage} currentColor={color} onSelect={(c) => updateColor(stage, c)} />
                  </div>
                </div>

                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-3 p-2 rounded-xl min-h-[200px] kanban-column overflow-y-auto transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-slate-100/50 dark:bg-slate-800/20'
                      }`}
                    >
                      {leads.map((lead: any, i: number) => (
                        <LeadCard key={lead.id} lead={lead} index={i} onOpen={setSelectedLead} />
                      ))}
                      {provided.placeholder}
                      {leads.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex items-center justify-center h-24 text-slate-400 text-xs">
                          Nenhum lead nesta etapa
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
