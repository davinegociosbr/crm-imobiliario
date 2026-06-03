import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatPhone(phone: string) {
  return phone?.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') || '';
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export const PIPELINE_STAGES = {
  INITIAL_CONTACT: { label: 'Contato Inicial', color: 'bg-slate-500' },
  REDIRECT:        { label: 'Redirecionar',    color: 'bg-purple-500' },
  ATTENDANCE:      { label: 'Atendimento',     color: 'bg-blue-500' },
  TODAY:           { label: 'Hoje',            color: 'bg-cyan-500' },
  FOLLOW_UP:       { label: 'Follow-up',       color: 'bg-amber-500' },
  CLIENTS:         { label: 'Clientes',        color: 'bg-green-500' },
  INACTIVE:        { label: 'Inativos',        color: 'bg-red-400' },
};

export const LEAD_STATUS = {
  NEW: { label: 'Novo', color: 'bg-slate-100 text-slate-700' },
  IN_PROGRESS: { label: 'Em atendimento', color: 'bg-blue-100 text-blue-700' },
  QUALIFIED: { label: 'Qualificado', color: 'bg-indigo-100 text-indigo-700' },
  NEGOTIATION: { label: 'Negociação', color: 'bg-amber-100 text-amber-700' },
  CONTRACT: { label: 'Contrato', color: 'bg-purple-100 text-purple-700' },
  WON: { label: 'Ganhou', color: 'bg-green-100 text-green-700' },
  LOST: { label: 'Perdeu', color: 'bg-red-100 text-red-700' },
};

export const LEAD_ORIGINS = {
  WEBSITE: 'Site',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  GOOGLE: 'Google',
  REFERRAL: 'Indicação',
  PORTAL_IMOVEIS: 'Portal Imóveis',
  WHATSAPP: 'WhatsApp',
  PHONE: 'Telefone',
  EMAIL: 'E-mail',
  WALK_IN: 'Presencial',
  OTHER: 'Outro',
};

export const ACTIVITY_TYPES = {
  CALL: { label: 'Ligação', icon: 'Phone' },
  WHATSAPP: { label: 'WhatsApp', icon: 'MessageCircle' },
  EMAIL: { label: 'E-mail', icon: 'Mail' },
  MEETING: { label: 'Reunião', icon: 'Users' },
  VISIT: { label: 'Visita', icon: 'MapPin' },
  PROPOSAL: { label: 'Proposta', icon: 'FileText' },
  RESERVATION: { label: 'Reserva', icon: 'Key' },
  CONTRACT: { label: 'Contrato', icon: 'FileCheck' },
  NOTE: { label: 'Nota', icon: 'StickyNote' },
  FOLLOW_UP: { label: 'Follow-up', icon: 'RefreshCw' },
};

export const PROPERTY_TYPES = {
  APARTMENT: 'Apartamento',
  HOUSE: 'Casa',
  COMMERCIAL: 'Comercial',
  LAND: 'Terreno',
  RURAL: 'Rural',
  OTHER: 'Outro',
};

export const VISIT_STATUS = {
  SCHEDULED: { label: 'Agendada', color: 'bg-blue-100 text-blue-700' },
  CONFIRMED: { label: 'Confirmada', color: 'bg-indigo-100 text-indigo-700' },
  COMPLETED: { label: 'Realizada', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
  RESCHEDULED: { label: 'Reagendada', color: 'bg-amber-100 text-amber-700' },
};
