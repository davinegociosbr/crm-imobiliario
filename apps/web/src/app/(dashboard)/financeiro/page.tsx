'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

// ── types ─────────────────────────────────────────────────────────────────────
type FinancialType = 'RECEIVABLE' | 'PAYABLE';
type FinancialStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
type FinancialCategory = 'COMMISSION' | 'RENT' | 'SALE' | 'SERVICE' | 'TAX' | 'SALARY' | 'MARKETING' | 'INFRASTRUCTURE' | 'OTHER';

interface Entry {
  id: string;
  type: FinancialType;
  category: FinancialCategory;
  description: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: FinancialStatus;
  contactName?: string;
  notes?: string;
  lead?: { id: string; name: string };
}

interface Summary {
  totalReceivable: number;
  receivedPaid: number;
  pendingReceivable: number;
  overdueReceivable: number;
  totalPayable: number;
  payablePaid: number;
  pendingPayable: number;
  overduePayable: number;
  balance: number;
}

// ── helpers ───────────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<FinancialCategory, string> = {
  COMMISSION: 'Comissão', RENT: 'Aluguel', SALE: 'Venda', SERVICE: 'Serviço',
  TAX: 'Imposto', SALARY: 'Salário', MARKETING: 'Marketing',
  INFRASTRUCTURE: 'Infraestrutura', OTHER: 'Outros',
};

