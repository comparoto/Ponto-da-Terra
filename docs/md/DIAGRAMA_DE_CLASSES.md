# Diagrama de classes do modelo de dados

> **Arquivo gerado automaticamente** a partir de `backend/prisma/schema.prisma` (`cd backend && npm run docs:diagrama`). Não edite à mão: mude o schema e gere de novo.

Este diagrama mostra o modelo de dados **como está implementado** (24 classes e 9 enumerações). Ele atualiza o diagrama de classes da 1ª unidade com os ajustes que a implementação exigiu: a tabela "Ajustes em relação ao diagrama da 1ª unidade", mais abaixo, vem dos comentários `AJUSTE` do próprio schema e se liga aos conflitos C2, C3, C8 e C9 do [documento de requisitos](REQUISITOS_BACKEND.md) (seção 5).

**Como ler:** `*` = muitos, `1` = exatamente um, `0..1` = opcional. A seta sai da classe que guarda a chave estrangeira. O rótulo é o nome do campo de relação.

## Visão geral

```mermaid
classDiagram
  direction LR
  class Usuario
  class TokenRedefinicaoSenha
  class Consumidor
  class Administrador
  class Artesao
  class Endereco
  class CategoriaProduto
  class Produto
  class Estoque
  class Carrinho
  class ItemCarrinho
  class Compra
  class Pedido
  class ItemPedido
  class HistoricoStatusPedido
  class IntervencaoPedido
  class Pagamento
  class Entrega
  class Avaliacao
  class Favorito
  class MensagemContato
  class NotificacaoLog
  class ChecklistFormalizacao
  class EventoOutbox
  TokenRedefinicaoSenha "*" --> "1" Usuario : usuario
  Consumidor "0..1" --> "1" Usuario : usuario
  Administrador "0..1" --> "1" Usuario : usuario
  Artesao "0..1" --> "1" Usuario : usuario
  Endereco "*" --> "1" Consumidor : consumidor
  Produto "*" --> "1" Artesao : artesao
  Produto "*" --> "0..1" CategoriaProduto : categoria
  Estoque "0..1" --> "1" Produto : produto
  Carrinho "0..1" --> "1" Consumidor : consumidor
  ItemCarrinho "*" --> "1" Carrinho : carrinho
  ItemCarrinho "*" --> "1" Produto : produto
  Compra "*" --> "1" Consumidor : consumidor
  Compra "*" --> "1" Endereco : endereco
  Pedido "*" --> "1" Compra : compra
  Pedido "*" --> "1" Consumidor : consumidor
  Pedido "*" --> "1" Artesao : artesao
  ItemPedido "*" --> "1" Pedido : pedido
  ItemPedido "*" --> "1" Produto : produto
  ItemPedido "*" --> "1" Artesao : artesao
  HistoricoStatusPedido "*" --> "1" Pedido : pedido
  IntervencaoPedido "*" --> "1" Pedido : pedido
  Pagamento "0..1" --> "1" Compra : compra
  Entrega "0..1" --> "1" Pedido : pedido
  Entrega "*" --> "1" Endereco : endereco
  Avaliacao "*" --> "1" Consumidor : consumidor
  Avaliacao "*" --> "1" Produto : produto
  Favorito "*" --> "1" Consumidor : consumidor
  Favorito "*" --> "1" Produto : produto
  MensagemContato "*" --> "1" Consumidor : consumidor
  MensagemContato "*" --> "1" Artesao : artesao
  MensagemContato "*" --> "1" Produto : produto
  NotificacaoLog "*" --> "0..1" Artesao : artesao
  NotificacaoLog "*" --> "0..1" Pedido : pedido
  ChecklistFormalizacao "0..1" --> "1" Artesao : artesao
```

## Diagrama completo

Todas as classes com seus atributos e todas as relações (sem rótulos nas setas, para o desenho ficar limpo; o campo de ligação aparece nos atributos, como `pedidoId`). A imagem desta versão, para colar em documentos, é gerada por `node e2e/gerar-imagens-diagrama.cjs` (arquivos em [`docs/diagramas/`](../diagramas)).

