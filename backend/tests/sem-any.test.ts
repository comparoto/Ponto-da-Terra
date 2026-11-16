import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

/**
 * Trava de qualidade: o backend não usa o tipo `any`.
 *
 * O lint da raiz do repositório só olha o frontend (`backend/**` está ignorado lá), então esta
 * verificação garante que o `any` não volte. Ela lê o código com o compilador do TypeScript, por isso
 * não confunde `any` em comentário ou texto com o tipo de verdade. Pega `: any`, `as any`, `any[]`,
 * `Record<string, any>`, `<any>` e o schema `z.any()` (que também aceita qualquer coisa).
 * Os comparadores do Jest, como `expect.any(String)`, não são o tipo `any` e continuam permitidos.
 */

const RAIZ = resolve(__dirname, '..');
const PASTAS = ['src', 'tests', 'scripts', 'prisma', 'api'];

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
    if (ts.isCallExpression(no) && no.expression.getText(fonte) === 'z.any') registrar(no, 'z.any()');
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

  it('nenhum arquivo do backend usa any nem z.any()', () => {
    const usos = arquivos.flatMap(usosDeAny);
    expect(usos).toEqual([]);
  });

  it('a própria verificação reconhece os usos proibidos', () => {
    const fonte = ts.createSourceFile(
      'exemplo.ts',
      'const a: any = 1; const b = x as any; type C = Record<string, any>; const d: any[] = []; const e = z.any(); // any em comentário\nconst f = "any em texto";',
      ts.ScriptTarget.Latest,
      true,
    );
    let tipos = 0;
    let chamadas = 0;
    const visitar = (n: ts.Node) => {
      if (n.kind === ts.SyntaxKind.AnyKeyword) tipos++;
      if (ts.isCallExpression(n) && n.expression.getText(fonte) === 'z.any') chamadas++;
      ts.forEachChild(n, visitar);
    };
    visitar(fonte);
    expect({ tipos, chamadas }).toEqual({ tipos: 4, chamadas: 1 }); // comentário e texto não contam
  });
});
