'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Phone, MessageCircle, Mail, Eye, Trash2, Upload, Download, Loader2, Kanban } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate, LEAD_STATUS, LEAD_ORIGINS, formatCurrency } from '@/lib/utils';
import { LeadModal } from '@/components/leads/lead-modal';

const PIPELINE_STAGE_OPTIONS = [
  { value: 'INITIAL_CONTACT', label: 'Contato Inicial' },
  { value: 'REDIRECT',        label: 'Redirecionar' },
  { value: 'ATTENDANCE',      label: 'Atendimento' },
  { value: 'TODAY',           label: 'Hoje' },
  { value: 'FOLLOW_UP',       label: 'Follow-up' },
  { value: 'CLIENTS',         label: 'Clientes' },
  { value: 'INACTIVE',        label: 'Inativos' },
];

function AddToPipelineModal({ lead, onClose }: { lead: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [stage, setStage] = useState('INITIAL_CONTACT');
  const [interest, setInterest] = useState(lead.interest || '');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      // Move o lead para a etapa escolhida (o moveCard já muda status para IN_PROGRESS)
      await api.put(`/pipeline/${lead.id}/move`, { stage });
      // Atualiza interesse se foi alterado
      if (interest && interest !== lead.interest) {
        await api.put(`/leads/${lead.id}`, { interest });
      }
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['pipeline-kanban'] });
      toast.success(`${lead.name} adicionado ao funil!`);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao adicionar ao funil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-96" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 dark:text-white mb-1">Adicionar ao Funil</h3>
        <p className="text-sm text-slate-500 mb-4">{lead.name}</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Interesse / Negócio</label>
            <input
              value={interest}
              onChange={e => setInterest(e.target.value)}
              placeholder="Ex: Apartamento 3 dorms, Residencial Norte..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Etapa do Funil</label>
            <select
              value={stage}
              onChange={e => setStage(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
              {PIPELINE_STAGE_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-3 mb-4">
          💡 Um novo card será criado no funil. O contato pode ter múltiplas negociações simultâneas.
        </p>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
          <button
            onClick={handleAdd}
            disabled={loading}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Kanban className="w-3.5 h-3.5" />}
            Criar Card
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [addToPipelineLead, setAddToPipelineLead] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/export/import-leads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { created, skipped, errors } = res.data;
      toast.success(`✅ ${created} leads importados, ${skipped} ignorados (duplicatas/sem dados)`);
      if (errors?.length) toast.error(`Erros: ${errors.join(', ')}`);
      qc.invalidateQueries({ queryKey: ['leads'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao importar arquivo');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['leads', search, statusFilter],
    queryFn: () =>
      api.get('/leads', { params: { search, status: statusFilter || undefined } }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/leads/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead removido');
    },
  });

  const allLeads: any[] = data?.data || [];

  // Deduplica por telefone: para cada número, mantém o lead mais recente
  const leads = (() => {
    const seen = new Map<string, any>();
    for (const lead of allLeads) {
      const key = (lead.phone || lead.whatsapp || lead.email || lead.id)
        .replace(/\D/g, '') || lead.id;
      if (!seen.has(key)) {
        seen.set(key, lead);
      } else {
        // Mantém o mais recente
        const existing = seen.get(key)!;
        if (new Date(lead.createdAt) > new Date(existing.createdAt)) {
          seen.set(key, lead);
        }
      }
    }
    return Array.from(seen.values());
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail ou telefone..."
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900"
          >
            <option value="">Todos os status</option>
            {Object.entries(LEAD_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {/* Input escondido para upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/api/v1/export/import-template`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Baixar modelo CSV"
          >
            <Download className="w-4 h-4" />
            Modelo
          </a>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
            title="Importar leads de CSV ou Excel"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Contato</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Origem</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Potencial</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Corretor</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Cadastro</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">Carregando...</td></tr>
              )}
              {!isLoading && leads.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">Nenhum lead encontrado</td></tr>
              )}
              {leads.map((lead: any) => {
                const statusInfo = LEAD_STATUS[lead.status as keyof typeof LEAD_STATUS];
                return (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">{lead.name}</p>
                        <p className="text-xs text-slate-400">{lead.city}, {lead.state}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a href={`tel:${lead.phone}`} className="p-1.5 rounded hover:bg-blue-50 text-blue-600">
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        {lead.whatsapp && (
                          <a href={`https://web.whatsapp.com/send?phone=55${lead.whatsapp.replace(/\D/g, '')}`} target="whatsapp_web" className="p-1.5 rounded hover:bg-green-50 text-green-600">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="p-1.5 rounded hover:bg-slate-50 text-slate-600">
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600">{LEAD_ORIGINS[lead.origin as keyof typeof LEAD_ORIGINS] || lead.origin}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-700">{lead.potentialValue ? formatCurrency(Number(lead.potentialValue)) : '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo?.color}`}>
                        {statusInfo?.label || lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{lead.assignedUser?.name || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400">{formatDate(lead.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setAddToPipelineLead(lead)}
                          className="p-1.5 rounded hover:bg-purple-50 text-purple-600"
                          title="Adicionar ao Funil"
                        >
                          <Kanban className="w-4 h-4" />
                        </button>
                        <Link href={`/leads/${lead.id}`} className="p-1.5 rounded hover:bg-blue-50 text-blue-600">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => deleteMutation.mutate(lead.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <LeadModal onClose={() => setShowModal(false)} />}
      {addToPipelineLead && <AddToPipelineModal lead={addToPipelineLead} onClose={() => setAddToPipelineLead(null)} />}
    </div>
  );
}