```mermaid
classDiagram
  class Usuario {
    +UUID id
    +String nome
    +String email
    +String senhaHash
    +String? telefone
    +TipoUsuario tipo
    +StatusUsuario status
    +String? motivoSuspensao
    +Integer tokenVersion
    +DateTime? termosAceitosEm
    +DateTime dataCadastro
  }
  class TokenRedefinicaoSenha {
    +UUID id
    +UUID usuarioId
    +String tokenHash
    +DateTime expiraEm
    +DateTime? usadoEm
    +DateTime criadoEm
  }
  class Consumidor {
    +UUID id
    +UUID usuarioId
    +UUID? enderecoPadraoId
    +DateTime dataCadastro
  }
  class Administrador {
    +UUID id
    +UUID usuarioId
    +String nivelAcesso
  }
  class Artesao {
    +UUID id
    +UUID usuarioId
    +String? nomeAtelie
    +String? biografia
    +String[] tecnicasPrincipais
    +String? especialidade
    +String? poloRegional
    +String cidade
    +String estado
    +String? cepOrigem
    +String? fotoPerfilUrl
    +String? fotoAtelieUrl
    +Boolean aceitaEncomenda
    +Float avaliacaoMedia
    +StatusCadastroArtesao statusCadastro
    +String? motivoCadastro
    +DateTime dataCadastro
  }
  class Endereco {
    +UUID id
    +UUID consumidorId
    +String cep
    +String rua
    +String numero
    +String? complemento
    +String? bairro
    +String cidade
    +String estado
  }
  class CategoriaProduto {
    +UUID id
    +String nome
  }
  class Produto {
    +UUID id
    +UUID artesaoId
    +UUID? categoriaId
    +String titulo
    +String? descricao
    +String tecnica
    +String poloOrigem
    +Decimal preco
    +String? materiaisUtilizados
    +String? dimensoes
    +Boolean prontaEntrega
    +Integer? tempoProducaoDias
    +String[] imagensUrls
    +Float avaliacaoMedia
    +StatusProduto status
    +String? justificativaCuradoria
    +DateTime criadoEm
    +DateTime atualizadoEm
  }
  class Estoque {
    +UUID id
    +UUID produtoId
    +Integer quantidadeDisponivel
    +Integer versao
  }
  class Carrinho {
    +UUID id
    +UUID consumidorId
    +DateTime atualizadoEm
  }
  class ItemCarrinho {
    +UUID id
    +UUID carrinhoId
    +UUID produtoId
    +Integer quantidade
    +Integer posicao
  }
  class Compra {
    +UUID id
    +String codigo
    +UUID consumidorId
    +UUID enderecoId
    +Decimal valorProdutos
    +Decimal valorFrete
    +Decimal valorTotal
    +StatusCompra status
    +DateTime reservaExpiraEm
    +DateTime criadoEm
  }
  class Pedido {
    +UUID id
    +UUID compraId
    +UUID consumidorId
    +UUID artesaoId
    +DateTime dataPedido
    +Decimal valorProdutos
    +Decimal valorFrete
    +Decimal valorTotal
    +StatusPedido status
  }
  class ItemPedido {
    +UUID id
    +UUID pedidoId
    +UUID produtoId
    +UUID artesaoId
    +String tituloProduto
    +Integer quantidade
    +Decimal precoUnitario
  }
  class HistoricoStatusPedido {
    +UUID id
    +UUID pedidoId
    +StatusPedido status
    +DateTime criadoEm
    +UUID? autorId
  }
  class IntervencaoPedido {
    +UUID id
    +UUID pedidoId
    +UUID adminId
    +String nota
    +DateTime criadoEm
  }
  class Pagamento {
    +UUID id
    +UUID compraId
    +MetodoPagamento metodo
    +StatusPagamento status
    +Integer parcelas
    +String codigoTransacao
    +String? pixCopiaECola
    +String? pixQrCode
    +String? linhaDigitavel
    +String? cartaoFinal
    +String? motivoRecusa
    +DateTime? expiraEm
    +DateTime criadoEm
    +DateTime? dataProcessamento
  }
  class Entrega {
    +UUID id
    +UUID pedidoId
    +UUID enderecoId
    +String? codigoRastreio
    +String? transportadora
    +DateTime? dataPostagem
    +DateTime? dataPrevista
  }
  class Avaliacao {
    +UUID id
    +UUID consumidorId
    +UUID produtoId
    +Integer nota
    +String? comentario
    +DateTime dataAvaliacao
  }
  class Favorito {
    +UUID id
    +UUID consumidorId
    +UUID produtoId
  }
  class MensagemContato {
    +UUID id
    +UUID consumidorId
    +UUID artesaoId
    +UUID produtoId
    +String mensagem
    +DateTime dataEnvio
  }
  class NotificacaoLog {
    +UUID id
    +UUID? eventoId
    +UUID? artesaoId
    +UUID? usuarioId
    +UUID? pedidoId
    +TipoEvento tipoEvento
    +Json? payload
    +Boolean enviadoComSucesso
    +Integer tentativas
    +Boolean lida
    +DateTime dataEnvio
  }
  class ChecklistFormalizacao {
    +UUID id
    +UUID artesaoId
    +Json itensConcluidos
    +Integer percentualConclusao
    +DateTime atualizadoEm
  }
  class EventoOutbox {
    +UUID id
    +TipoEvento tipo
    +Json payload
    +DateTime criadoEm
    +DateTime? publicadoEm
  }
  TokenRedefinicaoSenha "*" --> "1" Usuario
  Consumidor "0..1" --> "1" Usuario
  Administrador "0..1" --> "1" Usuario
  Artesao "0..1" --> "1" Usuario
  Endereco "*" --> "1" Consumidor
  Produto "*" --> "1" Artesao
  Produto "*" --> "0..1" CategoriaProduto
  Estoque "0..1" --> "1" Produto
  Carrinho "0..1" --> "1" Consumidor
  ItemCarrinho "*" --> "1" Carrinho
  ItemCarrinho "*" --> "1" Produto
  Compra "*" --> "1" Consumidor
  Compra "*" --> "1" Endereco
  Pedido "*" --> "1" Compra
  Pedido "*" --> "1" Consumidor
  Pedido "*" --> "1" Artesao
  ItemPedido "*" --> "1" Pedido
  ItemPedido "*" --> "1" Produto
  ItemPedido "*" --> "1" Artesao
  HistoricoStatusPedido "*" --> "1" Pedido
  IntervencaoPedido "*" --> "1" Pedido
  Pagamento "0..1" --> "1" Compra
  Entrega "0..1" --> "1" Pedido
  Entrega "*" --> "1" Endereco
  Avaliacao "*" --> "1" Consumidor
  Avaliacao "*" --> "1" Produto
  Favorito "*" --> "1" Consumidor
  Favorito "*" --> "1" Produto
  MensagemContato "*" --> "1" Consumidor
  MensagemContato "*" --> "1" Artesao
  MensagemContato "*" --> "1" Produto
  NotificacaoLog "*" --> "0..1" Artesao
  NotificacaoLog "*" --> "0..1" Pedido
  ChecklistFormalizacao "0..1" --> "1" Artesao
```

