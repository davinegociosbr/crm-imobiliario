'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building2, MapPin, Bed, Car, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, PROPERTY_TYPES } from '@/lib/utils';
import { PropertyModal } from '@/components/properties/property-modal';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  RESERVED: 'bg-amber-100 text-amber-700',
  SOLD: 'bg-slate-100 text-slate-600',
  INACTIVE: 'bg-red-100 text-red-600',
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponível',
  RESERVED: 'Reservado',
  SOLD: 'Vendido',
  INACTIVE: 'Inativo',
};

export default function PropertiesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['properties', search, statusFilter],
    queryFn: () =>
      api.get('/properties', { params: { search, status: statusFilter || undefined } }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/properties/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['properties'] }); toast.success('Imóvel removido'); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/properties/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['properties'] }); qc.invalidateQueries({ queryKey: ['properties-select-available'] }); toast.success('Status atualizado!'); },
    onError: () => toast.error('Erro ao atualizar status'),
  });

  const properties = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar imóvel..." className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="py-2 px-3 text-sm border rounded-lg bg-white dark:bg-slate-900">
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button onClick={() => { setEditItem(null); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" />Novo Imóvel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && <div className="col-span-3 text-center py-12 text-slate-400">Carregando...</div>}
        {properties.map((p: any) => (
          <div key={p.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-40 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-950 flex items-center justify-center">
              <Building2 className="w-12 h-12 text-blue-400" />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-xs text-slate-400 font-mono">{p.code}</span>
                  <h3 className="font-semibold text-slate-800 dark:text-white text-sm leading-tight">{p.name}</h3>
                </div>
                <select
                  value={p.status}
                  onChange={(e) => statusMutation.mutate({ id: p.id, status: e.target.value })}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer outline-none ${STATUS_COLORS[p.status]}`}
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                <MapPin className="w-3 h-3" />
                {p.neighborhood}, {p.city} - {PROPERTY_TYPES[p.type as keyof typeof PROPERTY_TYPES]}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 mb-3">
                {p.bedrooms && <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{p.bedrooms} dorms</span>}
                {p.parkingSpots && <span className="flex items-center gap-1"><Car className="w-3 h-3" />{p.parkingSpots} vaga(s)</span>}
                {p.privateArea && <span>{p.privateArea}m²</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-700 text-base">{formatCurrency(Number(p.price))}</span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditItem(p); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteMutation.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && properties.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-400">Nenhum imóvel cadastrado</div>
        )}
      </div>

      {showModal && <PropertyModal property={editItem} onClose={() => setShowModal(false)} />}
    </div>
  );
}
