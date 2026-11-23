# Desafio: revisão de código, code smells e refatoração

**Parte analisada:** moderação de contas pelo administrador (HU16: suspender, inativar e reativar), em `backend/src/modules/admin/`.
**Decisão:** refatorar.
**Técnicas:** *Extract Function* (com parametrização), *Move Function* para uma camada de serviço e substituição de mensagens duplicadas por uma tabela.
**Validação:** 10 testes de caracterização escritos antes da mudança, mais os 123 testes que já existiam. Os 133 passam, e o Swagger ficou idêntico.

Para ver o código de antes: `git show 4dc33a5:backend/src/modules/admin/usuarios.routes.ts`.

---

## 1. Code smells identificados

Revisei o arquivo `usuarios.routes.ts` (264 linhas, antes da mudança).

### 1.1 Código duplicado (*Duplicated Code*): principal

| Trecho | Onde (antes) | O que faz |
|---|---|---|
| `suspender` | linhas 77–92 | busca a conta, valida, atualiza o status, derruba as sessões, limpa o cache, responde |
| `inativar` | linhas 144–157 | **os mesmos 7 passos**, mudando só o status e o texto das mensagens |

Os dois blocos têm a mesma sequência, e só 3 coisas variam: o status gravado, o texto das mensagens de erro e se o motivo é obrigatório. A `inativar` foi acrescentada depois (HU16) copiando a `suspender`, que é a origem clássica desse smell.

**Impactos:**
- **Manutenibilidade:** uma regra nova, como "bloquear também contas com pedido em andamento", precisa ser lembrada nos dois lugares. Esquecer um deixa as duas ações com regras diferentes sem ninguém perceber.
- **Legibilidade:** quem lê precisa comparar 14 linhas com 16 para descobrir que são "a mesma coisa", e achar onde diferem.
- **Extensibilidade:** um terceiro estado de bloqueio exigiria um terceiro bloco copiado.

### 1.2 Lógica de negócio dentro da rota (*Fat Controller* / falta de camada de serviço)

Os handlers acessavam o banco (`prisma.usuario.findUnique/update`), aplicavam as regras (administrador não pode ser moderado, conta já suspensa...) e montavam a resposta. As outras áreas do projeto (`auth`, `pedidos`, `compras`, `carrinho`) usam o padrão rota → serviço, que é o que o nosso documento de requisitos descreve.

**Impactos:**
- **Coesão e acoplamento:** a rota mistura 3 responsabilidades (validar a entrada HTTP, aplicar a regra, falar com o banco), e a regra fica presa ao Express, então só dá para testar passando por HTTP.
- **Extensibilidade:** reaproveitar a regra em outro lugar (um script de administração, por exemplo) obrigaria a duplicá-la mais uma vez.

### 1.3 Outros smells vistos e **não tratados** (ver seção 3)

- *Divergent Change:* o arquivo `usuarios.routes.ts` reúne 3 assuntos (usuários, dashboard, aprovação de cadastros).
- A função `decidirCadastro` tem o mesmo problema de 1.2.
- `z.any()` nas respostas documentadas no Swagger (tipagem fraca).

---

## 2. Análise e decisão

**A refatoração era necessária?** Sim, por três motivos:
1. O smell 1.1 é duplicação *real*, que já aconteceu uma vez por copiar e colar e tem custo de manutenção concreto.
2. A regra de moderação é crítica: ela derruba sessões e oculta peças da vitrine. Uma divergência silenciosa entre suspender e inativar seria um problema de segurança, não só de estilo.
3. O custo é baixo: são 4 rotas, o comportamento é bem delimitado e a API não muda.

**Por que não foi arriscado:** antes de mexer, escrevi 10 testes de caracterização (`backend/tests/moderacao-contas.test.ts`) que fixam o comportamento atual: status HTTP, mensagens de erro, campos gravados, efeito no `tokenVersion` e o formato da resposta. Rodei **no código antigo** e os 10 passaram. Só depois refatorei. A suíte existente cobria o caminho feliz, mas não vários ramos (conta já suspensa, administrador na `inativar`, conta inexistente, transição suspensa → inativa).

### Técnicas aplicadas

