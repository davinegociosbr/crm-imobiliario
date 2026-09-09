'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PIPELINE_STAGES } from '@/lib/utils';

const DEFAULT_STAGE_KEYS = Object.keys(PIPELINE_STAGES);

// Resolve a lista real de etapas do funil da empresa (padrão menos as excluídas,
// mais as customizadas, com rótulos e ordem definidos em Configurações). Fonte
// única para qualquer tela que precise listar/rotular etapas do funil — evita
// telas divergindo da configuração real (ex: mostrar uma etapa já excluída).
export function usePipelineStages() {
  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: () => api.get('/company').then((r) => r.data),
  });

  const settings = (company?.settings || {}) as any;
  const deletedStages: string[] = settings.deletedPipelineStages || [];
  const customStages: { key: string; label: string; color: string }[] = settings.customPipelineStages || [];
  const stageLabels: Record<string, string> = settings.stageLabels || {};
  const stageOrder: string[] = settings.stageOrder || [];

  const allKeys = [
    ...DEFAULT_STAGE_KEYS.filter((s) => !deletedStages.includes(s)),
    ...customStages.map((c) => c.key),
  ];
  const visibleStages = stageOrder.length
    ? [...stageOrder.filter((k) => allKeys.includes(k)), ...allKeys.filter((k) => !stageOrder.includes(k))]
    : allKeys;

  const stageInfo: Record<string, { label: string; color: string }> = {
    ...Object.fromEntries(
      Object.entries(PIPELINE_STAGES).map(([k, v]) => [k, { label: stageLabels[k] || v.label, color: v.color }])
    ),
    ...Object.fromEntries(customStages.map((c) => [c.key, { label: c.label, color: c.color }])),
  };

  return { visibleStages, stageInfo };
}
