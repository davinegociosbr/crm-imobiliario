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
    <div className="flex flex-col items-center gap-6">
      {/* Logo diretamente no fundo azul, sem card */}
      <div className="flex flex-col items-center">
        <Image
          src="/logo-brolezi.png"
          alt="Brolezi Negócios Imobiliários"
          width={140}
          height={140}
          className="object-contain"
          style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.4))' }}
          priority
        />
        <p className="text-blue-200/70 text-sm mt-2 tracking-wide">Acesse sua conta</p>
      </div>

      {/* Card apenas do formulário */}
      <div className="w-full bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-1">E-mail</label>
            <input
              {...register('email')}
              type="email"
              placeholder="seu@email.com"
              className="w-full px-3 py-2 border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/10 text-white placeholder-blue-300/50"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-100 mb-1">Senha</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full px-3 py-2 pr-10 border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/10 text-white placeholder-blue-300/50"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-blue-300/70 hover:text-white transition-colors">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 hover:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-blue-900/50"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
