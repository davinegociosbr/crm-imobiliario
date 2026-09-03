'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft, Phone, MessageCircle, Mail, Edit2, Loader2,
  CheckCircle2, Circle, Trash2, Plus, Flag, Calendar, Home,
  FileText, DollarSign, StickyNote, GitBranch, Trophy, ClipboardList,
  PhoneCall, Users, Send, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  formatDate, formatDateTime, LEAD_STATUS, LEAD_ORIGINS,
  ACTIVITY_TYPES, formatCurrency, formatPhone,
} from '@/lib/utils';
import { LeadModal } from '@/components/leads/lead-modal';

const TABS = ['Dados', 'Timeline', 'Notas', 'Visitas', 'Propostas', 'Tarefas', 'Simulação'] as const;
type Tab = typeof TABS[number];

const inputClass = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    if (t === 'timeline') return 'Timeline';
    return 'Dados';
  });
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

  const PIPELINE_PT: Record<string, string> = {
    INITIAL_CONTACT: 'Contato Inicial', QUALIFICATION: 'Qualificação', VISIT_SCHEDULED: 'Visita Agendada',
    PROPOSAL_SENT: 'Proposta Enviada', NEGOTIATION: 'Negociação', CLOSED_WON: 'Fechado Ganho', CLOSED_LOST: 'Fechado Perdido',
  };

  const timelineEvents = (() => {
    if (!lead) return [];
    const events: any[] = [];

    events.push({ date: lead.createdAt, label: 'Lead cadastrado no CRM', icon: 'created', tag: 'Cadastro', tagColor: 'blue', by: lead.assignedUser?.name });

    activities.forEach((a: any) => {
      const isFunnel = a.description?.startsWith('Movido para etapa:');
      if (isFunnel) {
        const stage = a.description.replace('Movido para etapa: ', '');
        events.push({ date: a.createdAt, label: `Avançou para "${PIPELINE_PT[stage] || stage}"`, icon: 'funnel', tag: 'Funil', tagColor: 'purple', by: a.user?.name });
      } else {
        const iconMap: Record<string, string> = { CALL: 'call', EMAIL: 'email', MEETING: 'meeting', VISIT: 'visitact', NOTE: 'note', WHATSAPP: 'whatsapp' };
        const tagMap: Record<string, string> = { CALL: 'Ligação', EMAIL: 'E-mail', MEETING: 'Reunião', VISIT: 'Visita', NOTE: 'Nota', WHATSAPP: 'WhatsApp' };
        events.push({
          date: a.createdAt, label: a.description, icon: iconMap[a.type] || 'note',
          tag: tagMap[a.type] || a.type, tagColor: 'slate', by: a.user?.name,
          extra: a.nextAction ? `Próxima ação: ${a.nextAction}` : undefined,
          completed: a.isCompleted,
        });
      }
    });

    (lead.visits || []).forEach((v: any) => {
      events.push({
        date: v.scheduledAt, label: `Visita ao imóvel ${v.property?.name || ''}`,
        icon: 'visit', tag: 'Visita', tagColor: 'green', by: v.user?.name,
        extra: `Status: ${v.status === 'SCHEDULED' ? 'Agendada' : v.status === 'COMPLETED' ? 'Realizada' : v.status === 'CANCELLED' ? 'Cancelada' : v.status}`,
      });
    });

    (lead.proposals || []).forEach((p: any) => {
      const statusLabel: Record<string, string> = { PENDING: 'Aguardando', ACCEPTED: 'Aceita', REJECTED: 'Recusada', EXPIRED: 'Expirada' };
      events.push({
        date: p.createdAt, label: `Proposta para ${p.property?.name || 'imóvel'}`,
        icon: 'proposal', tag: 'Proposta', tagColor: 'amber', by: p.user?.name,
        extra: `${p.propertyValue ? `R$ ${Number(p.propertyValue).toLocaleString('pt-BR')} · ` : ''}${statusLabel[p.status] || p.status}`,
        highlight: p.status === 'ACCEPTED',
      });
    });

    (lead.sales || []).forEach((s: any) => {
      events.push({
        date: s.createdAt, label: `Venda concluída${s.property?.name ? ` — ${s.property.name}` : ''}`,
        icon: 'sale', tag: 'Venda', tagColor: 'emerald',
        extra: s.saleValue ? `Valor: R$ ${Number(s.saleValue).toLocaleString('pt-BR')}` : undefined,
        highlight: true,
      });
    });

    (lead.tasks || []).filter((t: any) => t.status === 'DONE').forEach((t: any) => {
      events.push({
        date: t.completedAt || t.updatedAt, label: `Tarefa concluída: ${t.title}`,
        icon: 'task', tag: 'Tarefa', tagColor: 'teal', by: t.assignedUser?.name,
      });
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
        <div className="space-y-4">
          {/* Resumo rápido */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Interações', value: activities.filter((a: any) => !a.description?.startsWith('Movido')).length, icon: MessageCircle, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
              { label: 'Visitas', value: (lead.visits || []).length, icon: Home, color: 'text-green-600 bg-green-50 dark:bg-green-950/30' },
              { label: 'Propostas', value: (lead.proposals || []).length, icon: FileText, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
              { label: 'Vendas', value: (lead.sales || []).length, icon: Trophy, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
            ].map((s) => (
              <div key={s.label} className={`flex items-center gap-3 rounded-xl border p-3 ${s.color.split(' ')[1]} dark:border-slate-800`}>
                <s.icon className={`w-5 h-5 shrink-0 ${s.color.split(' ')[0]}`} />
                <div>
                  <p className="text-lg font-bold text-slate-800 dark:text-white leading-none">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {loadingActivities && <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>}

          {!loadingActivities && timelineEvents.length === 0 && (
            <p className="text-center py-12 text-slate-400 text-sm">Nenhum evento registrado ainda.</p>
          )}

          <div className="space-y-0">
            {timelineEvents.map((event, index) => {
              const iconDef: Record<string, { Icon: any; bg: string; text: string }> = {
                created:  { Icon: Star,          bg: 'bg-blue-100 dark:bg-blue-900/50',    text: 'text-blue-600' },
                funnel:   { Icon: GitBranch,     bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-600' },
                note:     { Icon: StickyNote,    bg: 'bg-slate-100 dark:bg-slate-800',      text: 'text-slate-500' },
                call:     { Icon: PhoneCall,     bg: 'bg-blue-100 dark:bg-blue-900/50',    text: 'text-blue-600' },
                email:    { Icon: Mail,          bg: 'bg-indigo-100 dark:bg-indigo-900/50', text: 'text-indigo-600' },
                meeting:  { Icon: Users,         bg: 'bg-violet-100 dark:bg-violet-900/50', text: 'text-violet-600' },
                whatsapp: { Icon: MessageCircle, bg: 'bg-green-100 dark:bg-green-900/50',  text: 'text-green-600' },
                visitact: { Icon: Home,          bg: 'bg-teal-100 dark:bg-teal-900/50',    text: 'text-teal-600' },
                visit:    { Icon: Home,          bg: 'bg-green-100 dark:bg-green-900/50',  text: 'text-green-600' },
                proposal: { Icon: Send,          bg: 'bg-amber-100 dark:bg-amber-900/50',  text: 'text-amber-600' },
                sale:     { Icon: Trophy,        bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-600' },
                task:     { Icon: ClipboardList, bg: 'bg-teal-100 dark:bg-teal-900/50',    text: 'text-teal-600' },
              };
              const tagColors: Record<string, string> = {
                blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
                slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
                amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
              };
              const { Icon, bg, text } = iconDef[event.icon] || iconDef.note;
              const isLast = index === timelineEvents.length - 1;

              return (
                <div key={index} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${bg} ${event.highlight ? 'ring-2 ring-offset-1 ring-emerald-400' : ''}`}>
                      <Icon className={`w-3.5 h-3.5 ${text}`} />
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 my-1" />}
                  </div>

                  <div className="flex-1 pb-4">
                    <div className={`rounded-xl border p-3.5 transition-colors ${event.highlight ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-white dark:bg-slate-900'}`}>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${tagColors[event.tagColor] || tagColors.slate}`}>{event.tag}</span>
                          {event.completed && <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">✓ Concluído</span>}
                        </div>
                        <time className="text-[11px] text-slate-400 shrink-0">
                          {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white mt-1.5 leading-snug">{event.label}</p>
                      {event.extra && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{event.extra}</p>}
                      {event.by && <p className="text-[11px] text-slate-400 mt-1.5">por {event.by}</p>}
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
                  <select {...register('type', { required: true })} className={inputClass}>
                    {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Próxima Ação</label>
                  <input {...register('nextAction')} className={inputClass} placeholder="Ex: Enviar proposta..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Descrição *</label>
                  <textarea {...register('description', { required: true })} className={inputClass} rows={2} placeholder="O que aconteceu nessa interação?" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Data do Próximo Contato</label>
                  <input {...register('nextContactAt')} type="datetime-local" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Observações</label>
                  <input {...register('notes')} className={inputClass} placeholder="Informações adicionais..." />
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

      {/* Aba: Simulação */}
      {activeTab === 'Simulação' && (
        <div className="rounded-xl border overflow-hidden bg-white dark:bg-slate-900" style={{ height: 'calc(100vh - 220px)' }}>
          <iframe
            src={`/simulador.html?cliente=${encodeURIComponent(lead.name || '')}&empreendimento=${encodeURIComponent(lead.interest || '')}&leadId=${lead.id}`}
            className="w-full h-full border-0"
            title="Simulador de Parcelamento"
          />
        </div>
      )}

      {showEdit && <LeadModal lead={lead} onClose={() => { setShowEdit(false); qc.invalidateQueries({ queryKey: ['lead', id] }); }} />}
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
