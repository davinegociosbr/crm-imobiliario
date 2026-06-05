'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Phone, MessageCircle, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export default function AgendaPage() {
  const router = useRouter();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  // Busca todos os leads com próximo contato
  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ['agenda-leads'],
    queryFn: () => api.get('/leads', { params: { take: 200 } }).then(r =>
      (r.data.data || []).filter((l: any) => l.nextContactAt)
    ),
    refetchInterval: 60000,
  });

  // Busca visitas do mês
  const { data: visits = [] } = useQuery<any[]>({
    queryKey: ['agenda-visits'],
    queryFn: () => api.get('/visits', { params: { take: 200 } }).then(r => r.data.data || []),
  });

  // Busca tarefas
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['agenda-tasks'],
    queryFn: () => api.get('/tasks', { params: { take: 200 } }).then(r => r.data.data || r.data || []),
  });

  const { year, month } = currentDate;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Agrupa eventos por dia
  const eventsByDay: Record<number, any[]> = {};

  leads.forEach((lead: any) => {
    const d = new Date(lead.nextContactAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push({ type: 'contact', lead, date: d });
    }
  });

  visits.forEach((visit: any) => {
    if (!visit.scheduledAt) return;
    const d = new Date(visit.scheduledAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push({ type: 'visit', visit, date: d });
    }
  });

  tasks.forEach((task: any) => {
    if (!task.dueAt) return;
    const d = new Date(task.dueAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push({ type: 'task', task, date: d });
    }
  });

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];
  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : null;

  const prevMonth = () => {
    setCurrentDate(c => c.month === 0
      ? { year: c.year - 1, month: 11 }
      : { year: c.year, month: c.month - 1 }
    );
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(c => c.month === 11
      ? { year: c.year + 1, month: 0 }
      : { year: c.year, month: c.month + 1 }
    );
    setSelectedDay(null);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Calendário */}
      <div className="flex-1 max-w-lg">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Header do calendário */}
          <div className="flex items-center justify-between px-5 py-4 border-b dark:border-slate-800">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold text-slate-800 dark:text-white">
              {MONTHS_PT[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 border-b dark:border-slate-800">
            {DAYS_PT.map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
            ))}
          </div>

          {/* Dias do mês */}
          <div className="grid grid-cols-7">
            {/* Espaços vazios antes do primeiro dia */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-14 border-b border-r dark:border-slate-800/50" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const events = eventsByDay[day] || [];
              const isToday = day === todayDay;
              const isSelected = day === selectedDay;
              const isOverdue = events.some(e => e.type === 'contact' && new Date(e.date) < today && day !== todayDay);

              const contactCount = events.filter(e => e.type === 'contact').length;
              const visitCount = events.filter(e => e.type === 'visit').length;
              const taskCount = events.filter(e => e.type === 'task').length;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`h-14 border-b border-r dark:border-slate-800/50 p-1 flex flex-col items-center transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-0.5 ${
                    isToday
                      ? 'bg-blue-600 text-white'
                      : isSelected
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : isOverdue
                      ? 'text-red-500'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {day}
                  </span>
                  <div className="flex gap-0.5 flex-wrap justify-center">
                    {contactCount > 0 && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-blue-500'}`} />
                    )}
                    {visitCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                    {taskCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-4 mt-3 px-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Contato</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Visita</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Tarefa</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Vencido</div>
        </div>
      </div>

      {/* Painel lateral — eventos do dia selecionado */}
      <div className="flex-1">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-full flex flex-col">
          <div className="px-5 py-4 border-b dark:border-slate-800">
            <h3 className="font-semibold text-slate-800 dark:text-white">
              {selectedDay
                ? `${selectedDay} de ${MONTHS_PT[month]}`
                : 'Selecione um dia'}
            </h3>
            {selectedDay && (
              <p className="text-xs text-slate-400 mt-0.5">{selectedEvents.length} evento{selectedEvents.length !== 1 ? 's' : ''}</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!selectedDay && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Calendar className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Clique em um dia para ver os eventos</p>
              </div>
            )}

            {selectedDay && selectedEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <CheckCircle2 className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Nenhum evento neste dia</p>
              </div>
            )}

            {/* Contatos */}
            {selectedEvents.filter(e => e.type === 'contact').map((event, i) => {
              const lead = event.lead;
              const overdue = new Date(event.date) < today && selectedDay !== todayDay;
              return (
                <div key={i} className={`rounded-xl border p-3 ${overdue ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900' : 'border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900'}`}>
                  <div className="flex items-start gap-2">
                    <div className={`p-1.5 rounded-lg shrink-0 ${overdue ? 'bg-red-100 dark:bg-red-950/40' : 'bg-blue-100 dark:bg-blue-950/40'}`}>
                      {overdue ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> : <Phone className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white">{lead.name}</p>
                      {lead.nextAction && <p className="text-xs text-slate-500 mt-0.5">{lead.nextAction}</p>}
                      <p className={`text-xs font-medium mt-0.5 ${overdue ? 'text-red-500' : 'text-blue-500'}`}>
                        {overdue ? '⚠️ Vencido' : '📞 Contato agendado'} · {new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) !== '12:00' ? new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 text-xs font-medium hover:bg-blue-200">
                      <Phone className="w-3 h-3" /> Ligar
                    </a>
                    {lead.whatsapp && (
                      <a
                        href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${lead.name.split(' ')[0]}, tudo bem? Passando para dar um retorno sobre o atendimento. Podemos conversar?`)}`}
                        target="_blank"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 dark:bg-green-950/40 text-green-600 text-xs font-medium hover:bg-green-200"
                      >
                        <MessageCircle className="w-3 h-3" /> WhatsApp
                      </a>
                    )}
                    <button onClick={() => router.push(`/leads/${lead.id}`)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 ml-auto">
                      Ver lead →
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Visitas */}
            {selectedEvents.filter(e => e.type === 'visit').map((event, i) => (
              <div key={i} className="rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-900 p-3">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/40 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                      Visita — {event.visit.lead?.name || 'Lead'}
                    </p>
                    {event.visit.property?.name && (
                      <p className="text-xs text-slate-500 mt-0.5">{event.visit.property.name}</p>
                    )}
                    <p className="text-xs text-purple-500 font-medium mt-0.5">
                      🏠 {new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Tarefas */}
            {selectedEvents.filter(e => e.type === 'task').map((event, i) => (
              <div key={i} className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{event.task.title}</p>
                    {event.task.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{event.task.description}</p>
                    )}
                    <p className="text-xs text-amber-500 font-medium mt-0.5">
                      ✅ {new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
