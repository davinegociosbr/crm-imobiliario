'use client';
import { useEffect } from 'react';

// Última linha de defesa — pega erros que acontecem até no layout raiz da
// aplicação (fora do alcance do error.tsx do painel).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Algo deu errado</h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>Tente recarregar a página. Se o problema continuar, avise o suporte.</p>
          <button
            onClick={reset}
            style={{ padding: '8px 16px', borderRadius: 8, background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
