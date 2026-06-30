# language: pt

Funcionalidade: Processamento de pedidos no checkout
  Como cliente da plataforma EntregasJá
  Quero finalizar um pedido pelo checkout
  Para que meu pagamento seja processado de forma segura e controlada

  Contexto:
    Dado que o microsserviço de checkout está disponível
    E que existe um pedido com e-mail, valor e cartão válidos

  Cenário: Processar pedido com pagamento aprovado
    Dado que o gateway de pagamento está funcionando normalmente
    E que o gateway retorna o status "APROVADO"
    Quando o pedido for processado pelo checkout
    Então o status final do pedido deve ser "PROCESSADO"
    E o pedido deve ser salvo no repositório
    E o e-mail de confirmação deve ser enviado ao cliente
    E a resposta HTTP deve ser 200

  Cenário: Recusar pedido quando o cartão for recusado
    Dado que o gateway de pagamento está funcionando normalmente
    E que o gateway retorna o status "RECUSADO"
    Quando o pedido for processado pelo checkout
    Então o status final do pedido deve ser "FALHOU"
    E o pedido deve ser salvo no repositório
    E o e-mail de confirmação não deve ser enviado ao cliente
    E a resposta HTTP deve indicar falha no processamento

  Cenário: Recuperar o checkout após falha temporária no gateway
    Dado que o gateway de pagamento falha na primeira tentativa
    E que o gateway retorna o status "APROVADO" na segunda tentativa
    Quando o pedido for processado pelo checkout
    Então o sistema deve realizar uma nova tentativa de cobrança
    E o status final do pedido deve ser "PROCESSADO"
    E o pedido deve ser salvo no repositório
    E o e-mail de confirmação deve ser enviado ao cliente
    E a resposta HTTP deve ser 200

  Cenário: Marcar pedido com erro quando o gateway estiver indisponível
    Dado que o gateway de pagamento está indisponível
    E que todas as tentativas de cobrança falham
    Quando o pedido for processado pelo checkout
    Então o sistema deve esgotar as tentativas configuradas
    E o status final do pedido deve ser "ERRO_GATEWAY"
    E o pedido deve ser salvo no repositório
    E o e-mail de confirmação não deve ser enviado ao cliente
    E a resposta HTTP deve indicar falha no processamento

  Cenário: Interromper checkout quando o gateway ultrapassar o tempo limite
    Dado que o gateway de pagamento demora mais que o tempo limite permitido
    Quando o pedido for processado pelo checkout
    Então o sistema deve encerrar a tentativa por timeout
    E o status final do pedido deve ser "ERRO_GATEWAY"
    E o pedido deve ser salvo no repositório
    E o e-mail de confirmação não deve ser enviado ao cliente
    E a resposta HTTP deve indicar falha no processamento

  Cenário: Rejeitar checkout com dados incompletos
    Dado que o cliente envia um pedido sem todos os dados obrigatórios
    Quando a requisição chegar ao endpoint de checkout
    Então o sistema deve retornar erro de validação
    E a resposta HTTP deve ser 400
    E o gateway de pagamento não deve ser chamado
    E o pedido não deve ser salvo no repositório
    E o e-mail de confirmação não deve ser enviado ao cliente