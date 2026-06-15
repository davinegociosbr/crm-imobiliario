'use client';

export default function SimulacaoPage() {
  return (
    <div className="h-full -m-6 flex flex-col">
      <iframe
        src="/simulador.html"
        className="flex-1 w-full border-0"
        style={{ minHeight: 'calc(100vh - 64px)' }}
        title="Simulador de Parcelamento"
      />
    </div>
  );
}
