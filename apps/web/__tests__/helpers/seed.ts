import testPrisma from "./test-prisma";

/**
 * Centralised test IDs for consistent referencing across test files.
 */
export const TEST_IDS = {
  // Users
  USER_ADMIN: "test-user-admin-001",
  USER_LANCHE: "test-user-lanche-001",
  USER_CACIFOS: "test-user-cacifos-001",

  // Locais
  LOCAL_1: "test-local-001",
  LOCAL_2: "test-local-002",

  // Configuração Cacifos
  CONFIG_CACIFO: "test-config-cacifo-001",

  // Extras
  EXTRA_1: "test-extra-001",
  EXTRA_2: "test-extra-002",
  EXTRA_LANCHE_1: "test-extra-lanche-001",
  EXTRA_LANCHE_2: "test-extra-lanche-002",
  EXTRA_LANCHE_3: "test-extra-lanche-003",

  // Cacifos (created by number, not ID)
  CACIFO_1: 1,
  CACIFO_2: 2,

  // Monitores
  MONITOR_1: "test-monitor-001",
  MONITOR_2: "test-monitor-002",

  // Clientes
  CLIENTE_1: "test-cliente-001",
  CLIENTE_2: "test-cliente-002",

  // Aniversariantes
  ANIV_1: "test-aniv-001",
  ANIV_2: "test-aniv-002",

  // Reservas
  RESERVA_CONFIRMADA: "test-reserva-001",
  RESERVA_PENDENTE: "test-reserva-002",
  RESERVA_EM_CURSO: "test-reserva-003",

  // Reserva Extras
  RESERVA_EXTRA_1: "test-reserva-extra-001",
  RESERVA_EXTRA_2: "test-reserva-extra-002",

  // Ajustes de Pagamento
  AJUSTE_ACRESCIMO: "test-ajuste-001",

  // Segmentos
  SEGMENTO_1: "test-segmento-001",

  // Campanhas
  CAMPANHA_1: "test-campanha-001",

  // Entradas Livres
  ENTRADA_LIVRE_1: "test-entrada-livre-001",
  ENTRADA_LIVRE_2: "test-entrada-livre-002",
  ENTRADA_LIVRE_3: "test-entrada-livre-003",
} as const;

/**
 * Seeds the test database with baseline data required by most test suites.
 */
