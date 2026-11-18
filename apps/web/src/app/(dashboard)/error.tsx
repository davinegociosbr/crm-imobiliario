'use client';
import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

// Error boundary do Next.js — sem isso, um erro de renderização em qualquer
// tela do painel deixava a página em branco, sem nenhuma explicação para o usuário.
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <AlertTriangle className="w-12 h-12 text-red-400" />
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Algo deu errado nessa tela</h2>
        <p className="text-sm text-slate-500 mt-1">Tente novamente. Se o problema continuar, avise o suporte.</p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        <RotateCw className="w-4 h-4" /> Tentar novamente
      </button>
    </div>
  );
}