## Pessoas e contas

Usuário e os perfis comprador, artesão e administrador, com endereços e recuperação de senha.

```mermaid
classDiagram
  class Usuario {
    +UUID id
    +String nome
    +String email
    +String senhaHash
    +String? telefone
    +TipoUsuario tipo
    +StatusUsuario status
    +String? motivoSuspensao
    +Integer tokenVersion
    +DateTime? termosAceitosEm
    +DateTime dataCadastro
  }
  class Consumidor {
    +UUID id
    +UUID usuarioId
    +UUID? enderecoPadraoId
    +DateTime dataCadastro
  }
  class Administrador {
    +UUID id
    +UUID usuarioId
    +String nivelAcesso
  }
  class Artesao {
    +UUID id
    +UUID usuarioId
    +String? nomeAtelie
    +String? biografia
    +String[] tecnicasPrincipais
    +String? especialidade
    +String? poloRegional
    +String cidade
    +String estado
    +String? cepOrigem
    +String? fotoPerfilUrl
    +String? fotoAtelieUrl
    +Boolean aceitaEncomenda
    +Float avaliacaoMedia
    +StatusCadastroArtesao statusCadastro
    +String? motivoCadastro
    +DateTime dataCadastro
  }
  class Endereco {
    +UUID id
    +UUID consumidorId
    +String cep
    +String rua
    +String numero
    +String? complemento
    +String? bairro
    +String cidade
    +String estado
  }
  class TokenRedefinicaoSenha {
    +UUID id
    +UUID usuarioId
    +String tokenHash
    +DateTime expiraEm
    +DateTime? usadoEm
    +DateTime criadoEm
  }
  class Produto {
    <<outro grupo>>
  }
  class Carrinho {
    <<outro grupo>>
  }
  class Compra {
    <<outro grupo>>
  }
  class Pedido {
    <<outro grupo>>
  }
  class ItemPedido {
    <<outro grupo>>
  }
  class Entrega {
    <<outro grupo>>
  }
  class Avaliacao {
    <<outro grupo>>
  }
  class Favorito {
    <<outro grupo>>
  }
  class MensagemContato {
    <<outro grupo>>
  }
  class NotificacaoLog {
    <<outro grupo>>
  }
  class ChecklistFormalizacao {
    <<outro grupo>>
  }
  TokenRedefinicaoSenha "*" --> "1" Usuario : usuario
  Consumidor "0..1" --> "1" Usuario : usuario
  Administrador "0..1" --> "1" Usuario : usuario
  Artesao "0..1" --> "1" Usuario : usuario
  Endereco "*" --> "1" Consumidor : consumidor
  Produto "*" --> "1" Artesao : artesao
  Carrinho "0..1" --> "1" Consumidor : consumidor
  Compra "*" --> "1" Consumidor : consumidor
  Compra "*" --> "1" Endereco : endereco
  Pedido "*" --> "1" Consumidor : consumidor
  Pedido "*" --> "1" Artesao : artesao
  ItemPedido "*" --> "1" Artesao : artesao
  Entrega "*" --> "1" Endereco : endereco
  Avaliacao "*" --> "1" Consumidor : consumidor
  Favorito "*" --> "1" Consumidor : consumidor
  MensagemContato "*" --> "1" Consumidor : consumidor
  MensagemContato "*" --> "1" Artesao : artesao
  NotificacaoLog "*" --> "0..1" Artesao : artesao
  ChecklistFormalizacao "0..1" --> "1" Artesao : artesao
```

