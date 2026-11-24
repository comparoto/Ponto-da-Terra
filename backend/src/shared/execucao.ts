/**
 * Execução de um grupo de tarefas INDEPENDENTES em dois modos (FCCPD, Unidade 2):
 *
 *  - "concorrente" (padrão): todas as tarefas são disparadas ao mesmo tempo (Promise.all). Com um pool de
 *    conexões, o PostgreSQL recebe as consultas em conexões diferentes e as executa em processos diferentes,
 *    então elas podem rodar em paralelo no servidor de banco. O tempo total tende ao da tarefa mais lenta.
 *  - "sequencial": cada tarefa só é iniciada depois que a anterior terminou. É a linha de base da comparação.
 *
 * A lógica de negócio é a mesma nos dois modos: quem chama passa as mesmas tarefas, só muda o modo.
 * As tarefas são funções (e não promessas já criadas) para que o início de cada uma possa ser adiado.
 *
 * Observação conceitual: o Node.js executa o JavaScript em uma única thread. O ganho aqui vem de esperar
 * várias operações de E/S ao mesmo tempo (concorrência assíncrona) e do paralelismo real que acontece FORA do
 * processo Node: no PostgreSQL, uma consulta por conexão, cada uma em um processo próprio do servidor.
 */
export type ModoExecucao = 'concorrente' | 'sequencial';

/** Início e fim de uma tarefa, em milissegundos de `performance.now()`. Serve para medir a sobreposição. */
export type IntervaloTarefa = { nome: string; inicioMs: number; fimMs: number };

export type OpcoesExecucao = {
  modo?: ModoExecucao;
  /** Chamado ao fim de cada tarefa (com sucesso ou erro). Opcional; usado pelo benchmark e pelos testes. */
  observar?: (intervalo: IntervaloTarefa) => void;
};

type Tarefas = Record<string, () => PromiseLike<unknown>>;
export type Resultados<T extends Tarefas> = { [K in keyof T]: Awaited<ReturnType<T[K]>> };

export async function executarGrupo<T extends Tarefas>(tarefas: T, opcoes: OpcoesExecucao = {}): Promise<Resultados<T>> {
  const { modo = 'concorrente', observar } = opcoes;
  const nomes = Object.keys(tarefas);

  const rodar = async (nome: string): Promise<unknown> => {
    const inicioMs = performance.now();
    try {
      return await tarefas[nome]();
    } finally {
      observar?.({ nome, inicioMs, fimMs: performance.now() });
    }
  };

  const valores: unknown[] = [];
  if (modo === 'sequencial') {
    for (const nome of nomes) valores.push(await rodar(nome));
  } else {
    valores.push(...(await Promise.all(nomes.map(rodar))));
  }
  return Object.fromEntries(nomes.map((nome, i) => [nome, valores[i]])) as Resultados<T>;
}

/** Quantas tarefas estiveram ativas ao mesmo tempo, no pico, a partir dos intervalos medidos. */
export function picoDeSobreposicao(intervalos: IntervaloTarefa[]): number {
  const eventos = intervalos.flatMap(i => [
    { t: i.inicioMs, delta: 1 },
    { t: i.fimMs, delta: -1 },
  ]);
  // No mesmo instante, os términos vêm antes dos inícios: tarefas que apenas se encostam não contam como sobrepostas
  eventos.sort((a, b) => a.t - b.t || a.delta - b.delta);
  let ativas = 0;
  let pico = 0;
  for (const e of eventos) {
    ativas += e.delta;
    pico = Math.max(pico, ativas);
  }
  return pico;
}
