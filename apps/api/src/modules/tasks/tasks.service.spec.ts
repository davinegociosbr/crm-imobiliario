import { Test } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../prisma/prisma.service';

// Cobre a lógica de recorrência (a parte mais arriscada deste módulo: gera
// tarefas automaticamente, e um bug aqui silenciosamente cria/some tarefas
// erradas em produção) e a regra de que editar a recorrência numa ocorrência
// filha deve sempre afetar a tarefa-modelo (pai) — exatamente o bug corrigido
// anteriormente nesta sessão.
describe('TasksService', () => {
  let service: TasksService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      task: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [TasksService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TasksService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('recorrência diária', () => {
    it('gera uma ocorrência por dia até a data de término (inclusive)', async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 0, 1, 12, 0, 0));

      prisma.task.create.mockResolvedValue({
        id: 'parent-1',
        companyId: 'c1',
        assignedUserId: 'u1',
        createdByUserId: 'u1',
        leadId: null,
        title: 'Follow-up diário',
        description: null,
        priority: 'MEDIUM',
        dueAt: new Date(2026, 0, 1, 12, 0, 0),
        recurrenceType: 'DAILY',
        recurrenceDays: [],
        recurrenceDay: null,
        recurrenceEnd: new Date(2026, 0, 5, 12, 0, 0),
      });

      await service.create('c1', 'u1', {
        title: 'Follow-up diário',
        dueAt: '2026-01-01T12:00:00',
        recurrenceType: 'DAILY',
        recurrenceEnd: '2026-01-05T12:00:00',
      });

      expect(prisma.task.createMany).toHaveBeenCalledTimes(1);
      const created = prisma.task.createMany.mock.calls[0][0].data;
      expect(created).toHaveLength(5); // 1, 2, 3, 4 e 5 de janeiro
      expect(created.every((o: any) => o.parentTaskId === 'parent-1')).toBe(true);
    });
  });

  describe('recorrência semanal', () => {
    it('gera ocorrências só nos dias da semana escolhidos', async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 0, 1, 9, 0, 0)); // quinta-feira

      prisma.task.create.mockResolvedValue({
        id: 'parent-2',
        companyId: 'c1',
        assignedUserId: 'u1',
        createdByUserId: 'u1',
        leadId: null,
        title: 'Reunião semanal',
        description: null,
        priority: 'MEDIUM',
        dueAt: new Date(2026, 0, 1, 9, 0, 0),
        recurrenceType: 'WEEKLY',
        recurrenceDays: [1, 3], // segunda e quarta
        recurrenceDay: null,
        recurrenceEnd: new Date(2026, 0, 15, 9, 0, 0),
      });

      await service.create('c1', 'u1', {
        title: 'Reunião semanal',
        dueAt: '2026-01-01T09:00:00',
        recurrenceType: 'WEEKLY',
        recurrenceDays: [1, 3],
        recurrenceEnd: '2026-01-15T09:00:00',
      });

      const created = prisma.task.createMany.mock.calls[0][0].data;
      expect(created.length).toBeGreaterThan(0);
      expect(created.every((o: any) => [1, 3].includes(new Date(o.dueAt).getDay()))).toBe(true);
    });
  });

  describe('recorrência mensal', () => {
    it('ajusta o dia escolhido para o último dia do mês quando ele não existe (ex: 31 em fevereiro)', async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 0, 1, 10, 0, 0));

      prisma.task.create.mockResolvedValue({
        id: 'parent-3',
        companyId: 'c1',
        assignedUserId: 'u1',
        createdByUserId: 'u1',
        leadId: null,
        title: 'Pagamento mensal',
        description: null,
        priority: 'MEDIUM',
        dueAt: new Date(2026, 0, 1, 10, 0, 0),
        recurrenceType: 'MONTHLY',
        recurrenceDays: [],
        recurrenceDay: 31,
        recurrenceEnd: new Date(2026, 2, 31, 10, 0, 0),
      });

      await service.create('c1', 'u1', {
        title: 'Pagamento mensal',
        dueAt: '2026-01-01T10:00:00',
        recurrenceType: 'MONTHLY',
        recurrenceDay: 31,
        recurrenceEnd: '2026-03-31T10:00:00',
      });

      const created = prisma.task.createMany.mock.calls[0][0].data;
      const february = created.find((o: any) => new Date(o.dueAt).getMonth() === 1);
      expect(february).toBeDefined();
      expect(new Date(february.dueAt).getDate()).toBe(28); // 2026 não é bissexto
    });
  });

  describe('editar recorrência a partir de uma ocorrência filha', () => {
    it('aplica a mudança na tarefa-modelo (pai), nunca na ocorrência', async () => {
      const child = { id: 'child-1', parentTaskId: 'parent-1', companyId: 'c1' };
      prisma.task.findFirst.mockResolvedValue(child);
      prisma.task.update
        .mockResolvedValueOnce({ id: 'child-1' }) // update dos campos próprios da ocorrência
        .mockResolvedValueOnce({ id: 'parent-1', recurrenceType: null }); // update da série (desligada)

      await service.update('child-1', 'c1', { recurrenceType: '' });

      expect(prisma.task.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'parent-1' },
        data: { recurrenceType: null },
      });
      // recorrência desligada → não deve gerar novas ocorrências
      expect(prisma.task.createMany).not.toHaveBeenCalled();
    });
  });
});