## Catálogo e relacionamento com o comprador

Peças, estoque, categorias, favoritos, avaliações, mensagens ao produtor e checklist de formalização do artesão.

```mermaid
classDiagram
  class CategoriaProduto {
    +UUID id
    +String nome
  }
  class Produto {
    +UUID id
    +UUID artesaoId
    +UUID? categoriaId
    +String titulo
    +String? descricao
    +String tecnica
    +String poloOrigem
    +Decimal preco
    +String? materiaisUtilizados
    +String? dimensoes
    +Boolean prontaEntrega
    +Integer? tempoProducaoDias
    +String[] imagensUrls
    +Float avaliacaoMedia
    +StatusProduto status
    +String? justificativaCuradoria
    +DateTime criadoEm
    +DateTime atualizadoEm
  }
  class Estoque {
    +UUID id
    +UUID produtoId
    +Integer quantidadeDisponivel
    +Integer versao
  }
  class Favorito {
    +UUID id
    +UUID consumidorId
    +UUID produtoId
  }
  class Avaliacao {
    +UUID id
    +UUID consumidorId
    +UUID produtoId
    +Integer nota
    +String? comentario
    +DateTime dataAvaliacao
  }
  class MensagemContato {
    +UUID id
    +UUID consumidorId
    +UUID artesaoId
    +UUID produtoId
    +String mensagem
    +DateTime dataEnvio
  }
  class ChecklistFormalizacao {
    +UUID id
    +UUID artesaoId
    +Json itensConcluidos
    +Integer percentualConclusao
    +DateTime atualizadoEm
  }
  class Artesao {
    <<outro grupo>>
  }
  class ItemCarrinho {
    <<outro grupo>>
  }
  class ItemPedido {
    <<outro grupo>>
  }
  class Consumidor {
    <<outro grupo>>
  }
  Produto "*" --> "1" Artesao : artesao
  Produto "*" --> "0..1" CategoriaProduto : categoria
  Estoque "0..1" --> "1" Produto : produto
  ItemCarrinho "*" --> "1" Produto : produto
  ItemPedido "*" --> "1" Produto : produto
  Avaliacao "*" --> "1" Consumidor : consumidor
  Avaliacao "*" --> "1" Produto : produto
  Favorito "*" --> "1" Consumidor : consumidor
  Favorito "*" --> "1" Produto : produto
  MensagemContato "*" --> "1" Consumidor : consumidor
  MensagemContato "*" --> "1" Artesao : artesao
  MensagemContato "*" --> "1" Produto : produto
  ChecklistFormalizacao "0..1" --> "1" Artesao : artesao
```

## Compra, pagamento e pedidos

Carrinho, a compra (um pagamento) dividida em um pedido por artesão, entrega, histórico e intervenções do admin.

