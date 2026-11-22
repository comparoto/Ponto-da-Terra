/**
 * Gera docs/DIAGRAMA_DE_CLASSES.md a partir do schema do banco (backend/prisma/schema.prisma).
 *
 * O diagrama sai do código, então não fica desatualizado: ao mudar o schema, rode
 *   npm run docs:diagrama      (na pasta backend/)
 * e faça commit do arquivo gerado. Os comentários "AJUSTE" do schema viram a tabela de diferenças
 * em relação ao diagrama de classes da 1ª unidade.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RAIZ = resolve(__dirname, '..', '..');
const SCHEMA = resolve(RAIZ, 'backend', 'prisma', 'schema.prisma');
const SAIDA = resolve(RAIZ, 'docs', 'DIAGRAMA_DE_CLASSES.md');

const ESCALARES = new Set(['String', 'Int', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'BigInt', 'Bytes']);

type Campo = { nome: string; tipo: string; lista: boolean; opcional: boolean; atributos: string; doc: string[] };
type Modelo = { nome: string; campos: Campo[]; doc: string[] };
type Enumeracao = { nome: string; valores: string[]; doc: string[] };
type Relacao = { origem: string; destino: string; multOrigem: string; multDestino: string; rotulo: string };

// ───────────── Leitura do schema ─────────────
const modelos: Modelo[] = [];
const enums: Enumeracao[] = [];
{
  const linhas = readFileSync(SCHEMA, 'utf-8').split(/\r?\n/);
  let doc: string[] = [];
  let atual: Modelo | Enumeracao | null = null;
  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (!atual) {
      const doc3 = /^\/\/\/\s?(.*)$/.exec(linha);
      if (doc3) {
        doc.push(doc3[1]);
        continue;
      }
      const m = /^(model|enum)\s+(\w+)\s*\{$/.exec(linha);
      if (m) {
        if (m[1] === 'model') {
          const novo: Modelo = { nome: m[2], campos: [], doc };
          modelos.push(novo);
          atual = novo;
        } else {
          const novo: Enumeracao = { nome: m[2], valores: [], doc };
          enums.push(novo);
          atual = novo;
        }
      }
      doc = [];
      continue;
    }
    if (linha === '}') {
      atual = null;
      doc = [];
      continue;
    }
    const docCampo = /^\/\/\/\s?(.*)$/.exec(linha);
    if (docCampo) {
      doc.push(docCampo[1]);
      continue;
    }
    if (!linha || linha.startsWith('//') || linha.startsWith('@@')) {
      doc = [];
      continue;
    }
    if ('campos' in atual) {
      const c = /^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/.exec(linha);
      if (c) atual.campos.push({ nome: c[1], tipo: c[2], lista: Boolean(c[3]), opcional: Boolean(c[4]), atributos: c[5], doc });
    } else {
      const v = /^(\w+)/.exec(linha);
      if (v) atual.valores.push(v[1]);
    }
    doc = [];
  }
}

const nomesEnum = new Set(enums.map(e => e.nome));
const nomesModelo = new Set(modelos.map(m => m.nome));

const GRUPOS: { titulo: string; descricao: string; modelos: string[] }[] = [
  { titulo: 'Pessoas e contas', descricao: 'Usuário e os perfis comprador, artesão e administrador, com endereços e recuperação de senha.', modelos: ['Usuario', 'Consumidor', 'Administrador', 'Artesao', 'Endereco', 'TokenRedefinicaoSenha'] },
  { titulo: 'Catálogo e relacionamento com o comprador', descricao: 'Peças, estoque, categorias, favoritos, avaliações, mensagens ao produtor e checklist de formalização do artesão.', modelos: ['CategoriaProduto', 'Produto', 'Estoque', 'Favorito', 'Avaliacao', 'MensagemContato', 'ChecklistFormalizacao'] },
  { titulo: 'Compra, pagamento e pedidos', descricao: 'Carrinho, a compra (um pagamento) dividida em um pedido por artesão, entrega, histórico e intervenções do admin.', modelos: ['Carrinho', 'ItemCarrinho', 'Compra', 'Pedido', 'ItemPedido', 'Pagamento', 'Entrega', 'HistoricoStatusPedido', 'IntervencaoPedido'] },
  { titulo: 'Fila de eventos e notificações', descricao: 'Transactional Outbox (eventos gravados junto com a operação) e o registro das notificações.', modelos: ['EventoOutbox', 'NotificacaoLog'] },
];

const agrupados = new Set(GRUPOS.flatMap(g => g.modelos));
const semGrupo = modelos.filter(m => !agrupados.has(m.nome)).map(m => m.nome);
const grupoInexistente = [...agrupados].filter(n => !nomesModelo.has(n));
if (semGrupo.length || grupoInexistente.length) {
  throw new Error(`Atualize GRUPOS em scripts/gerar-diagrama-de-classes.ts. Sem grupo: [${semGrupo.join(', ')}]. Grupo com modelo que não existe: [${grupoInexistente.join(', ')}]`);
}

// ───────────── Relações (lado que guarda a chave estrangeira) ─────────────
const relacoes: Relacao[] = [];
for (const m of modelos) {
  for (const c of m.campos) {
    if (ESCALARES.has(c.tipo) || nomesEnum.has(c.tipo) || !nomesModelo.has(c.tipo)) continue;
    const fk = /fields:\s*\[([^\]]+)\]/.exec(c.atributos);
    if (!fk) continue; // o outro lado da relação (lista ou referência inversa)
    const nomeFk = fk[1].split(',')[0].trim();
    const campoFk = m.campos.find(x => x.nome === nomeFk);
    const umParaUm = Boolean(campoFk && /@unique\b/.test(campoFk.atributos));
    relacoes.push({ origem: m.nome, destino: c.tipo, multOrigem: umParaUm ? '0..1' : '*', multDestino: c.opcional ? '0..1' : '1', rotulo: c.nome });
  }
}

// ───────────── Mermaid ─────────────
const tipoExibido = (c: Campo) => `${c.tipo}${c.lista ? '[]' : ''}${c.opcional ? '?' : ''}`;
const atributosDe = (m: Modelo) => m.campos.filter(c => ESCALARES.has(c.tipo) || nomesEnum.has(c.tipo)).map(c => `    +${tipoExibido(c)} ${c.nome}`);
const linhaRelacao = (r: Relacao) => `  ${r.origem} "${r.multOrigem}" --> "${r.multDestino}" ${r.destino} : ${r.rotulo}`;

const diagramaGeral = ['```mermaid', 'classDiagram', '  direction LR', ...modelos.map(m => `  class ${m.nome}`), ...relacoes.map(linhaRelacao), '```'].join('\n');

function diagramaDoGrupo(nomes: string[]): string {
  const dentro = new Set(nomes);
  const rel = relacoes.filter(r => dentro.has(r.origem) || dentro.has(r.destino));
  const externos = [...new Set(rel.flatMap(r => [r.origem, r.destino]).filter(n => !dentro.has(n)))];
  const classes = nomes.map(n => {
    const m = modelos.find(x => x.nome === n)!;
    return [`  class ${n} {`, ...atributosDe(m), '  }'].join('\n');
  });
  const stubs = externos.map(n => `  class ${n} {\n    <<outro grupo>>\n  }`);
  return ['```mermaid', 'classDiagram', ...classes, ...stubs, ...rel.map(linhaRelacao), '```'].join('\n');
}

// ───────────── Tabelas ─────────────
const limpar = (t: string) => t.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const ajustes: { onde: string; texto: string }[] = [];
for (const m of modelos) {
  const aj = m.doc.filter(d => d.includes('AJUSTE')).join(' ');
  if (aj) ajustes.push({ onde: m.nome, texto: aj });
  for (const c of m.campos) {
    const ajc = c.doc.filter(d => d.includes('AJUSTE')).join(' ');
    if (ajc) ajustes.push({ onde: `${m.nome}.${c.nome}`, texto: ajc });
  }
}
for (const e of enums) {
  const aj = e.doc.filter(d => d.includes('AJUSTE')).join(' ');
  if (aj) ajustes.push({ onde: `enum ${e.nome}`, texto: aj });
}

const descricoes = modelos.filter(m => m.doc.length).map(m => `| \`${m.nome}\` | ${limpar(m.doc.join(' '))} |`);

const partes: string[] = [];
partes.push(`# Diagrama de classes do modelo de dados

> **Arquivo gerado automaticamente** a partir de \`backend/prisma/schema.prisma\` (\`cd backend && npm run docs:diagrama\`). Não edite à mão: mude o schema e gere de novo.

Este diagrama mostra o modelo de dados **como está implementado** (${modelos.length} classes e ${enums.length} enumerações). Ele atualiza o diagrama de classes da 1ª unidade com os ajustes que a implementação exigiu: a tabela "Ajustes em relação ao diagrama da 1ª unidade", mais abaixo, vem dos comentários \`AJUSTE\` do próprio schema e se liga aos conflitos C2, C3, C8 e C9 do [documento de requisitos](../REQUISITOS_BACKEND.md) (seção 5).

**Como ler:** \`*\` = muitos, \`1\` = exatamente um, \`0..1\` = opcional. A seta sai da classe que guarda a chave estrangeira. O rótulo é o nome do campo de relação.

## Visão geral

${diagramaGeral}`);
for (const g of GRUPOS) {
  partes.push(`## ${g.titulo}\n\n${g.descricao}\n\n${diagramaDoGrupo(g.modelos)}`);
}
partes.push(`## Enumerações

| Enumeração | Valores |
|---|---|
${enums.map(e => `| \`${e.nome}\` | ${e.valores.map(v => `\`${v}\``).join(', ')} |`).join('\n')}`);
partes.push(`## Ajustes em relação ao diagrama da 1ª unidade

Vêm dos comentários \`AJUSTE\` do schema. Os códigos C2, C3, C8, C9 e D5 referem-se ao quadro de conflitos e decisões do [documento de requisitos](../REQUISITOS_BACKEND.md).

| Onde | Ajuste |
|---|---|
${ajustes.map(a => `| \`${a.onde}\` | ${limpar(a.texto.replace(/AJUSTE\s*:?\s*/g, ''))} |`).join('\n')}`);
partes.push(`## Descrição das classes (do schema)

| Classe | Descrição |
|---|---|
${descricoes.join('\n')}`);
partes.push(`## Pendência

O diagrama de classes **original** (1ª unidade, no Drive) e o plano de testes (casos TC09 e TC02) são documentos externos e ainda não foram editados. Este arquivo é a versão atualizada do modelo; a decisão D9 do documento de requisitos fica resolvida para o diagrama de classes e continua aberta apenas para os casos de teste do plano.`);

writeFileSync(SAIDA, partes.join('\n\n') + '\n', 'utf-8');
console.log(`Gerado: ${SAIDA}`);
console.log(`${modelos.length} classes · ${enums.length} enumerações · ${relacoes.length} relações · ${ajustes.length} ajustes`);
