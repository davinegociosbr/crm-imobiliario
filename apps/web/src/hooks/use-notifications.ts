'use client';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useNotifications() {
  const notifiedIds = useRef<Set<string>>(new Set());

  // Solicita permissão de notificação ao montar
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const { data: reminders = [] } = useQuery<any[]>({
    queryKey: ['reminders'],
    queryFn: () => api.get('/dashboard/reminders').then(r => r.data),
    refetchInterval: 5 * 60 * 1000, // a cada 5 min
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    reminders.forEach((lead: any) => {
      // Só notifica uma vez por sessão
      if (notifiedIds.current.has(lead.id)) return;

      const isToday = lead.today;
      const isOverdue = lead.overdue;

      if (isToday || isOverdue) {
        notifiedIds.current.add(lead.id);

        const title = isOverdue
          ? `⚠️ Contato vencido — ${lead.name}`
          : `📅 Contato para hoje — ${lead.name}`;

        const body = lead.nextAction
          ? `Próxima ação: ${lead.nextAction}`
          : `Lembre-se de entrar em contato com ${lead.name.split(' ')[0]}`;

        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: lead.id, // evita notificação duplicada do SO
        });

        // Clique na notificação abre o CRM
        notification.onclick = () => {
          window.focus();
          window.location.href = `/leads/${lead.id}`;
        };
      }
    });
  }, [reminders]);
}
