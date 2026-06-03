'use client';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export function PropertyModal({ property, onClose }: { property?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: property || {} });

  const mutation = useMutation({
    mutationFn: (data: any) => property ? api.put(`/properties/${property.id}`, data) : api.post('/properties', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['properties'] }); toast.success('Imóvel salvo!'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao salvar'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{property ? 'Editar Imóvel' : 'Novo Imóvel'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Código *</label><input {...register('code', { required: true })} className="field" placeholder="APT001" /></div>
            <div><label className="label">Tipo</label>
              <select {...register('type')} className="field">
                <option value="APARTMENT">Apartamento</option>
                <option value="HOUSE">Casa</option>
                <option value="COMMERCIAL">Comercial</option>
                <option value="LAND">Terreno</option>
                <option value="RURAL">Rural</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>
            <div className="col-span-2"><label className="label">Nome do Empreendimento *</label><input {...register('name', { required: true })} className="field" placeholder="Residencial Jardins" /></div>
            <div><label className="label">Cidade *</label><input {...register('city', { required: true })} className="field" placeholder="São Paulo" /></div>
            <div><label className="label">Bairro</label><input {...register('neighborhood')} className="field" placeholder="Moema" /></div>
            <div className="col-span-2"><label className="label">Endereço</label><input {...register('address')} className="field" placeholder="Rua das Flores, 123" /></div>
            <div><label className="label">Valor (R$) *</label><input {...register('price', { required: true })} type="number" className="field" placeholder="850000" /></div>
            <div><label className="label">Área Privativa (m²)</label><input {...register('privateArea')} type="number" className="field" placeholder="82" /></div>
            <div><label className="label">Dormitórios</label><input {...register('bedrooms')} type="number" className="field" /></div>
            <div><label className="label">Suítes</label><input {...register('suites')} type="number" className="field" /></div>
            <div><label className="label">Vagas de Garagem</label><input {...register('parkingSpots')} type="number" className="field" /></div>
            <div><label className="label">Construtora</label><input {...register('developer')} className="field" placeholder="Construtora ABC" /></div>
            <div className="col-span-2"><label className="label">Descrição</label><textarea {...register('description')} className="field" rows={3} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-lg text-sm">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}Salvar
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`.label{display:block;font-size:12px;font-weight:500;margin-bottom:4px;color:#475569}.field{width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none}.field:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.2)}`}</style>
    </div>
  );
}
