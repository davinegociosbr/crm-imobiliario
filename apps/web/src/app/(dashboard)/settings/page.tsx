'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { UserPlus, Download, FileJson, FileText, Loader2, Mail, Puzzle, Chrome, CheckCircle2, AlertCircle, Kanban, Trash2, Pencil, Plus, Check, GripVertical, Link2, Copy, ExternalLink } from 'lucide-react';
import { PIPELINE_STAGES } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const ROLE_LABELS: Record<string, string> = { ADMIN: 'Administrador', MANAGER: 'Gerente', BROKER: 'Corretor' };
const ROLE_COLORS: Record<string, string> = { ADMIN: 'bg-purple-100 text-purple-700', MANAGER: 'bg-blue-100 text-blue-700', BROKER: 'bg-green-100 text-green-700' };

export default function SettingsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState('company');
  const [showUserModal, setShowUserModal] = useState(false);

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: () => api.get('/company').then(r => r.data) });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });

  const { register: regCompany, handleSubmit: hsCompany, formState: { isSubmitting: submittingCompany } } = useForm({ values: company });
  const { register: regUser, handleSubmit: hsUser, reset: resetUser, formState: { isSubmitting: submittingUser } } = useForm<{ name: string; email: string; role: string; password: string }>({ defaultValues: { role: 'BROKER' } });

  const updateCompany = useMutation({
    mutationFn: (data: any) => api.put('/company', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['company'] }); toast.success('Empresa atualizada'); },
  });

  const createUser = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuário criado'); resetUser(); setShowUserModal(false); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro'),
  });

  const toggleActive = useMutation({
    mutationFn: (id: string) => api.put(`/users/${id}/toggle-active`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex gap-2 bg-white border rounded-xl p-1 w-fit">
        {[
          { id: 'company', label: 'Empresa' },
          { id: 'users', label: 'Usuários' },
          { id: 'backup', label: 'Backup' },
          { id: 'extension', label: 'Extensão' },
          { id: 'pipeline', label: 'Funil' },
          { id: 'form', label: 'Formulário' },
          { id: 'audit', label: 'Auditoria' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'company' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border p-6 max-w-2xl">
          <h2 className="font-semibold mb-5">Dados da Empresa</h2>
          <form onSubmit={hsCompany((d) => updateCompany.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="block text-sm font-medium mb-1">Nome da Empresa</label><input {...regCompany('name')} className="w-full p-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">CNPJ</label><input {...regCompany('cnpj')} className="w-full p-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Telefone</label><input {...regCompany('phone')} className="w-full p-2 border rounded-lg text-sm" /></div>
              <div className="col-span-2"><label className="block text-sm font-medium mb-1">E-mail</label><input {...regCompany('email')} type="email" className="w-full p-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Cidade</label><input {...regCompany('city')} className="w-full p-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Estado</label><input {...regCompany('state')} className="w-full p-2 border rounded-lg text-sm" maxLength={2} /></div>
            </div>
            <button type="submit" disabled={submittingCompany} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium">
              {submittingCompany ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowUserModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <UserPlus className="w-4 h-4" />Novo Usuário
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  {['Nome', 'E-mail', 'Perfil', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(users || []).map((u: any) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{u.isActive ? 'Ativo' : 'Inativo'}</span></td>
                    <td className="px-4 py-3">
                      {u.id !== user?.id && (
                        <button onClick={() => toggleActive.mutate(u.id)} className="text-xs px-2 py-1 rounded border hover:bg-slate-50 text-slate-600">
                          {u.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b">
                  <h2 className="text-lg font-semibold">Novo Usuário</h2>
                  <button onClick={() => setShowUserModal(false)}>✕</button>
                </div>
                <form onSubmit={hsUser((d) => createUser.mutate(d))} className="p-6 space-y-4">
                  <div><label className="text-sm font-medium mb-1 block">Nome *</label><input {...regUser('name', { required: true })} className="w-full p-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium mb-1 block">E-mail *</label><input {...regUser('email', { required: true })} type="email" className="w-full p-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium mb-1 block">Perfil</label>
                    <select {...regUser('role')} className="w-full p-2 border rounded-lg text-sm">
                      <option value="BROKER">Corretor</option>
                      <option value="MANAGER">Gerente</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                  <div><label className="text-sm font-medium mb-1 block">Senha inicial</label><input {...regUser('password')} type="password" className="w-full p-2 border rounded-lg text-sm" placeholder="Mudar@123" /></div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-2.5 border rounded-lg text-sm">Cancelar</button>
                    <button type="submit" disabled={submittingUser} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm disabled:opacity-60">{submittingUser ? 'Criando...' : 'Criar'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'backup' && <BackupTab />}

      {tab === 'extension' && <ExtensionTab />}

      {tab === 'pipeline' && <PipelineTab company={company} onSaved={() => qc.invalidateQueries({ queryKey: ['company'] })} />}

      {tab === 'form' && <FormTab company={company} users={users || []} onSaved={() => qc.invalidateQueries({ queryKey: ['company'] })} />}

      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

const COLOR_OPTIONS = [
  { label: 'Cinza',    value: 'bg-slate-500',  hex: '#64748b' },
  { label: 'Roxo',     value: 'bg-purple-500', hex: '#a855f7' },
  { label: 'Azul',     value: 'bg-blue-500',   hex: '#3b82f6' },
  { label: 'Ciano',    value: 'bg-cyan-500',   hex: '#06b6d4' },
  { label: 'Âmbar',   value: 'bg-amber-500',  hex: '#f59e0b' },
  { label: 'Verde',    value: 'bg-green-500',  hex: '#22c55e' },
  { label: 'Vermelho', value: 'bg-red-400',    hex: '#f87171' },
  { label: 'Rosa',     value: 'bg-pink-500',   hex: '#ec4899' },
  { label: 'Laranja',  value: 'bg-orange-500', hex: '#f97316' },
  { label: 'Índigo',   value: 'bg-indigo-500', hex: '#6366f1' },
];

type StageItem = { key: string; label: string; color: string; isDefault?: boolean };

function PipelineTab({ company, onSaved }: { company: any; onSaved: () => void }) {
  const settings = (company?.settings || {}) as any;
  const deletedStages: string[] = settings.deletedPipelineStages || [];
  const customStages: StageItem[] = settings.customPipelineStages || [];
  const stageLabels: Record<string, string> = settings.stageLabels || {};

  // Build full list: defaults (not deleted) + custom
  const defaultStages: StageItem[] = Object.entries(PIPELINE_STAGES)
    .filter(([key]) => !deletedStages.includes(key))
    .map(([key, info]) => ({ key, label: stageLabels[key] || info.label, color: info.color, isDefault: true }));

  const [stages, setStages] = useState<StageItem[]>([...defaultStages, ...customStages]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('bg-blue-500');
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (stage: StageItem) => { setEditingKey(stage.key); setEditLabel(stage.label); };
  const confirmEdit = (key: string) => {
    setStages(prev => prev.map(s => s.key === key ? { ...s, label: editLabel } : s));
    setEditingKey(null);
  };

  const deleteStage = (key: string) => {
    setStages(prev => prev.filter(s => s.key !== key));
    setConfirmDelete(null);
  };

  const addStage = () => {
    if (!newLabel.trim()) return;
    const key = 'CUSTOM_' + Date.now();
    setStages(prev => [...prev, { key, label: newLabel.trim(), color: newColor }]);
    setNewLabel('');
    setNewColor('bg-blue-500');
    setShowAddForm(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const defaultKeys = Object.keys(PIPELINE_STAGES);
      const newDeleted = defaultKeys.filter(k => !stages.find(s => s.key === k));
      const newCustom = stages.filter(s => !s.isDefault);
      const newLabels: Record<string, string> = {};
      stages.filter(s => s.isDefault).forEach(s => {
        const orig = PIPELINE_STAGES[s.key as keyof typeof PIPELINE_STAGES]?.label;
        if (s.label !== orig) newLabels[s.key] = s.label;
      });

      await api.put('/company', {
        settings: {
          ...settings,
          deletedPipelineStages: newDeleted,
          customPipelineStages: newCustom,
          stageLabels: newLabels,
          stageOrder: stages.map(s => s.key),
        },
      });
      onSaved();
      toast.success('Colunas do funil salvas!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/30">
            <Kanban className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-white">Colunas do Funil de Vendas</h2>
            <p className="text-sm text-slate-500">Renomeie, exclua ou crie novas colunas.</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova coluna
        </button>
      </div>

      {/* Formulário nova coluna */}
      {showAddForm && (
        <div className="mb-4 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 space-y-3">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Nova coluna</p>
          <div className="flex gap-2">
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Nome da coluna..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              onKeyDown={e => e.key === 'Enter' && addStage()}
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.value}
                onClick={() => setNewColor(c.value)}
                title={c.label}
                className={`w-6 h-6 rounded-full transition-transform ${newColor === c.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-110'}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addStage} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 border rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de colunas com drag and drop */}
      <DragDropContext onDragEnd={(result: DropResult) => {
        if (!result.destination) return;
        const reordered = Array.from(stages);
        const [removed] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, removed);
        setStages(reordered);
      }}>
        <Droppable droppableId="pipeline-stages">
          {(provided) => (
            <div className="space-y-2" ref={provided.innerRef} {...provided.droppableProps}>
              {stages.map((stage, index) => (
                <Draggable key={stage.key} draggableId={stage.key} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 transition-shadow ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''}`}
                    >
                      <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Arrastar para reordenar">
                        <GripVertical className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className={`w-3 h-3 rounded-full shrink-0 ${stage.color}`} />

                      {editingKey === stage.key ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            value={editLabel}
                            onChange={e => setEditLabel(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') confirmEdit(stage.key); if (e.key === 'Escape') setEditingKey(null); }}
                            className="flex-1 px-2 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            autoFocus
                          />
                          <button onClick={() => confirmEdit(stage.key)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg">
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="flex-1 text-sm font-medium text-slate-700 dark:text-white">
                          {stage.label}
                          {!stage.isDefault && <span className="ml-2 text-xs text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded-full">personalizada</span>}
                        </span>
                      )}

                      {editingKey !== stage.key && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(stage)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                            title="Renomear"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {confirmDelete === stage.key ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-950/30 rounded-lg">
                              <span className="text-xs text-red-600">Confirmar?</span>
                              <button onClick={() => deleteStage(stage.key)} className="text-xs font-medium text-red-600 hover:text-red-800">Sim</button>
                              <button onClick={() => setConfirmDelete(null)} className="text-xs text-slate-500">Não</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(stage.key)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                              title="Excluir coluna"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {stages.length === 0 && (
        <p className="text-center text-sm text-slate-400 py-6">Nenhuma coluna. Adicione uma nova coluna acima.</p>
      )}

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-slate-400">{stages.length} coluna{stages.length !== 1 ? 's' : ''} no funil</p>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

function BackupTab() {
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const [loadingJson, setLoadingJson] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const download = async (endpoint: string, filename: string, setLoading: (v: boolean) => void) => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download iniciado!');
    } catch {
      toast.error('Erro ao gerar o arquivo de backup');
    } finally {
      setLoading(false);
    }
  };

  const sendEmailBackup = async () => {
    setLoadingEmail(true);
    try {
      await api.post('/backup/send-now');
      toast.success('✅ Backup enviado para o e-mail configurado!');
    } catch (err: any) {
      const detail = err?.response?.data?.message || err?.message || 'Erro desconhecido';
      toast.error(`❌ ${detail}`, { duration: 8000 });
    } finally {
      setLoadingEmail(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
        <h2 className="font-semibold text-slate-800 dark:text-white mb-1">Exportar Dados</h2>
        <p className="text-sm text-slate-500 mb-6">
          Faça o download de todos os dados do CRM para guardar como backup ou migrar para outro sistema.
        </p>

        <div className="space-y-4">
          {/* Backup Excel */}
          <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-950/30 shrink-0">
              <FileText className="w-5 h-5 text-green-700" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800 dark:text-white text-sm">Backup Completo (Excel)</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Gera um arquivo <strong>.xlsx</strong> organizado com abas separadas para cada tipo de dado. Compatível com Excel, Google Sheets e a maioria dos CRMs do mercado.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Leads', 'Imóveis', 'Visitas', 'Propostas', 'Vendas', 'Comissões', 'Tarefas', 'Notas'].map((item) => (
                  <span key={item} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{item}</span>
                ))}
              </div>
            </div>
            <button
              onClick={() => download('export/backup', `crm-backup-${today}.xlsx`, setLoadingXlsx)}
              disabled={loadingXlsx}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 shrink-0"
            >
              {loadingXlsx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {loadingXlsx ? 'Gerando...' : 'Baixar .xlsx'}
            </button>
          </div>

          {/* Backup JSON */}
          <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-950/30 shrink-0">
              <FileJson className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800 dark:text-white text-sm">Backup Técnico (JSON)</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Exporta todos os dados em formato JSON estruturado. Ideal para desenvolvedores ou para restaurar dados neste mesmo CRM.
              </p>
            </div>
            <button
              onClick={() => download('export/backup-json', `crm-backup-${today}.json`, setLoadingJson)}
              disabled={loadingJson}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 shrink-0"
            >
              {loadingJson ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {loadingJson ? 'Gerando...' : 'Baixar .json'}
            </button>
          </div>
        </div>
      </div>

      {/* Backup automático por e-mail */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
        <h2 className="font-semibold text-slate-800 dark:text-white mb-1">Backup Automático por E-mail</h2>
        <p className="text-sm text-slate-500 mb-4">
          Todo dia às <strong>04:00 (horário de Brasília)</strong> um backup completo em Excel é enviado automaticamente para <strong>brolezinegocios@gmail.com</strong>.
        </p>
        <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-950/30 shrink-0">
            <Mail className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-800 dark:text-white text-sm">Enviar Backup Agora por E-mail</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Dispara o backup imediatamente sem esperar o horário agendado. Útil para testar ou guardar uma cópia extra.
            </p>
          </div>
          <button
            onClick={sendEmailBackup}
            disabled={loadingEmail}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 shrink-0"
          >
            {loadingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {loadingEmail ? 'Enviando...' : 'Enviar agora'}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          ⚙️ Configurado automaticamente. O backup diário roda todos os dias sem nenhuma ação necessária.
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-1">Como usar o backup Excel</p>
        <ul className="text-xs text-amber-700 dark:text-amber-500 space-y-1 list-disc list-inside">
          <li>Cada aba do arquivo corresponde a um tipo de dado (Leads, Imóveis, Vendas...)</li>
          <li>Para importar leads em outro CRM use a aba <strong>Leads</strong></li>
          <li>Compatível com HubSpot, RD Station, Pipedrive e outros (salve a aba como CSV)</li>
          <li>Todos os campos já estão em português com formatação correta</li>
        </ul>
      </div>
    </div>
  );
}

function ExtensionTab() {
  const EXTENSION_ZIP_URL = 'https://github.com/davinegociosbr/crm-whatsapp-extension/archive/refs/heads/main.zip';

  const steps = [
    { n: 1, title: 'Baixe o arquivo ZIP', desc: 'Clique no botão abaixo para baixar a extensão mais recente.' },
    { n: 2, title: 'Extraia o arquivo', desc: 'Clique com o botão direito no ZIP baixado e escolha "Extrair aqui" ou "Extrair tudo".' },
    { n: 3, title: 'Abra as extensões do Chrome', desc: 'No Chrome, acesse chrome://extensions ou Menu → Mais ferramentas → Extensões.' },
    { n: 4, title: 'Ative o Modo Desenvolvedor', desc: 'No canto superior direito da página de extensões, ative o toggle "Modo do desenvolvedor".' },
    { n: 5, title: 'Carregue a extensão', desc: 'Clique em "Carregar sem compactação" e selecione a pasta extraída (crm-whatsapp-extension-main).' },
    { n: 6, title: 'Faça login', desc: 'Clique no ícone da extensão na barra do Chrome, insira seu e-mail e senha do CRM.' },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Card de download */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-green-100 dark:bg-green-950/30">
            <Puzzle className="w-6 h-6 text-green-700" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-white">Extensão CRM Brolezi para Chrome</h2>
            <p className="text-sm text-slate-500 mt-0.5">Adicione contatos do WhatsApp Web diretamente no CRM com um clique.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800 mb-6">
          <Chrome className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Sempre atualizado</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">O arquivo baixado sempre contém a versão mais recente da extensão.</p>
          </div>
          <a
            href={EXTENSION_ZIP_URL}
            download="crm-brolezi-extensao.zip"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            Baixar Extensão
          </a>
        </div>

        {/* Passo a passo */}
        <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-4 text-sm">Como instalar</h3>
        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {s.n}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Funcionalidades */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
        <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-4 text-sm">O que a extensão faz</h3>
        <div className="space-y-2">
          {[
            'Detecta automaticamente o contato aberto no WhatsApp Web',
            'Verifica se o contato já existe no CRM',
            'Permite adicionar novos leads diretamente do WhatsApp',
            'Abre o WhatsApp sempre na mesma aba (sem abrir janelas extras)',
            'Mostra link direto para o perfil do cliente no CRM',
          ].map((f) => (
            <div key={f} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600 dark:text-slate-400">{f}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Aviso atualização */}
      <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Como atualizar a extensão</p>
          <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
            Quando houver uma nova versão, baixe o ZIP novamente, extraia na mesma pasta (substituindo os arquivos) e clique no ícone 🔄 na página de extensões do Chrome.
          </p>
        </div>
      </div>
    </div>
  );
}

const FORM_FIELD_OPTIONS = [
  { value: 'name',     label: 'Nome completo', required: true },
  { value: 'phone',    label: 'Telefone / WhatsApp', required: true },
  { value: 'email',    label: 'E-mail' },
  { value: 'interest', label: 'O que procura?' },
  { value: 'city',     label: 'Cidade' },
  { value: 'origin',   label: 'Como nos conheceu?' },
  { value: 'notes',    label: 'Mensagem' },
];

function FormTab({ company, users, onSaved }: { company: any; users: any[]; onSaved: () => void }) {
  const settings: any = company?.settings || {};
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const [slug, setSlug] = useState(settings.formSlug || '');
  const [title, setTitle] = useState(settings.formTitle || '');
  const [subtitle, setSubtitle] = useState(settings.formSubtitle || '');
  const [thankYou, setThankYou] = useState(settings.formThankYou || '');
  const [color, setColor] = useState(settings.formColor || '#2563eb');
  const [assignedUserId, setAssignedUserId] = useState(settings.formAssignedUserId || '');
  const [fields, setFields] = useState<string[]>(settings.formFields || ['name', 'phone', 'email', 'interest', 'origin']);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const formUrl = slug ? `${appUrl}/f/${slug}` : '';

  function toggleField(f: string) {
    if (['name', 'phone'].includes(f)) return;
    setFields(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }

  function copyLink() {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function save() {
    if (!slug) { toast.error('Defina um slug para o formulário'); return; }
    setSaving(true);
    try {
      await api.put('/company', {
        settings: {
          ...settings,
          formSlug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          formTitle: title,
          formSubtitle: subtitle,
          formThankYou: thankYou,
          formColor: color,
          formAssignedUserId: assignedUserId || null,
          formFields: fields,
        },
      });
      toast.success('Formulário salvo!');
      onSaved();
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="bg-white dark:bg-slate-900 rounded-xl border p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg"><Link2 className="w-5 h-5 text-blue-600" /></div>
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-white">Formulário Público de Captação</h2>
            <p className="text-xs text-slate-500 mt-0.5">Compartilhe o link e receba leads direto no funil</p>
          </div>
        </div>

        {/* Slug / URL */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Link do formulário *</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 shrink-0">{appUrl}/f/</span>
            <input
              value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="nome-da-empresa"
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {formUrl && (
            <div className="mt-2 flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">{formUrl}</span>
              <button onClick={copyLink} className="flex items-center gap-1 text-xs text-blue-600 font-medium shrink-0">
                {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
              </button>
              <a href={formUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Título e subtítulo */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título do formulário</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Cadastre seu interesse" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subtítulo</label>
            <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Ex: Preencha seus dados e entraremos em contato." className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mensagem de agradecimento</label>
            <input value={thankYou} onChange={e => setThankYou(e.target.value)} placeholder="Ex: Obrigado! Entraremos em contato em breve." className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Cor e corretor */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cor principal</label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer" />
              <span className="text-sm text-slate-500">{color}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Atribuir leads para</label>
            <select value={assignedUserId} onChange={e => setAssignedUserId(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Sem atribuição</option>
              {users.filter((u: any) => u.isActive).map((u: any) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role === 'BROKER' ? 'Corretor' : u.role === 'MANAGER' ? 'Gerente' : 'Admin'})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Campos */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Campos do formulário</label>
          <div className="space-y-2">
            {FORM_FIELD_OPTIONS.map(f => (
              <label key={f.value} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${fields.includes(f.value) ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <input
                  type="checkbox"
                  checked={fields.includes(f.value)}
                  onChange={() => toggleField(f.value)}
                  disabled={f.required}
                  className="accent-blue-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{f.label}</span>
                {f.required && <span className="text-xs text-slate-400">Obrigatório</span>}
              </label>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>

      {formUrl && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-400">
          <p className="font-medium mb-1">💡 Como usar</p>
          <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-500 list-disc list-inside">
            <li>Compartilhe o link no Instagram, WhatsApp ou Facebook</li>
            <li>Gere um QR Code com qualquer ferramenta online e coloque em banners</li>
            <li>Incorpore no seu site copiando o link para um botão</li>
            <li>Os leads chegam automaticamente na coluna "Contato Inicial" do funil</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function AuditTab() {
  const { data } = useQuery({ queryKey: ['audit'], queryFn: () => api.get('/audit').then(r => r.data) });
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b bg-slate-50">{['Usuário', 'Ação', 'Entidade', 'Data'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-slate-600">{h}</th>)}</tr></thead>
        <tbody>
          {(data || []).map((log: any) => (
            <tr key={log.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-3">{log.user?.name || 'Sistema'}</td>
              <td className="px-4 py-3"><span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">{log.action}</span></td>
              <td className="px-4 py-3 text-slate-600">{log.entity}</td>
              <td className="px-4 py-3 text-slate-400 text-xs">{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
            </tr>
          ))}
          {!data?.length && <tr><td colSpan={4} className="text-center py-8 text-slate-400">Nenhum log disponível</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
