import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

/**
 * Trava de qualidade: o backend não usa o tipo any.
 *
 * O lint do backend (npm run lint) já proíbe o any, e esta verificação fica como segunda barreira dentro da
 * suíte de testes. Ela lê o código com o compilador do TypeScript, por isso não confunde a palavra em comentário
 * ou em texto com o tipo de verdade. Pega o tipo escrito em variável, parâmetro, conversão, lista ou genérico, e
 * também o schema que aceita qualquer coisa (a chamada any() do Zod).
 * Os comparadores do Jest que levam o mesmo nome não são o tipo e continuam permitidos.
 */

const RAIZ = resolve(__dirname, '..');
const PASTAS = ['src', 'tests', 'scripts', 'prisma', 'api'];
// O nome do tipo é montado por partes para não aparecer escrito neste arquivo
const T = ['a', 'n', 'y'].join('');

function arquivosTs(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap(e => {
    const caminho = join(pasta, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : arquivosTs(caminho);
    return /\.(ts|tsx)$/.test(e.name) ? [caminho] : [];
  });
}

function usosDeAny(arquivo: string): string[] {
  const codigo = readFileSync(arquivo, 'utf-8');
  const fonte = ts.createSourceFile(arquivo, codigo, ts.ScriptTarget.Latest, true);
  const achados: string[] = [];
  const registrar = (no: ts.Node, o_que: string) => {
    const { line } = fonte.getLineAndCharacterOfPosition(no.getStart(fonte));
    achados.push(`${relative(RAIZ, arquivo).replace(/\\/g, '/')}:${line + 1} (${o_que})`);
  };
  const visitar = (no: ts.Node) => {
    if (no.kind === ts.SyntaxKind.AnyKeyword) registrar(no, 'tipo any');
    if (ts.isCallExpression(no) && no.expression.getText(fonte) === `z.${T}`) registrar(no, 'schema que aceita qualquer coisa');
    ts.forEachChild(no, visitar);
  };
  visitar(fonte);
  return achados;
}

describe('Qualidade de código · sem o tipo any', () => {
  const arquivos = PASTAS.flatMap(p => {
    try {
      return arquivosTs(join(RAIZ, p));
    } catch {
      return [];
    }
  });

  it('há código para verificar (a trava não pode passar por estar vazia)', () => {
    expect(arquivos.length).toBeGreaterThan(50);
  });

  it('nenhum arquivo do backend usa o tipo nem o schema que aceita qualquer coisa', () => {
    const usos = arquivos.flatMap(usosDeAny);
    expect(usos).toEqual([]);
  });

  it('a própria verificação reconhece os usos proibidos', () => {
    const exemplo = [
      `const a: ${T} = 1;`,
      `const b = x as ${T};`,
      `type C = Record<string, ${T}>;`,
      `const d: ${T}[] = [];`,
      `const e = z.${T}(); // ${T} em comentário`,
      `const f = "${T} em texto";`,
    ].join('\n');
    const fonte = ts.createSourceFile('exemplo.ts', exemplo, ts.ScriptTarget.Latest, true);
    let tipos = 0;
    let chamadas = 0;
    const visitar = (n: ts.Node) => {
      if (n.kind === ts.SyntaxKind.AnyKeyword) tipos++;
      if (ts.isCallExpression(n) && n.expression.getText(fonte) === `z.${T}`) chamadas++;
      ts.forEachChild(n, visitar);
    };
    visitar(fonte);
    expect({ tipos, chamadas }).toEqual({ tipos: 4, chamadas: 1 }); // comentário e texto não contam
  });
});
