'use client';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useState, useRef, useEffect } from 'react';

function SearchSelect({ label, required, items, value, onChange, getLabel }: {
  label: string; required?: boolean;
  items: any[]; value: string;
  onChange: (id: string) => void;
  getLabel: (item: any) => string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = items.find(i => i.id === value);
  const filtered = items.filter(i => getLabel(i).toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <label className="text-sm font-medium mb-1 block">{label}{required && ' *'}</label>
      <button type="button" onClick={() => { setOpen(o => !o); setSearch(''); }}
        className="w-full p-2 border rounded-lg text-sm text-left flex items-center justify-between bg-white dark:bg-slate-900">
        <span className={selected ? '' : 'text-slate-400'}>{selected ? getLabel(selected) : 'Selecione'}</span>
        <span className="text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border rounded-lg shadow-lg">
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border-b outline-none" placeholder="Buscar..." />
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Nenhum resultado</li>}
            {filtered.map(i => (
              <li key={i.id} onClick={() => { onChange(i.id); setOpen(false); }}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                {getLabel(i)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SaleModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [leadId, setLeadId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const { data: leads } = useQuery({ queryKey: ['leads-select'], queryFn: () => api.get('/leads', { params: { take: 500 } }).then(r => r.data.data) });
  const { data: properties } = useQuery({ queryKey: ['properties-select'], queryFn: () => api.get('/properties', { params: { take: 500 } }).then(r => r.data.data) });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/sales', { ...data, leadId, propertyId, saleValue: Number(data.saleValue), commissionPercent: Number(data.commissionPercent) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales'] }); qc.invalidateQueries({ queryKey: ['sales-summary'] }); toast.success('Venda registrada!'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Registrar Venda</h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <SearchSelect label="Cliente" required items={leads || []} value={leadId} onChange={setLeadId} getLabel={l => l.name} />
          <SearchSelect label="Imóvel" required items={properties || []} value={propertyId} onChange={setPropertyId} getLabel={p => `${p.code} - ${p.name}`} />
          <div>
            <label className="text-sm font-medium mb-1 block">Valor da Venda (R$) *</label>
            <input {...register('saleValue', { required: true })} type="number" className="w-full p-2 border rounded-lg text-sm" placeholder="850000" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">% Comissão</label>
            <input {...register('commissionPercent')} type="number" step="0.1" className="w-full p-2 border rounded-lg text-sm" placeholder="5" defaultValue={5} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Data da Venda</label>
            <input {...register('soldAt')} type="date" className="w-full p-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Observações</label>
            <textarea {...register('notes')} className="w-full p-2 border rounded-lg text-sm" rows={2} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-lg text-sm">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
