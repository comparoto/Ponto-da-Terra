
# Análise de Code Smell – Projeto Integrador

**Aluno(a):** Maria Luiza Alves Andrade  
**Módulo analisado:** `backend/src/modules/pedidos/pedidos.service.ts`  
**Método analisado:** `detalhe()`

## 1. Revisão e identificação de Code Smells

Durante a análise do arquivo `pedidos.service.ts`, foi identificado um possível Code Smell no método `detalhe()`, relacionado à complexidade condicional (*Complex Conditional*). O trecho analisado utiliza operadores ternários encadeados para determinar qual tipo de usuário está tentando visualizar um pedido.

A lógica verifica inicialmente se o usuário possui perfil de administrador. Caso contrário, verifica se ele é o comprador ou o artesão relacionado ao pedido. Dependendo dessas condições, é atribuída uma identificação à variável `visao`, que posteriormente é utilizada para determinar se o acesso ao pedido será permitido.

Embora o código esteja funcional, a concentração de diferentes verificações em uma única expressão pode dificultar a leitura, principalmente para desenvolvedores que ainda não conhecem essa parte do sistema. A utilização de operadores ternários encadeados exige que o leitor acompanhe as condições e seus respectivos resultados para compreender completamente a lógica.

Em relação à qualidade do software, o principal impacto identificado está na legibilidade. A estrutura também pode representar uma pequena dificuldade de manutenibilidade caso novas condições de acesso sejam adicionadas futuramente, pois a expressão poderá se tornar mais extensa e difícil de compreender. Entretanto, não foi identificado um problema significativo de acoplamento, já que a lógica não depende de componentes externos adicionais. A coesão do método também não apresenta um comprometimento evidente, pois as verificações realizadas estão relacionadas à própria finalidade de consultar um pedido e controlar sua visualização.

## 2. Análise crítica e decisão de refatoração

Após avaliar o trecho, a decisão foi manter a implementação atual, sem realizar a refatoração. Apesar de a expressão condicional apresentar uma oportunidade de melhoria na legibilidade, isso não significa necessariamente que sua alteração traria benefícios suficientes para justificar uma intervenção no código.

Uma alternativa seria utilizar a técnica *Decompose Conditional* (Decomposição de Condição), juntamente com *Extract Method* (Extração de Método), transferindo as verificações para uma função auxiliar. Dessa forma, a identificação do tipo de usuário ficaria separada do restante do método `detalhe()`, deixando a implementação visualmente mais organizada.

A expressão possui apenas três possibilidades de identificação do usuário (administrador, comprador e artesão), com condições diretamente relacionadas à autorização do pedido. Apesar de poder ser reorganizada para melhorar a legibilidade, sua extração criaria uma função auxiliar para uma lógica relativamente pequena, sem trazer benefícios suficientes para justificar a alteração. Por isso, optou-se por manter a implementação atual, podendo reavaliar essa decisão caso as regras de acesso se tornem mais complexas futuramente.

## 3. Registro das intervenções e validação

Como a decisão foi não refatorar, nenhuma alteração será realizada no método `detalhe()` ou nas regras de autorização existentes. A intervenção será registrada neste documento.Não existe uma nova implementação que exija testes de regressão. Ainda assim, a execução dos testes existentes do módulo de pedidos pode ser utilizada como uma verificação complementar do funcionamento atual, caso estejam disponíveis no projeto.

A principal limitação da implementação está na possibilidade de a expressão se tornar menos legível caso novas regras de acesso sejam adicionadas. Portanto, essa estrutura deve ser observada em futuras manutenções, especialmente se houver aumento no número de condições ou se a lógica passar a exigir verificações mais complexas.

Conclui-se que o trecho analisado apresenta uma oportunidade de melhoria relacionada à legibilidade, mas não demonstra, no contexto atual, um problema que justifique a refatoração. A decisão de manter o código considera a simplicidade das condições existentes, a ausência de impactos significativos no funcionamento e o risco de acrescentar complexidade estrutural sem um benefício proporcional. Dessa forma, a análise prioriza a necessidade real de melhoria, em vez de modificar o código apenas para eliminar um possível Code Smell.