```mermaid
classDiagram
  class Carrinho {
    +UUID id
    +UUID consumidorId
    +DateTime atualizadoEm
  }
  class ItemCarrinho {
    +UUID id
    +UUID carrinhoId
    +UUID produtoId
    +Integer quantidade
    +Integer posicao
  }
  class Compra {
    +UUID id
    +String codigo
    +UUID consumidorId
    +UUID enderecoId
    +Decimal valorProdutos
    +Decimal valorFrete
    +Decimal valorTotal
    +StatusCompra status
    +DateTime reservaExpiraEm
    +DateTime criadoEm
  }
  class Pedido {
    +UUID id
    +UUID compraId
    +UUID consumidorId
    +UUID artesaoId
    +DateTime dataPedido
    +Decimal valorProdutos
    +Decimal valorFrete
    +Decimal valorTotal
    +StatusPedido status
  }
  class ItemPedido {
    +UUID id
    +UUID pedidoId
    +UUID produtoId
    +UUID artesaoId
    +String tituloProduto
    +Integer quantidade
    +Decimal precoUnitario
  }
  class Pagamento {
    +UUID id
    +UUID compraId
    +MetodoPagamento metodo
    +StatusPagamento status
    +Integer parcelas
    +String codigoTransacao
    +String? pixCopiaECola
    +String? pixQrCode
    +String? linhaDigitavel
    +String? cartaoFinal
    +String? motivoRecusa
    +DateTime? expiraEm
    +DateTime criadoEm
    +DateTime? dataProcessamento
  }
  class Entrega {
    +UUID id
    +UUID pedidoId
    +UUID enderecoId
    +String? codigoRastreio
    +String? transportadora
    +DateTime? dataPostagem
    +DateTime? dataPrevista
  }
  class HistoricoStatusPedido {
    +UUID id
    +UUID pedidoId
    +StatusPedido status
    +DateTime criadoEm
    +UUID? autorId
  }
  class IntervencaoPedido {
    +UUID id
    +UUID pedidoId
    +UUID adminId
    +String nota
    +DateTime criadoEm
  }
  class Consumidor {
    <<outro grupo>>
  }
  class Produto {
    <<outro grupo>>
  }
  class Endereco {
    <<outro grupo>>
  }
  class Artesao {
    <<outro grupo>>
  }
  class NotificacaoLog {
    <<outro grupo>>
  }
  Carrinho "0..1" --> "1" Consumidor : consumidor
  ItemCarrinho "*" --> "1" Carrinho : carrinho
  ItemCarrinho "*" --> "1" Produto : produto
  Compra "*" --> "1" Consumidor : consumidor
  Compra "*" --> "1" Endereco : endereco
  Pedido "*" --> "1" Compra : compra
  Pedido "*" --> "1" Consumidor : consumidor
  Pedido "*" --> "1" Artesao : artesao
  ItemPedido "*" --> "1" Pedido : pedido
  ItemPedido "*" --> "1" Produto : produto
  ItemPedido "*" --> "1" Artesao : artesao
  HistoricoStatusPedido "*" --> "1" Pedido : pedido
  IntervencaoPedido "*" --> "1" Pedido : pedido
  Pagamento "0..1" --> "1" Compra : compra
  Entrega "0..1" --> "1" Pedido : pedido
  Entrega "*" --> "1" Endereco : endereco
  NotificacaoLog "*" --> "0..1" Pedido : pedido
```

## Fila de eventos e notificações

Transactional Outbox (eventos gravados junto com a operação) e o registro das notificações.

```mermaid
classDiagram
  class EventoOutbox {
    +UUID id
    +TipoEvento tipo
    +Json payload
    +DateTime criadoEm
    +DateTime? publicadoEm
  }
  class NotificacaoLog {
    +UUID id
    +UUID? eventoId
    +UUID? artesaoId
    +UUID? usuarioId
    +UUID? pedidoId
    +TipoEvento tipoEvento
    +Json? payload
    +Boolean enviadoComSucesso
    +Integer tentativas
    +Boolean lida
    +DateTime dataEnvio
  }
  class Artesao {
    <<outro grupo>>
  }
  class Pedido {
    <<outro grupo>>
  }
  NotificacaoLog "*" --> "0..1" Artesao : artesao
  NotificacaoLog "*" --> "0..1" Pedido : pedido
```

## Enumerações

