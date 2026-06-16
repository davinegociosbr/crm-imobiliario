'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ORIGINS = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'REFERRAL', label: 'Indicação de amigo' },
  { value: 'PORTAL_IMOVEIS', label: 'Portal de Imóveis' },
  { value: 'WEBSITE', label: 'Site' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'OTHER', label: 'Outro' },
];

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', phone: '', whatsapp: '', email: '',
    interest: '', city: '', origin: '', notes: '',
  });

  useEffect(() => {
    axios.get(`${API}/public/form/${slug}`)
      .then(r => setConfig(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Nome e telefone são obrigatórios.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/public/form/${slug}/submit`, form);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-slate-700">Formulário não encontrado</h1>
        <p className="text-slate-500 mt-1">O link que você acessou não é válido.</p>
      </div>
    </div>
  );

  const primary = config.primaryColor || '#2563eb';

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: primary + '20' }}>
          <CheckCircle2 className="w-10 h-10" style={{ color: primary }} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Cadastro realizado!</h1>
        <p className="text-slate-500 text-lg">{config.thankYouMessage}</p>
      </div>
    </div>
  );

  const fields: string[] = config.fields || ['name', 'phone', 'whatsapp', 'email', 'interest', 'origin'];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {config.logo && (
            <img src={config.logo} alt={config.companyName} className="h-14 object-contain mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold text-slate-800">{config.title}</h1>
          {config.subtitle && <p className="text-slate-500 mt-2">{config.subtitle}</p>}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {fields.includes('name') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
                <input
                  value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Seu nome"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': primary } as any}
                />
              </div>
            )}

            {fields.includes('phone') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp *</label>
                <input
                  value={form.phone}
                  onChange={e => set('phone', maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                />
              </div>
            )}

            {fields.includes('email') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                />
              </div>
            )}

            {fields.includes('interest') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">O que você procura?</label>
                <input
                  value={form.interest} onChange={e => set('interest', e.target.value)}
                  placeholder="Ex: Apartamento 2 quartos, Novo Horizonte..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                />
              </div>
            )}

            {fields.includes('city') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                <input
                  value={form.city} onChange={e => set('city', e.target.value)}
                  placeholder="Sua cidade"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                />
              </div>
            )}

            {fields.includes('origin') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Como nos conheceu?</label>
                <select
                  value={form.origin} onChange={e => set('origin', e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white"
                >
                  <option value="">Selecione...</option>
                  {ORIGINS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {fields.includes('notes') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mensagem (opcional)</label>
                <textarea
                  value={form.notes} onChange={e => set('notes', e.target.value)}
                  rows={3} placeholder="Deixe uma mensagem ou dúvida..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {error}
              </p>
            )}

            <button
              type="submit" disabled={submitting}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
              style={{ background: primary }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Enviando...' : 'Quero ser atendido'}
            </button>

            <p className="text-center text-xs text-slate-400 mt-2">
              Seus dados estão seguros e não serão compartilhados.
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Powered by CRM Brolezi
        </p>
      </div>
    </div>
  );
}
