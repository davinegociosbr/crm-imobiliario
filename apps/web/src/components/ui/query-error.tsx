'use client';
import { AlertTriangle, RotateCw } from 'lucide-react';

// Aviso visível quando uma busca de dados falha — sem isso, a tela simplesmente
// fica com dados antigos/vazios e o usuário não tem como saber se é "não tem
// nada" ou "deu erro ao carregar".
export function QueryError({
  message = 'Não foi possível carregar os dados. Verifique sua conexão.',
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-sm mb-4">
      <span className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {message}
      </span>
      <button
        onClick={onRetry}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors shrink-0"
      >
        <RotateCw className="w-3.5 h-3.5" /> Tentar novamente
      </button>
    </div>
  );
}
