'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60_000,       // dados frescos por 1 min — sem refetch desnecessário
          gcTime: 10 * 60_000,     // cache na memória por 10 min — volta rápido ao navegar
          retry: 1,
          refetchOnWindowFocus: false, // não refetch ao trocar de aba do browser
        },
      },
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