1. **Extract Function + Parameterize Function:** os 7 passos repetidos viraram `restringirConta(id, novoStatus, motivo)`. O que variava virou parâmetro.
2. **Replace Magic Strings with Table:** as mensagens que variavam ("suspensas/inativadas", "suspensa/inativa") ficaram numa tabela `TEXTO` indexada pelo status.
3. **Move Function / Service Layer:** a regra de negócio saiu da rota para `usuarios.service.ts`. As rotas ficaram só com validação (Zod) e resposta.

---

## 3. O que foi mantido de propósito (decisão de não refatorar)

| Smell | Decisão | Justificativa |
|---|---|---|
| `decidirCadastro` na rota (HU8) | **Manter por ora** | É o mesmo smell, mas de outro assunto (curadoria). Misturar as duas mudanças num commit só tornaria a revisão difícil e o risco maior. Já está isolada numa função, o que reduz o dano. Fica como próximo passo. |
| Arquivo com 3 assuntos (*Divergent Change*) | **Manter** | Separar exige renomear o roteador exportado (`adminExtrasRoutes`), que é montado em `app.ts` e aparece nas etiquetas do Swagger. É uma mudança de estrutura, sem ganho imediato, e fugiria do escopo de "preservar comportamento". |
| `documentar({...})` repetido em cada rota | **Manter** | É documentação declarativa. Abstrair esconderia o contrato de cada rota, e a clareza vale mais que as linhas economizadas. |
| `z.any()` nas respostas do Swagger | **Manter** | Tipar as respostas muda o contrato publicado da API. Seria uma melhoria separada, com seu próprio teste. |

Também **não unifiquei `reativar`** com as outras duas: ela tem regras diferentes (não verifica administrador, não incrementa `tokenVersion`, limpa o motivo). Forçar tudo numa função só criaria vários `if` e pioraria a legibilidade. A abstração só se justifica onde havia duplicação de verdade.

---

## 4. Antes e depois

### Antes: dois handlers quase idênticos dentro da rota

```ts
// suspender (16 linhas)
adminExtrasRoutes.post('/admin/usuarios/:id/suspender', ...somente(ADMIN), validate({...}), async (req, res) => {
  const { id } = req.valid!.params;
  const alvo = await prisma.usuario.findUnique({ where: { id }, select: { tipo: true, status: true } });
  if (!alvo) throw notFound('Usuário não encontrado');
  if (alvo.tipo === TipoUsuario.ADMIN) throw forbidden('Contas de administrador não podem ser suspensas por aqui');
  if (alvo.status === StatusUsuario.SUSPENSO) throw badRequest('A conta já está suspensa');
  const usuario = await prisma.usuario.update({
    where: { id },
    data: { status: StatusUsuario.SUSPENSO, motivoSuspensao: req.valid!.body.motivo, tokenVersion: { increment: 1 } },
    include: incluirUsuario,
  });
  await invalidarCatalogo();
  res.json(ok(usuarioResposta(usuario)));
});

// inativar (14 linhas): o MESMO corpo, trocando SUSPENSO por INATIVO, "suspensas" por "inativadas"...
```

### Depois: uma regra única no serviço e rotas de 3 linhas

```ts
// usuarios.service.ts
const TEXTO: Record<Restricao, { plural: string; singular: string }> = {
  SUSPENSO: { plural: 'suspensas', singular: 'suspensa' },
  INATIVO: { plural: 'inativadas', singular: 'inativa' },
};

async function restringirConta(id: string, novoStatus: Restricao, motivo: string | null) {
  const texto = TEXTO[novoStatus];
  const alvo = await prisma.usuario.findUnique({ where: { id }, select: { tipo: true, status: true } });
  if (!alvo) throw notFound('Usuário não encontrado');
  if (alvo.tipo === TipoUsuario.ADMIN) throw forbidden(`Contas de administrador não podem ser ${texto.plural} por aqui`);
  if (alvo.status === novoStatus) throw badRequest(`A conta já está ${texto.singular}`);
  const usuario = await prisma.usuario.update({
    where: { id },
    data: { status: novoStatus, motivoSuspensao: motivo, tokenVersion: { increment: 1 } },
    include: incluirUsuario,
  });
  await invalidarCatalogo();
  return usuarioResposta(usuario);
}

export const usuariosAdminService = {
  suspender: (id: string, motivo: string) => restringirConta(id, StatusUsuario.SUSPENSO, motivo),
  inativar: (id: string, motivo?: string) => restringirConta(id, StatusUsuario.INATIVO, motivo || null),
  // listar, reativar...
};

// usuarios.routes.ts
adminExtrasRoutes.post('/admin/usuarios/:id/suspender', ...somente(ADMIN), validate({ params: idParam, body: suspenderBody }), async (req, res) => {
  res.json(ok(await usuariosAdminService.suspender(req.valid!.params.id, req.valid!.body.motivo)));
});
```

