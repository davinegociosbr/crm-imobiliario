'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Phone, MessageCircle, Mail, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate, LEAD_STATUS, LEAD_ORIGINS, formatCurrency } from '@/lib/utils';
import { LeadModal } from '@/components/leads/lead-modal';

export default function LeadsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

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

  const leads = data?.data || [];

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
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Lead
        </button>
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
                          <a href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, '')}`} target="_blank" className="p-1.5 rounded hover:bg-green-50 text-green-600">
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
    </div>
  );
}