const STATUS_LABELS: Record<FinancialStatus, string> = {
  PENDING: 'Pendente', PAID: 'Pago', OVERDUE: 'Vencido', CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<FinancialStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

function formatBRL(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function parseBRL(formatted: string): number {
  return parseFloat(formatted.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}
function ptDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

// ── modal ─────────────────────────────────────────────────────────────────────
function EntryModal({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!entry;

  const [form, setForm] = useState({
    type: entry?.type ?? 'RECEIVABLE',
    category: entry?.category ?? 'OTHER',
    description: entry?.description ?? '',
    amountDisplay: entry ? formatBRL(String(Math.round(Number(entry.amount) * 100))) : '',
    dueDate: entry ? entry.dueDate.substring(0, 10) : '',
    status: entry?.status ?? 'PENDING',
    contactName: entry?.contactName ?? '',
    notes: entry?.notes ?? '',
  });

  const save = useMutation({
    mutationFn: (data: any) =>
      isEdit ? api.put(`/financial/${entry.id}`, data) : api.post('/financial', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financial'] }); qc.invalidateQueries({ queryKey: ['financial-summary'] }); onClose(); },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate({ ...form, amount: parseBRL(form.amountDisplay) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isEdit ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {(['RECEIVABLE', 'PAYABLE'] as FinancialType[]).map((t) => (
              <button
                key={t} type="button"
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.type === t
                    ? t === 'RECEIVABLE'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-red-500 text-white border-red-500'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t === 'RECEIVABLE' ? '↑ Conta a Receber' : '↓ Conta a Pagar'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição *</label>
            <input
              required value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              placeholder="Ex: Comissão venda Apto 302"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor *</label>
              <input
                required value={form.amountDisplay}
                onChange={e => setForm(f => ({ ...f, amountDisplay: formatBRL(e.target.value) }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vencimento *</label>
              <input
                required type="date" value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as FinancialCategory }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as FinancialStatus }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              >
                <option value="PENDING">Pendente</option>
                <option value="PAID">Pago</option>
                <option value="OVERDUE">Vencido</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contato / Cliente</label>
            <input
              value={form.contactName}
              onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              placeholder="Nome do cliente ou fornecedor"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observações</label>
            <textarea
              value={form.notes} rows={2}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button
              type="submit" disabled={save.isPending}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              {save.isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
      <div className={`p-2.5 rounded-xl ${color}`}><Icon className="w-4 h-4 text-white" /></div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(value)}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'ALL' | 'RECEIVABLE' | 'PAYABLE'>('ALL');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Entry | null | 'new'>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: entries = [] } = useQuery<Entry[]>({
    queryKey: ['financial', tab, statusFilter, search],
    queryFn: () => api.get('/financial', { params: { type: tab === 'ALL' ? undefined : tab, status: statusFilter || undefined, search: search || undefined } }).then(r => r.data),
  });

  const { data: summary } = useQuery<Summary>({
    queryKey: ['financial-summary'],
    queryFn: () => api.get('/financial/summary').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/financial/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financial'] }); qc.invalidateQueries({ queryKey: ['financial-summary'] }); setDeleteId(null); },
  });

  const markPaid = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/financial/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financial'] }); qc.invalidateQueries({ queryKey: ['financial-summary'] }); },
  });

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Financeiro</h1>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Novo Lançamento
        </button>
      </div>

      {/* summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="A Receber (total)" value={summary.pendingReceivable} icon={TrendingUp} color="bg-green-600" sub={`Recebido: ${formatCurrency(summary.receivedPaid)}`} />
          <SummaryCard label="A Pagar (total)" value={summary.pendingPayable} icon={TrendingDown} color="bg-red-500" sub={`Pago: ${formatCurrency(summary.payablePaid)}`} />
          <SummaryCard label="Vencidos a Receber" value={summary.overdueReceivable} icon={AlertCircle} color="bg-amber-500" />
          <SummaryCard label="Saldo Líquido" value={summary.balance} icon={DollarSign} color={summary.balance >= 0 ? 'bg-blue-600' : 'bg-red-600'} />
        </div>
      )}

      {/* filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          {(['ALL', 'RECEIVABLE', 'PAYABLE'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {t === 'ALL' ? 'Todos' : t === 'RECEIVABLE' ? '↑ Receber' : '↓ Pagar'}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
        >
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="PAID">Pago</option>
          <option value="OVERDUE">Vencido</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar descrição ou contato..."
          className="flex-1 min-w-48 border border-slate-300 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
        />
      </div>

      {/* table - desktop */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Descrição</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Contato</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Categoria</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Vencimento</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400"></th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Nenhum lançamento encontrado</td></tr>
              )}
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    {e.type === 'RECEIVABLE'
                      ? <span className="flex items-center gap-1 text-green-600 font-medium"><TrendingUp className="w-3.5 h-3.5" /> Receber</span>
                      : <span className="flex items-center gap-1 text-red-500 font-medium"><TrendingDown className="w-3.5 h-3.5" /> Pagar</span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{e.description}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{e.contactName || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{CATEGORY_LABELS[e.category]}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{formatCurrency(Number(e.amount))}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{ptDate(e.dueDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status]}`}>
                      {e.status === 'PAID' && <CheckCircle2 className="w-3 h-3" />}
                      {e.status === 'PENDING' && <Clock className="w-3 h-3" />}
                      {e.status === 'OVERDUE' && <AlertCircle className="w-3 h-3" />}
                      {STATUS_LABELS[e.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {e.status === 'PENDING' && (
                        <button
                          onClick={() => markPaid.mutate({ id: e.id, status: 'PAID' })}
                          title="Marcar como pago"
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => setModal(e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deleteId === e.id ? (
                        <span className="flex items-center gap-1 text-xs">
                          <button onClick={() => deleteMutation.mutate(e.id)} className="text-red-600 font-medium hover:underline">Sim</button>
                          <span className="text-slate-400">/</span>
                          <button onClick={() => setDeleteId(null)} className="text-slate-500 hover:underline">Não</button>
                        </span>
                      ) : (
                        <button onClick={() => setDeleteId(e.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* mobile cards */}
      <div className="md:hidden space-y-3">
        {entries.length === 0 && <p className="text-center text-slate-400 py-8">Nenhum lançamento encontrado</p>}
        {entries.map((e) => (
          <div key={e.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">{e.description}</p>
                {e.contactName && <p className="text-xs text-slate-500 mt-0.5">{e.contactName}</p>}
              </div>
              <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status]}`}>
                {STATUS_LABELS[e.status]}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-lg font-bold ${e.type === 'RECEIVABLE' ? 'text-green-600' : 'text-red-500'}`}>
                  {e.type === 'RECEIVABLE' ? '+' : '-'}{formatCurrency(Number(e.amount))}
                </p>
                <p className="text-xs text-slate-400">Venc. {ptDate(e.dueDate)}</p>
              </div>
              <div className="flex gap-2">
                {e.status === 'PENDING' && (
                  <button onClick={() => markPaid.mutate({ id: e.id, status: 'PAID' })} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setModal(e)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(deleteId === e.id ? null : e.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* modal */}
      {modal && (
        <EntryModal
          entry={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