### Métricas

| | Antes | Depois |
|---|---|---|
| Linhas de `usuarios.routes.ts` | 264 | 212 |
| Handler de suspender / inativar / reativar | 16 / 14 / 9 linhas | 3 / 3 / 3 linhas |
| Blocos duplicados de "restringir conta" | 2 | 1 |
| Onde mora a regra de negócio | dentro das rotas | `usuarios.service.ts` (88 linhas) |
| Testes de API | 123 | **133** (10 de caracterização) |
| Rotas e contrato no Swagger | 60 rotas | **idênticos** (60 rotas, mesmas 4 rotas de usuários) |

---

## 5. Resultados, benefícios, riscos e limitações

**Benefícios**
- Mudar a regra de bloqueio passa a ser **uma edição em um lugar**, e as duas ações não divergem mais por esquecimento.
- Um novo estado de bloqueio (por exemplo, "banida") vira uma linha na tabela `TEXTO` mais uma linha em `usuariosAdminService`.
- A regra pode ser testada e reutilizada sem passar por HTTP.
- As rotas ficaram legíveis: dá para ver de relance o que cada uma faz.

**Riscos e limitações**
- **Mensagens montadas por template:** buscar no código o texto exato "Contas de administrador não podem ser suspensas" deixa de achar a linha. Mitigação: os testes de caracterização conferem cada mensagem literalmente, então qualquer mudança acidental quebra o teste.
- **Abstração compartilhada:** se no futuro suspender e inativar divergirem de verdade (por exemplo, suspender notificar a pessoa e inativar checar pedidos em aberto), `restringirConta` precisará de ramificações. Nesse ponto o caminho é trocar o parâmetro por uma estratégia por tipo de restrição. Hoje, com 6 de 7 passos iguais, a abstração compensa.
- **Comportamentos questionáveis preservados de propósito.** A refatoração não pode mudar o comportamento, então os testes registram, sem corrigir:
  - `reativar` não incrementa o `tokenVersion`;
  - é permitido passar de suspensa direto para inativa (e vice-versa);
  - o erro de `reativar` num administrador diz "já está ativa".
  
  São candidatos a uma decisão separada da equipe.

---

## 6. Declaração de uso de IA

Esta intervenção foi feita com o apoio do **Claude Code** (IA da Anthropic), com o uso autorizado pelo professor da disciplina.

| | Quem fez |
|---|---|
| Revisão do código e identificação dos smells | IA, com a revisão do integrante |
| Testes de caracterização, refatoração e este relatório | IA |
| Leitura, entendimento e validação do resultado (rodar os testes, conferir o antes e o depois) | Paulo Marrocos |
| Apresentação e defesa das decisões | Paulo Marrocos |

A co-autoria também está declarada no commit `1668508`, na linha `Co-Authored-By` ao final da mensagem.

---

## 7. Roteiro para a apresentação (3 a 5 minutos)

1. **Smell:** abrir `git show 4dc33a5:backend/src/modules/admin/usuarios.routes.ts` e mostrar `suspender` (linhas 77–92) ao lado de `inativar` (144–157). Mostrar que só mudam o status e as mensagens.
2. **Impacto:** o exemplo do "bloquear também contas com pedido em andamento": hoje teria que ser feito em dois lugares.
3. **Decisão:** refatorar, e explicar por que o risco é baixo (testes de caracterização escritos antes).
4. **Antes e depois:** mostrar o código da seção 4 e a tabela de métricas.
5. **Validação:** rodar `cd backend && npx jest --runInBand tests/moderacao-contas.test.ts` e depois `npm test` (133 testes passando).
6. **Limites:** o que ficou de fora (seção 3) e os riscos (seção 5).
