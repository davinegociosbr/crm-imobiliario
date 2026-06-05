'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { UserPlus, Download, FileJson, FileText, Loader2, Mail } from 'lucide-react';

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

      {tab === 'audit' && <AuditTab />}
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
    } catch {
      toast.error('❌ Erro ao enviar backup por e-mail. Verifique se o e-mail está configurado no servidor.');
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
          Todo dia às <strong>04:00 (horário de Brasília)</strong> um backup completo em Excel é enviado automaticamente para <strong>davi.negociosbr@gmail.com</strong>.
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
