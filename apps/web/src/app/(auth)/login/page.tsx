'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Image from 'next/image';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao fazer login');
    }
  };

  return (
    // Card único com a mesma cor de fundo da logo (#0d1b3e)
    <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: '#0d1b3e' }}>

      {/* Área da logo — mesma cor, sem borda visível */}
      <div className="flex flex-col items-center pt-8 pb-2">
        <Image
          src="/logo-brolezi.png"
          alt="Brolezi Negócios Imobiliários"
          width={150}
          height={150}
          className="object-contain"
          priority
        />
        <p className="text-blue-300/60 text-sm mt-1 mb-4 tracking-wide">Acesse sua conta</p>
      </div>

      {/* Separador sutil */}
      <div className="h-px bg-white/10 mx-6" />

      {/* Formulário */}
      <div className="p-8 pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-1">E-mail</label>
            <input
              {...register('email')}
              type="email"
              placeholder="seu@email.com"
              className="w-full px-3 py-2 border border-white/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/8 text-white placeholder-blue-400/40"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-200 mb-1">Senha</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full px-3 py-2 pr-10 border border-white/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-blue-400/40"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-blue-400/60 hover:text-white transition-colors">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