export async function seedTestData(): Promise<void> {
  // ── Users ───────────────────────────────────────────────────
  await testPrisma.user.upsert({
    where: { id: TEST_IDS.USER_ADMIN },
    update: {},
    create: { id: TEST_IDS.USER_ADMIN, name: "Admin Teste", email: "admin-teste@festas.pt", funcao: "ADMINISTRADOR", activo: true, emailVerified: true },
  });
  await testPrisma.user.upsert({
    where: { id: TEST_IDS.USER_LANCHE },
    update: {},
    create: { id: TEST_IDS.USER_LANCHE, name: "Lanche Teste", email: "lanche-teste@festas.pt", funcao: "LANCHE", activo: true, emailVerified: true },
  });

  // ── Locais ──────────────────────────────────────────────────
  await testPrisma.local.upsert({
    where: { id: TEST_IDS.LOCAL_1 },
    update: {},
    create: { id: TEST_IDS.LOCAL_1, nome: "Sala Teste Azul" },
  });
  await testPrisma.local.upsert({
    where: { id: TEST_IDS.LOCAL_2 },
    update: {},
    create: { id: TEST_IDS.LOCAL_2, nome: "Sala Teste Verde" },
  });

  // ── Extras (EXTRA category) ──────────────────────────────────
  await testPrisma.extra.upsert({
    where: { id: TEST_IDS.EXTRA_1 },
    update: {},
    create: { id: TEST_IDS.EXTRA_1, nome: "Turbo Slide Teste", precoUnitario: 50.0, icone: "slide", categoria: "EXTRA" },
  });
  await testPrisma.extra.upsert({
    where: { id: TEST_IDS.EXTRA_2 },
    update: {},
    create: { id: TEST_IDS.EXTRA_2, nome: "Pinturas Faciais Teste", precoUnitario: 30.0, icone: "palette", categoria: "EXTRA" },
  });

  // ── Extras (LANCHE category - usando EXTRA como categoria) ───
  await testPrisma.extra.upsert({
    where: { id: TEST_IDS.EXTRA_LANCHE_1 },
    update: {},
    create: { id: TEST_IDS.EXTRA_LANCHE_1, nome: "Bolo de Aniversário", precoUnitario: 15.0, icone: "birthday-cake", categoria: "EXTRA", subcategoria: "Lanche" },
  });
  await testPrisma.extra.upsert({
    where: { id: TEST_IDS.EXTRA_LANCHE_2 },
    update: {},
    create: { id: TEST_IDS.EXTRA_LANCHE_2, nome: "Pipocas", precoUnitario: 5.0, icone: "popcorn", categoria: "EXTRA", subcategoria: "Lanche" },
  });
  await testPrisma.extra.upsert({
    where: { id: TEST_IDS.EXTRA_LANCHE_3 },
    update: {},
    create: { id: TEST_IDS.EXTRA_LANCHE_3, nome: "Sumo Natural", precoUnitario: 3.5, icone: "juice-bottle", categoria: "EXTRA", subcategoria: "Lanche" },
  });

  // ── Extra-Local associations ────────────────────────────────
  await testPrisma.extraLocal.upsert({
    where: { extraId_localId: { extraId: TEST_IDS.EXTRA_1, localId: TEST_IDS.LOCAL_1 } },
    update: {},
    create: { extraId: TEST_IDS.EXTRA_1, localId: TEST_IDS.LOCAL_1 },
  });

  // ── Configuração Cacifos ────────────────────────────────────
  await testPrisma.configuracaoCacifo.upsert({
    where: { id: TEST_IDS.CONFIG_CACIFO },
    update: {},
    create: { id: TEST_IDS.CONFIG_CACIFO, totalCacifos: 10 },
  });

  // ── Cacifos ─────────────────────────────────────────────────
  for (let i = 1; i <= 10; i++) {
    await testPrisma.cacifo.upsert({
      where: { numero: i },
      update: {},
      create: { numero: i, estado: "LIVRE", configuracaoId: TEST_IDS.CONFIG_CACIFO },
    });
  }

  // ── Monitores ───────────────────────────────────────────────
  await testPrisma.monitor.upsert({
    where: { id: TEST_IDS.MONITOR_1 },
    update: {},
    create: { id: TEST_IDS.MONITOR_1, nome: "Monitor Teste 1", contacto: "910000001" },
  });
  await testPrisma.monitor.upsert({
    where: { id: TEST_IDS.MONITOR_2 },
    update: {},
    create: { id: TEST_IDS.MONITOR_2, nome: "Monitor Teste 2", contacto: "920000002" },
  });
  for (let i = 3; i <= 8; i++) {
    await testPrisma.monitor.upsert({
      where: { id: `test-monitor-00${i}` },
      update: {},
      create: { id: `test-monitor-00${i}`, nome: `Monitor Teste ${i}`, contacto: `90000000${i}`, activo: i <= 6 },
    });
  }

  // ── Clientes ────────────────────────────────────────────────
  await testPrisma.cliente.upsert({
    where: { id: TEST_IDS.CLIENTE_1 },
    update: {},
    create: { id: TEST_IDS.CLIENTE_1, nome: "Cliente Teste 1", email: "teste1@email.pt", telefone: "911111111" },
  });
  await testPrisma.cliente.upsert({
    where: { id: TEST_IDS.CLIENTE_2 },
    update: {},
    create: { id: TEST_IDS.CLIENTE_2, nome: "Cliente Teste 2", email: "teste2@email.pt", telefone: "922222222" },
  });
  for (let i = 3; i <= 12; i++) {
    await testPrisma.cliente.upsert({
      where: { id: `test-cliente-00${i}` },
      update: {},
      create: {
        id: `test-cliente-00${i}`,
        nome: `Cliente Pesquisa ${i}`,
        email: `pesquisa${i}@email.pt`,
        telefone: `93333330${i}`,
      },
    });
  }

  // ── Aniversariantes ─────────────────────────────────────────
  await testPrisma.aniversariante.upsert({
    where: { id: TEST_IDS.ANIV_1 },
    update: {},
    create: { id: TEST_IDS.ANIV_1, nome: "Criança Teste 1", dataNascimento: new Date("2018-03-15"), clienteId: TEST_IDS.CLIENTE_1 },
  });
  await testPrisma.aniversariante.upsert({
    where: { id: TEST_IDS.ANIV_2 },
    update: {},
    create: { id: TEST_IDS.ANIV_2, nome: "Criança Teste 2", dataNascimento: new Date("2019-07-20"), clienteId: TEST_IDS.CLIENTE_2 },
  });

  // ── Reservas ────────────────────────────────────────────────
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Reserva confirmada (today, 10:00) — com meias + split payment demo
  await testPrisma.reserva.upsert({
    where: { id: TEST_IDS.RESERVA_CONFIRMADA },
    update: {},
    create: {
      id: TEST_IDS.RESERVA_CONFIRMADA,
      data: today,
      horario: "10:00",
      duracaoMinutos: 150,
      numCriancas: 18,
      numCriancasConfirmadas: 16,
      notas: "Reserva de teste confirmada",
      estado: "CONFIRMADO",
      clienteId: TEST_IDS.CLIENTE_1,
      localId: TEST_IDS.LOCAL_1,
      // Bolo
      bolo: "NOSSO_1KG",
      boloTema: "Frozen",
      boloQuantidade: 1,
      // Notas por equipa
      notasCacifos: "Criança com alergia a frutos secos",
      notasLanche: "Sem sumos gaseificados",
      // Preço por criança (cálculo aplicado)
      precoCriancaAplicado: 15,
      minimoCriancas: 10,
      // Meias (compra obrigatória)
      meiasQuantidade: 18,
      meiasPrecoUnit: 2,
      // Split payment (caução MBWAY + resto multibanco) — já paga
      pago: true,
      metodoPagamento: "MBWAY",
      valorPago: 50,
      metodoPagamento2: "MULTIBANCO",
      valorPago2: 240,
    },
  });
  // Link aniversariante via pivot
  await testPrisma.reservaAniversariante.upsert({
    where: { id: `${TEST_IDS.RESERVA_CONFIRMADA}-${TEST_IDS.ANIV_1}` },
    update: {},
    create: { id: `${TEST_IDS.RESERVA_CONFIRMADA}-${TEST_IDS.ANIV_1}`, reservaId: TEST_IDS.RESERVA_CONFIRMADA, aniversarianteId: TEST_IDS.ANIV_1 },
  });

  // Reserva pendente (tomorrow, 14:00)
  await testPrisma.reserva.upsert({
    where: { id: TEST_IDS.RESERVA_PENDENTE },
    update: {},
    create: {
      id: TEST_IDS.RESERVA_PENDENTE,
      data: tomorrow,
      horario: "14:00",
      duracaoMinutos: 120,
      numCriancas: 12,
      notas: "Reserva pendente de teste",
      estado: "RESERVA",
      clienteId: TEST_IDS.CLIENTE_2,
      localId: TEST_IDS.LOCAL_2,
      // Bolo — pais trazem (tema e quantidade não se aplicam)
      bolo: "PAIS_TRAZEM",
      // Notas por equipa
      notasCacifos: "Gemidos de dois anos",
      notasLanche: "Bolachas sem açúcar",
    },
  });
  await testPrisma.reservaAniversariante.upsert({
    where: { id: `${TEST_IDS.RESERVA_PENDENTE}-${TEST_IDS.ANIV_2}` },
    update: {},
    create: { id: `${TEST_IDS.RESERVA_PENDENTE}-${TEST_IDS.ANIV_2}`, reservaId: TEST_IDS.RESERVA_PENDENTE, aniversarianteId: TEST_IDS.ANIV_2 },
  });

  // Reserva em curso (today, 10:00)
  const inicio = new Date(today);
  inicio.setHours(10, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setMinutes(fim.getMinutes() + 150);

  await testPrisma.reserva.upsert({
    where: { id: TEST_IDS.RESERVA_EM_CURSO },
    update: {},
    create: {
      id: TEST_IDS.RESERVA_EM_CURSO,
      data: today,
      horario: "10:00",
      duracaoMinutos: 150,
      numCriancas: 20,
      estado: "EM_CURSO",
      inicioEm: inicio,
      fimPrevisto: fim,
      clienteId: TEST_IDS.CLIENTE_1,
      localId: TEST_IDS.LOCAL_2,
    },
  });
  await testPrisma.reservaAniversariante.upsert({
    where: { id: `${TEST_IDS.RESERVA_EM_CURSO}-${TEST_IDS.ANIV_1}` },
    update: {},
    create: { id: `${TEST_IDS.RESERVA_EM_CURSO}-${TEST_IDS.ANIV_1}`, reservaId: TEST_IDS.RESERVA_EM_CURSO, aniversarianteId: TEST_IDS.ANIV_1 },
  });

  // ── Reserva Extras (toggle de conclusão no dia da festa) ────
  // EXTRA_1 na confirmada: ainda não entregue (concluido = false)
  await testPrisma.reservaExtra.upsert({
    where: { id: TEST_IDS.RESERVA_EXTRA_1 },
    update: {},
    create: { id: TEST_IDS.RESERVA_EXTRA_1, reservaId: TEST_IDS.RESERVA_CONFIRMADA, extraId: TEST_IDS.EXTRA_1, quantidade: 1, concluido: false },
  });
  // EXTRA_2 na em curso: já entregue (concluido = true)
  await testPrisma.reservaExtra.upsert({
    where: { id: TEST_IDS.RESERVA_EXTRA_2 },
    update: {},
    create: { id: TEST_IDS.RESERVA_EXTRA_2, reservaId: TEST_IDS.RESERVA_EM_CURSO, extraId: TEST_IDS.EXTRA_2, quantidade: 2, concluido: true },
  });

  // ── Ajuste de Pagamento (acréscimo exemplo — write-through) ──
  // ACRESCIMO 10€ na confirmada (meias). O valorPago do seed já considera o acerto.
  await testPrisma.ajustePagamento.upsert({
    where: { id: TEST_IDS.AJUSTE_ACRESCIMO },
    update: {},
    create: {
      id: TEST_IDS.AJUSTE_ACRESCIMO,
      tipo: "ACRESCIMO",
      valor: 10,
      motivo: "Meias compradas no parque (5 × 2€)",
      reservaId: TEST_IDS.RESERVA_CONFIRMADA,
      metodoPagamento: "DINHEIRO",
      criadoPorId: TEST_IDS.USER_ADMIN,
    },
  });

  // ── Segmento ────────────────────────────────────────────────
  await testPrisma.segmento.upsert({
    where: { id: TEST_IDS.SEGMENTO_1 },
    update: {},
    create: { id: TEST_IDS.SEGMENTO_1, nome: "Segmento Teste", descricao: "Para testes" },
  });

  // ── Configuração Preço Global (singleton) ───────────────────
  await testPrisma.configuracaoPreco.upsert({
    where: { id: "config-preco-test" },
    update: {},
    create: {
      id: "config-preco-test",
      precoCriancaSemana: 15,
      precoCriancaFimSemana: 20,
      precoEntradaHoraSemana: 10,
      precoEntradaHoraFimSemana: 12,
      minimosCriancasPorAniversariante: [
        { aniversariantes: 1, minimo: 10 },
        { aniversariantes: 2, minimo: 15 },
        { aniversariantes: 3, minimo: 20 },
      ],
      precoMeias: 2,
      precoExcessoFixo: 5,
      duracaoDefaultFestaMin: 135,
      duracaoExcessoBlocoMin: 30,
    },
  });

  // ── User CACIFOS ────────────────────────────────────────────
  await testPrisma.user.upsert({
    where: { id: TEST_IDS.USER_CACIFOS },
    update: {},
    create: { id: TEST_IDS.USER_CACIFOS, name: "Cacifos Teste", email: "cacifos-teste@festas.pt", funcao: "CACIFOS", activo: true, emailVerified: true },
  });

  // ── Exceções de Calendário (demo) ───────────────────────────
  // Normaliza para meia-noite (evita problemas de precisão de DATETIME no MySQL)
  const feriadoDemo = new Date(today);
  feriadoDemo.setHours(0, 0, 0, 0);
  feriadoDemo.setDate(feriadoDemo.getDate() + 30);
  await testPrisma.excecaoCalendario.upsert({
    where: { data: feriadoDemo },
    update: {},
    create: { data: feriadoDemo, tipo: "FERIADO", nome: "Feriado Demo", afectaPreco: true, bloqueiaReserva: false, recorrenciaAnual: false },
  });
  const bloqueadoDemo = new Date(today);
  bloqueadoDemo.setHours(0, 0, 0, 0);
  bloqueadoDemo.setDate(bloqueadoDemo.getDate() + 45);
  await testPrisma.excecaoCalendario.upsert({
    where: { data: bloqueadoDemo },
    update: {},
    create: { data: bloqueadoDemo, tipo: "BLOQUEADO", nome: "Dia Bloqueado Demo", afectaPreco: false, bloqueiaReserva: true, recorrenciaAnual: false },
  });

  // ── Slots Horários (demo) ───────────────────────────────────
  for (const slot of [
    { horaInicio: "10:00", duracaoMin: 135, ordem: 1 },
    { horaInicio: "14:00", duracaoMin: 135, ordem: 2 },
  ]) {
    const existing = await testPrisma.slotHorario.findFirst({ where: { horaInicio: slot.horaInicio } });
    if (!existing) {
      await testPrisma.slotHorario.create({ data: slot });
    }
  }

  // ── Entradas Livres ─────────────────────────────────────────
  const entradaInicio = new Date(today);
  entradaInicio.setHours(9, 0, 0, 0);
  const entradaFim = new Date(entradaInicio);
  entradaFim.setMinutes(entradaFim.getMinutes() + 90);

  // Entrada ativa
  await testPrisma.entradaLivre.upsert({
    where: { id: TEST_IDS.ENTRADA_LIVRE_1 },
    update: {},
    create: {
      id: TEST_IDS.ENTRADA_LIVRE_1,
      encarregadoNome: "Encarregado Teste 1",
      encarregadoTelefone: "911111111",
      encarregadoEmail: "teste1@email.pt",
      duracaoMinutos: 90,
      custoHora: 10.0,
      custoTotal: 15.0,
      inicioEm: entradaInicio,
      fimPrevisto: entradaFim,
      estado: "ATIVA",
      temLanche: false,
      numAdultos: 0,
      pago: true,
      metodoPagamento: "MBWAY",
      criancas: [{ nome: "João", idade: 6 }, { nome: "Maria", idade: 5 }],
    },
  });

  // Entrada concluída (ontem)
  const ontem = new Date(today);
  ontem.setDate(ontem.getDate() - 1);
  const entradaInicioOntem = new Date(ontem);
  entradaInicioOntem.setHours(10, 0, 0, 0);
  const entradaFimOntem = new Date(entradaInicioOntem);
  entradaFimOntem.setMinutes(entradaFimOntem.getMinutes() + 90);
  const entradaFimReal = new Date(entradaFimOntem);
  entradaFimReal.setMinutes(entradaFimReal.getMinutes() + 30); // 30 min de excesso

  await testPrisma.entradaLivre.upsert({
    where: { id: TEST_IDS.ENTRADA_LIVRE_2 },
    update: {},
    create: {
      id: TEST_IDS.ENTRADA_LIVRE_2,
      encarregadoNome: "Encarregado Teste 2",
      encarregadoTelefone: "922222222",
      duracaoMinutos: 90,
      custoHora: 8.0,
      custoTotal: 12.0,
      inicioEm: entradaInicioOntem,
      fimPrevisto: entradaFimOntem,
      fimReal: entradaFimReal,
      estado: "CONCLUIDA",
      temLanche: true,
      numAdultos: 0,
      excessoMinutos: 30,
      custoExcesso: 5.0,
      custoTotalFinal: 17.0,
      pago: true,
      pagoExcesso: true,
      metodoPagamento: "MULTIBANCO",
      criancas: [{ nome: "Pedro", idade: 7 }],
    },
  });

  // Entrada cancelada
  const entradaInicio3 = new Date(today);
  entradaInicio3.setHours(11, 0, 0, 0);
  const entradaFim3 = new Date(entradaInicio3);
  entradaFim3.setMinutes(entradaFim3.getMinutes() + 60);

  await testPrisma.entradaLivre.upsert({
    where: { id: TEST_IDS.ENTRADA_LIVRE_3 },
    update: {},
    create: {
      id: TEST_IDS.ENTRADA_LIVRE_3,
      encarregadoNome: "Encarregado Teste 3",
      encarregadoTelefone: "933333333",
      duracaoMinutos: 60,
      custoHora: 10.0,
      custoTotal: 10.0,
      inicioEm: entradaInicio3,
      fimPrevisto: entradaFim3,
      estado: "CANCELADA",
      temLanche: false,
      numAdultos: 0,
      fimReal: new Date(today), // Cancelada rapidamente
      criancas: [{ nome: "Ana", idade: 4 }],
    },
  });
}

/**
 * Cleans all test data from the test schema.
 */
export async function cleanTestData(): Promise<void> {
  await testPrisma.entradaLivreExtra.deleteMany().catch(() => {});
  await testPrisma.entradaLivre.deleteMany().catch(() => {});

  await testPrisma.envioCampanha.deleteMany().catch(() => {});
  await testPrisma.campanha.deleteMany().catch(() => {});
  await testPrisma.contactoSegmento.deleteMany().catch(() => {});
  await testPrisma.newsletterContacto.deleteMany().catch(() => {});
  await testPrisma.segmento.deleteMany().catch(() => {});

  await testPrisma.menu.deleteMany().catch(() => {});

  await testPrisma.ajustePagamento.deleteMany().catch(() => {});

  await testPrisma.reservaEtapa.deleteMany().catch(() => {});
  await testPrisma.reservaMonitor.deleteMany().catch(() => {});
  await testPrisma.reservaAniversariante.deleteMany().catch(() => {});
  await testPrisma.reservaExtra.deleteMany().catch(() => {});
  await testPrisma.cacifo.deleteMany().catch(() => {});
  await testPrisma.reserva.deleteMany().catch(() => {});

  await testPrisma.configuracaoCacifo.deleteMany().catch(() => {});

  await testPrisma.aniversariante.deleteMany().catch(() => {});
  await testPrisma.cliente.deleteMany().catch(() => {});

  await testPrisma.etapaFesta.deleteMany().catch(() => {});
  await testPrisma.alocacaoMonitor.deleteMany().catch(() => {});
  await testPrisma.monitor.deleteMany().catch(() => {});

  await testPrisma.extraLocal.deleteMany().catch(() => {});
  await testPrisma.extra.deleteMany().catch(() => {});

  await testPrisma.local.deleteMany().catch(() => {});

  await testPrisma.excecaoCalendario.deleteMany().catch(() => {});
  await testPrisma.slotHorario.deleteMany().catch(() => {});
  await testPrisma.configuracaoPreco.deleteMany().catch(() => {});

  await testPrisma.user.deleteMany().catch(() => {});
}
