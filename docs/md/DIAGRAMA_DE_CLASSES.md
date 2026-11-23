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

## Pessoas e contas

Usuário e os perfis comprador, artesão e administrador, com endereços e recuperação de senha.

```mermaid
classDiagram
  class Usuario {
    +String id
    +String nome
    +String email
    +String senhaHash
    +String? telefone
    +TipoUsuario tipo
    +StatusUsuario status
    +String? motivoSuspensao
    +Int tokenVersion
    +DateTime? termosAceitosEm
    +DateTime dataCadastro
  }
  class Consumidor {
    +String id
    +String usuarioId
    +String? enderecoPadraoId
    +DateTime dataCadastro
  }
  class Administrador {
    +String id
    +String usuarioId
    +String nivelAcesso
  }
  class Artesao {
    +String id
    +String usuarioId
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
    +String id
    +String consumidorId
    +String cep
    +String rua
    +String numero
    +String? complemento
    +String? bairro
    +String cidade
    +String estado
  }
  class TokenRedefinicaoSenha {
    +String id
    +String usuarioId
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
    +String id
    +String nome
  }
  class Produto {
    +String id
    +String artesaoId
    +String? categoriaId
    +String titulo
    +String? descricao
    +String tecnica
    +String poloOrigem
    +Decimal preco
    +String? materiaisUtilizados
    +String? dimensoes
    +Boolean prontaEntrega
    +Int? tempoProducaoDias
    +String[] imagensUrls
    +Float avaliacaoMedia
    +StatusProduto status
    +String? justificativaCuradoria
    +DateTime criadoEm
    +DateTime atualizadoEm
  }
  class Estoque {
    +String id
    +String produtoId
    +Int quantidadeDisponivel
    +Int versao
  }
  class Favorito {
    +String id
    +String consumidorId
    +String produtoId
  }
  class Avaliacao {
    +String id
    +String consumidorId
    +String produtoId
    +Int nota
    +String? comentario
    +DateTime dataAvaliacao
  }
  class MensagemContato {
    +String id
    +String consumidorId
    +String artesaoId
    +String produtoId
    +String mensagem
    +DateTime dataEnvio
  }
  class ChecklistFormalizacao {
    +String id
    +String artesaoId
    +Json itensConcluidos
    +Int percentualConclusao
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
    +String id
    +String consumidorId
    +DateTime atualizadoEm
  }
  class ItemCarrinho {
    +String id
    +String carrinhoId
    +String produtoId
    +Int quantidade
    +Int posicao
  }
  class Compra {
    +String id
    +String codigo
    +String consumidorId
    +String enderecoId
    +Decimal valorProdutos
    +Decimal valorFrete
    +Decimal valorTotal
    +StatusCompra status
    +DateTime reservaExpiraEm
    +DateTime criadoEm
  }
  class Pedido {
    +String id
    +String compraId
    +String consumidorId
    +String artesaoId
    +DateTime dataPedido
    +Decimal valorProdutos
    +Decimal valorFrete
    +Decimal valorTotal
    +StatusPedido status
  }
  class ItemPedido {
    +String id
    +String pedidoId
    +String produtoId
    +String artesaoId
    +String tituloProduto
    +Int quantidade
    +Decimal precoUnitario
  }
  class Pagamento {
    +String id
    +String compraId
    +MetodoPagamento metodo
    +StatusPagamento status
    +Int parcelas
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
    +String id
    +String pedidoId
    +String enderecoId
    +String? codigoRastreio
    +String? transportadora
    +DateTime? dataPostagem
    +DateTime? dataPrevista
  }
  class HistoricoStatusPedido {
    +String id
    +String pedidoId
    +StatusPedido status
    +DateTime criadoEm
    +String? autorId
  }
  class IntervencaoPedido {
    +String id
    +String pedidoId
    +String adminId
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
    +String id
    +TipoEvento tipo
    +Json payload
    +DateTime criadoEm
    +DateTime? publicadoEm
  }
  class NotificacaoLog {
    +String id
    +String? eventoId
    +String? artesaoId
    +String? usuarioId
    +String? pedidoId
    +TipoEvento tipoEvento
    +Json? payload
    +Boolean enviadoComSucesso
    +Int tentativas
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
