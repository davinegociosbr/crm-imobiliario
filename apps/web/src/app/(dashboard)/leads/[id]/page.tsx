'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft, Phone, MessageCircle, Mail, Edit2, Loader2,
  CheckCircle2, Circle, Trash2, Plus, Flag, Calendar, Home,
  FileText, DollarSign, StickyNote, GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  formatDate, formatDateTime, LEAD_STATUS, LEAD_ORIGINS,
  ACTIVITY_TYPES, formatCurrency, formatPhone,
} from '@/lib/utils';
import { LeadModal } from '@/components/leads/lead-modal';

const TABS = ['Dados', 'Timeline', 'Notas', 'Visitas', 'Propostas', 'Tarefas'] as const;
type Tab = typeof TABS[number];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('Dados');
  const [showEdit, setShowEdit] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.get(`/leads/${id}`).then((r) => r.data),
  });

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['activities', id],
    queryFn: () => api.get(`/activities/lead/${id}`).then((r) => r.data),
    enabled: activeTab === 'Notas' || activeTab === 'Timeline',
  });

  // Timeline: junta notas, visitas e propostas ordenadas por data
  const timelineEvents = (() => {
    if (!lead) return [];
    const events: any[] = [];

    // Criação do lead
    events.push({ type: 'created', date: lead.createdAt, label: 'Lead cadastrado', icon: 'created', color: 'blue' });

    // Atividades/notas
    activities.forEach((a: any) => {
      const label = a.type === 'NOTE' ? 'Nota registrada'
        : a.type === 'CALL' ? 'Ligação realizada'
        : a.type === 'EMAIL' ? 'E-mail enviado'
        : a.type === 'VISIT' ? 'Visita realizada'
        : a.type === 'MEETING' ? 'Reunião realizada'
        : a.description?.startsWith('Movido') ? a.description
        : a.type;
      const isFunnelMove = a.description?.startsWith('Movido');
      events.push({ type: 'activity', date: a.createdAt, label, description: isFunnelMove ? '' : a.description, icon: isFunnelMove ? 'funnel' : 'note', color: isFunnelMove ? 'purple' : 'slate', completed: a.isCompleted });
    });

    // Visitas
    (lead.visits || []).forEach((v: any) => {
      events.push({ type: 'visit', date: v.scheduledAt, label: `Visita agendada — ${v.property?.name || 'imóvel'}`, description: `Status: ${v.status}`, icon: 'visit', color: 'green' });
    });

    // Propostas
    (lead.proposals || []).forEach((p: any) => {
      events.push({ type: 'proposal', date: p.createdAt, label: `Proposta enviada — ${p.property?.name || 'imóvel'}`, description: `Valor: ${p.propertyValue ? `R$ ${Number(p.propertyValue).toLocaleString('pt-BR')}` : '-'} · Status: ${p.status}`, icon: 'proposal', color: 'amber' });
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  })();

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { type: 'NOTE', description: '', nextAction: '', nextContactAt: '', notes: '' },
  });

  const createActivity = useMutation({
    mutationFn: (data: any) => api.post('/activities', { ...data, leadId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities', id] });
      qc.invalidateQueries({ queryKey: ['lead', id] });
      toast.success('Nota adicionada');
      reset();
      setShowNoteForm(false);
    },
    onError: () => toast.error('Erro ao salvar nota'),
  });

  const toggleCompleted = useMutation({
    mutationFn: (activityId: string) => api.patch(`/activities/${activityId}/toggle-completed`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities', id] }),
  });

  const deleteActivity = useMutation({
    mutationFn: (activityId: string) => api.delete(`/activities/${activityId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities', id] });
      toast.success('Nota removida');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!lead) return <div className="text-center py-20 text-slate-400">Lead não encontrado.</div>;

  const statusInfo = LEAD_STATUS[lead.status as keyof typeof LEAD_STATUS];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-800 dark:text-white">{lead.name}</h1>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo?.color}`}>
              {statusInfo?.label}
            </span>
          </div>
          <p className="text-sm text-slate-400">{lead.city}, {lead.state} · {LEAD_ORIGINS[lead.origin as keyof typeof LEAD_ORIGINS] || lead.origin}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`tel:${lead.phone}`} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 border border-blue-200" title="Ligar">
            <Phone className="w-4 h-4" />
          </a>
          {lead.whatsapp && (
            <a href={`https://web.whatsapp.com/send?phone=55${lead.whatsapp.replace(/\D/g, '')}`} target="whatsapp_web" className="p-2 rounded-lg hover:bg-green-50 text-green-600 border border-green-200" title="WhatsApp">
              <MessageCircle className="w-4 h-4" />
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="p-2 rounded-lg hover:bg-slate-50 text-slate-600 border border-slate-200" title="E-mail">
              <Mail className="w-4 h-4" />
            </a>
          )}
          <button onClick={() => setShowEdit(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
            <Edit2 className="w-3.5 h-3.5" />
            Editar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Aba: Dados */}
      {activeTab === 'Dados' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border p-5 space-y-4">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Informações de Contato</h3>
            <dl className="space-y-2 text-sm">
              <Row label="Telefone" value={formatPhone(lead.phone)} />
              {lead.whatsapp && <Row label="WhatsApp" value={formatPhone(lead.whatsapp)} />}
              {lead.email && <Row label="E-mail" value={lead.email} />}
              {lead.cpf && <Row label="CPF" value={lead.cpf} />}
              {lead.rg && <Row label="RG" value={lead.rg} />}
              {lead.birthDate && <Row label="Nascimento" value={formatDate(lead.birthDate)} />}
              {lead.maritalStatus && <Row label="Estado Civil" value={lead.maritalStatus} />}
            </dl>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border p-5 space-y-4">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Interesse & Perfil</h3>
            <dl className="space-y-2 text-sm">
              {lead.interest && <Row label="Interesse" value={lead.interest} />}
              {lead.potentialValue && <Row label="Valor Potencial" value={formatCurrency(Number(lead.potentialValue))} />}
              {lead.investmentRange && <Row label="Faixa de Investimento" value={lead.investmentRange} />}
              {lead.incomeRange && <Row label="Faixa de Renda" value={lead.incomeRange} />}
              <Row label="Origem" value={LEAD_ORIGINS[lead.origin as keyof typeof LEAD_ORIGINS] || lead.origin} />
              {lead.assignedUser && <Row label="Corretor" value={lead.assignedUser.name} />}
              <Row label="Cadastro" value={formatDate(lead.createdAt)} />
            </dl>
          </div>
        </div>
      )}

      {/* Aba: Timeline */}
      {activeTab === 'Timeline' && (
        <div className="relative">
          {timelineEvents.length === 0 && (
            <p className="text-center py-12 text-slate-400 text-sm">Nenhum evento registrado ainda.</p>
          )}
          <div className="space-y-0">
            {timelineEvents.map((event, index) => {
              const iconMap: Record<string, any> = {
                created: { icon: Plus, bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-600' },
                note: { icon: StickyNote, bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500' },
                funnel: { icon: GitBranch, bg: 'bg-purple-100 dark:bg-purple-950/40', text: 'text-purple-600' },
                visit: { icon: Home, bg: 'bg-green-100 dark:bg-green-950/40', text: 'text-green-600' },
                proposal: { icon: FileText, bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-600' },
              };
              const iconInfo = iconMap[event.icon] || iconMap.note;
              const IconComp = iconInfo.icon;
              const isLast = index === timelineEvents.length - 1;

              return (
                <div key={index} className="flex gap-4">
                  {/* Linha vertical + ícone */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${iconInfo.bg}`}>
                      <IconComp className={`w-3.5 h-3.5 ${iconInfo.text}`} />
                    </div>
                    {!isLast && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 my-1" />}
                  </div>

                  {/* Conteúdo */}
                  <div className={`flex-1 pb-5 ${isLast ? '' : ''}`}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800 dark:text-white">{event.label}</p>
                        {event.completed && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">✓ Concluído</span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{event.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aba: Notas */}
      {activeTab === 'Notas' && (
        <div className="space-y-4">
          {/* Botão adicionar */}
          {!showNoteForm && (
            <button
              onClick={() => setShowNoteForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Nota
            </button>
          )}

          {/* Formulário de nova nota */}
          {showNoteForm && (
            <form
              onSubmit={handleSubmit((d) => createActivity.mutate(d))}
              className="bg-white dark:bg-slate-900 rounded-xl border p-5 space-y-4"
            >
              <h3 className="font-semibold text-slate-700 dark:text-white">Nova Nota / Atividade</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo *</label>
                  <select {...register('type', { required: true })} className="input-field">
                    {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Próxima Ação</label>
                  <input {...register('nextAction')} className="input-field" placeholder="Ex: Enviar proposta..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Descrição *</label>
                  <textarea {...register('description', { required: true })} className="input-field" rows={2} placeholder="O que aconteceu nessa interação?" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Data do Próximo Contato</label>
                  <input {...register('nextContactAt')} type="datetime-local" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Observações</label>
                  <input {...register('notes')} className="input-field" placeholder="Informações adicionais..." />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowNoteForm(false); reset(); }} className="flex-1 py-2 border rounded-lg text-sm hover:bg-slate-50">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar Nota
                </button>
              </div>
            </form>
          )}

          {/* Lista de atividades */}
          {loadingActivities && (
            <div className="text-center py-8 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
          )}
          {!loadingActivities && activities.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Nenhuma nota registrada ainda.</div>
          )}
          <div className="space-y-3">
            {activities.map((act: any) => {
              const typeInfo = ACTIVITY_TYPES[act.type as keyof typeof ACTIVITY_TYPES];
              return (
                <div
                  key={act.id}
                  className={`bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-2 transition-opacity ${act.isCompleted ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {typeInfo?.label || act.type}
                      </span>
                      {act.isCompleted && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Concluído
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Flag de concluído */}
                      <button
                        onClick={() => toggleCompleted.mutate(act.id)}
                        title={act.isCompleted ? 'Marcar como pendente' : 'Marcar como concluído'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          act.isCompleted
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-slate-400 hover:bg-slate-50 hover:text-green-600'
                        }`}
                      >
                        {act.isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteActivity.mutate(act.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className={`text-sm text-slate-700 dark:text-slate-200 ${act.isCompleted ? 'line-through' : ''}`}>
                    {act.description}
                  </p>

                  {(act.nextAction || act.nextContactAt || act.notes) && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                      {act.nextAction && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Flag className="w-3.5 h-3.5 text-amber-500" />
                          <span><span className="font-medium">Próxima ação:</span> {act.nextAction}</span>
                        </div>
                      )}
                      {act.nextContactAt && (
                        <div className="text-xs text-slate-500">
                          <span className="font-medium">Próximo contato:</span> {formatDateTime(act.nextContactAt)}
                        </div>
                      )}
                      {act.notes && (
                        <div className="text-xs text-slate-500">
                          <span className="font-medium">Obs:</span> {act.notes}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-slate-400">
                    {act.user?.name} · {formatDateTime(act.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aba: Visitas */}
      {activeTab === 'Visitas' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
          {(!lead.visits || lead.visits.length === 0) ? (
            <p className="text-center py-12 text-slate-400 text-sm">Nenhuma visita registrada.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Imóvel</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Data</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Corretor</th>
                </tr>
              </thead>
              <tbody>
                {lead.visits.map((v: any) => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">{v.property?.name || '-'}</td>
                    <td className="px-4 py-3">{formatDateTime(v.scheduledAt)}</td>
                    <td className="px-4 py-3">{v.status}</td>
                    <td className="px-4 py-3">{v.user?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Aba: Propostas */}
      {activeTab === 'Propostas' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
          {(!lead.proposals || lead.proposals.length === 0) ? (
            <p className="text-center py-12 text-slate-400 text-sm">Nenhuma proposta registrada.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Imóvel</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Data</th>
                </tr>
              </thead>
              <tbody>
                {lead.proposals.map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">{p.property?.name || '-'}</td>
                    <td className="px-4 py-3">{formatCurrency(Number(p.propertyValue))}</td>
                    <td className="px-4 py-3">{p.status}</td>
                    <td className="px-4 py-3">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Aba: Tarefas */}
      {activeTab === 'Tarefas' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
          {(!lead.tasks || lead.tasks.length === 0) ? (
            <p className="text-center py-12 text-slate-400 text-sm">Nenhuma tarefa registrada.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Título</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Prioridade</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Prazo</th>
                </tr>
              </thead>
              <tbody>
                {lead.tasks.map((t: any) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">{t.title}</td>
                    <td className="px-4 py-3">{t.priority}</td>
                    <td className="px-4 py-3">{t.status}</td>
                    <td className="px-4 py-3">{t.dueAt ? formatDate(t.dueAt) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showEdit && <LeadModal lead={lead} onClose={() => { setShowEdit(false); qc.invalidateQueries({ queryKey: ['lead', id] }); }} />}

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          background: white;
        }
        .input-field:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-40 shrink-0 text-slate-400">{label}</dt>
      <dd className="text-slate-700 dark:text-slate-200 font-medium">{value}</dd>
    </div>
  );
}
