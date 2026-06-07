'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Loader2, Kanban } from 'lucide-react';
import { api } from '@/lib/api';
import { LEAD_ORIGINS, PIPELINE_STAGES } from '@/lib/utils';

interface Props {
  lead?: any;
  onClose: () => void;
}

const PIPELINE_OPTIONS = Object.entries(PIPELINE_STAGES).map(([value, info]) => ({
  value,
  label: info.label,
}));

export function LeadModal({ lead, onClose }: Props) {
  const qc = useQueryClient();
  const [addToPipeline, setAddToPipeline] = useState(false);
  const [pipelineStage, setPipelineStage] = useState('INITIAL_CONTACT');

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: lead || {},
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (lead) {
        return api.put(`/leads/${lead.id}`, data);
      }
      // Cria o lead
      const res = await api.post('/leads', data);
      const newLead = res.data;

      // Se marcou para adicionar ao funil, atualiza status e move para a etapa escolhida
      if (addToPipeline && newLead?.id) {
        await api.put(`/leads/${newLead.id}`, { status: 'IN_PROGRESS' });
        await api.put(`/pipeline/${newLead.id}/move`, { stage: pipelineStage });
      }
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['pipeline-kanban'] });
      toast.success(lead ? 'Lead atualizado!' : addToPipeline ? 'Lead criado e adicionado ao funil!' : 'Lead criado!');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao salvar'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{lead ? 'Editar Lead' : 'Novo Lead'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Nome *</label>
              <input {...register('name', { required: true })} className="input-field" placeholder="Nome completo" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefone *</label>
              <input {...register('phone', { required: true })} className="input-field" placeholder="(11) 99999-0000" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp</label>
              <input {...register('whatsapp')} className="input-field" placeholder="(11) 99999-0000" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <input {...register('email')} type="email" className="input-field" placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CPF</label>
              <input {...register('cpf')} className="input-field" placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cidade</label>
              <input {...register('city')} className="input-field" placeholder="São Paulo" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <input {...register('state')} className="input-field" placeholder="SP" maxLength={2} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Faixa de Investimento</label>
              <input {...register('investmentRange')} className="input-field" placeholder="R$ 500k - R$ 1M" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Faixa de Renda</label>
              <input {...register('incomeRange')} className="input-field" placeholder="R$ 10k - R$ 20k/mês" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Origem</label>
              <select {...register('origin')} className="input-field">
                {Object.entries(LEAD_ORIGINS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valor Potencial (R$)</label>
              <input {...register('potentialValue')} type="number" className="input-field" placeholder="850000" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Interesse</label>
              <input {...register('interest')} className="input-field" placeholder="Apartamento 3 dorms, Moema..." />
            </div>
          </div>

          {/* ── Criar card no funil ─────────────────────────────────────── */}
          {!lead && (
            <div className={`rounded-xl border-2 transition-colors ${addToPipeline ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
              <button
                type="button"
                onClick={() => setAddToPipeline(!addToPipeline)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${addToPipeline ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                  {addToPipeline && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Kanban className={`w-4 h-4 ${addToPipeline ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium ${addToPipeline ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    Criar card no Funil de Vendas
                  </span>
                </div>
              </button>

              {addToPipeline && (
                <div className="px-4 pb-4">
                  <label className="block text-xs font-medium text-slate-500 mb-2">Etapa do funil</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PIPELINE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPipelineStage(opt.value)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all text-left ${
                          pipelineStage === opt.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-lg text-sm font-medium hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {lead ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>

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