| Enumeração | Valores |
|---|---|
| `TipoUsuario` | `ADMIN`, `ARTESAO`, `CONSUMIDOR` |
| `StatusUsuario` | `ATIVO`, `INATIVO`, `SUSPENSO` |
| `StatusCadastroArtesao` | `PENDENTE`, `APROVADO`, `REJEITADO` |
| `StatusProduto` | `PENDENTE`, `ATIVO`, `REJEITADO` |
| `StatusPedido` | `CRIADO`, `AGUARDANDO_PAGAMENTO`, `PAGO`, `EM_PRODUCAO`, `DESPACHADO`, `ENTREGUE`, `CANCELADO` |
| `MetodoPagamento` | `PIX`, `CARTAO`, `BOLETO` |
| `StatusCompra` | `AGUARDANDO_PAGAMENTO`, `PAGA`, `CANCELADA` |
| `StatusPagamento` | `PENDENTE`, `APROVADO`, `RECUSADO`, `EXPIRADO` |
| `TipoEvento` | `NOVO_PEDIDO`, `PRODUTO_APROVADO`, `PRODUTO_REJEITADO`, `NOVA_MENSAGEM`, `PEDIDO_ATUALIZADO`, `CADASTRO_APROVADO`, `CADASTRO_REJEITADO`, `IMAGEM_ENVIADA` |

## Ajustes em relação ao diagrama da 1ª unidade

Vêm dos comentários `AJUSTE` do schema. Os códigos C2, C3, C8, C9 e D5 referem-se ao quadro de conflitos e decisões do [documento de requisitos](REQUISITOS_BACKEND.md).

| Onde | Ajuste |
|---|---|
| `Usuario.tokenVersion` | incrementado no logout/suspensão para invalidar tokens emitidos (HU16) |
| `Artesao.especialidade` | usado pelo frontend atual |
| `Artesao.poloRegional` | polo regional de atuação (ex.: "Alto do Moura", "Agreste") — HU7 |
| `Produto.tecnica` | C3: obrigatório (HU1/HU2/TC09) |
| `Produto.poloOrigem` | C3: obrigatório (HU1/HU2/TC09) |
| `Produto.dimensoes` | usado pelo frontend atual |
| `Compra` | C9/D5: o checkout gera uma Compra (um pagamento) dividida em um Pedido por artesão. |
| `Pedido.compraId` | C9: compra (checkout) a que este pedido pertence |
| `Pedido.artesaoId` | C9 |
| `HistoricoStatusPedido` | linha do tempo do pedido (HU6) |
| `IntervencaoPedido` | substitui Pedido.notasIntervencaoAdmin (HU10) |
| `Pagamento.compraId` | o pagamento é da compra (não de cada pedido) |
| `NotificacaoLog.eventoId` | evento da outbox que originou a notificação (garante processamento único pelo worker) |
| `NotificacaoLog.usuarioId` | destinatário genérico (ex.: consumidor) |
| `EventoOutbox` | Transactional Outbox — o evento é gravado na mesma transação da operação |
| `enum StatusUsuario` | C8: + INATIVO (HU16) |
| `enum StatusPedido` | C2: + CANCELADO (TC16) |
| `enum StatusCompra` | status da compra (checkout) — agrupa os pedidos de vários artesãos com um único pagamento |
| `enum StatusPagamento` | + EXPIRADO (TC16) |

## Descrição das classes (do schema)

| Classe | Descrição |
|---|---|
| `TokenRedefinicaoSenha` | Link de "esqueci minha senha": guarda só o hash do token (o token em si vai apenas no e-mail) |
| `Compra` | AJUSTE C9/D5: o checkout gera uma Compra (um pagamento) dividida em um Pedido por artesão. |
| `HistoricoStatusPedido` | AJUSTE: linha do tempo do pedido (HU6) |
| `IntervencaoPedido` | AJUSTE: substitui Pedido.notasIntervencaoAdmin (HU10) |
| `Pagamento` | Pagamento SIMULADO (Notion: sem integração com gateways reais). Um por compra. |
| `EventoOutbox` | AJUSTE: Transactional Outbox — o evento é gravado na mesma transação da operação de negócio e publicado na fila por um relay (garante "sem perda de mensagens"). |

## Pendência

O diagrama de classes **original** (1ª unidade, no Drive) e o plano de testes (casos TC09 e TC02) são documentos externos e ainda não foram editados. Este arquivo é a versão atualizada do modelo; a decisão D9 do documento de requisitos fica resolvida para o diagrama de classes e continua aberta apenas para os casos de teste do plano.
