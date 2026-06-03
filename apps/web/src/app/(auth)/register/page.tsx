'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const schema = z.object({
  companyName: z.string().min(2, 'Nome da imobiliária obrigatório'),
  userName: z.string().min(2, 'Seu nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const register_store = useAuthStore((s) => s.register);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await register_store(data);
      toast.success('Conta criada com sucesso!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao criar conta');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">CRM Imobiliário</h1>
          <p className="text-sm text-slate-500">Crie sua conta gratuitamente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {[
          { name: 'companyName', label: 'Nome da Imobiliária', placeholder: 'Imobiliária XYZ', type: 'text' },
          { name: 'userName', label: 'Seu Nome', placeholder: 'João Silva', type: 'text' },
          { name: 'email', label: 'E-mail', placeholder: 'seu@email.com', type: 'email' },
          { name: 'phone', label: 'Telefone (opcional)', placeholder: '(11) 99999-0000', type: 'tel' },
          { name: 'password', label: 'Senha', placeholder: '••••••••', type: 'password' },
        ].map((f) => (
          <div key={f.name}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
            <input
              {...register(f.name as any)}
              type={f.type}
              placeholder={f.placeholder}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {(errors as any)[f.name] && (
              <p className="text-red-500 text-xs mt-1">{(errors as any)[f.name]?.message}</p>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        Já tem conta?{' '}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">
          Fazer login
        </Link>
      </div>
    </div>
  );
}
