# Testes Solengage - Especificação BDD

Este documento descreve todos os cenários de teste para o programa Solengage seguindo o padrão BDD (Behavior-Driven Development).

## Visão Geral

O Solengage é um programa Solana que gerencia campanhas de marketing de influenciadores com pagamentos progressivos baseados em métricas de engajamento.

## Cenários de Teste

### Feature: Criação de Campanhas

#### 1. Cenário: Criação bem-sucedida de campanha

```
Given um influenciador autenticado  
And uma marca válida  
And um oracle autorizado  
And parâmetros válidos da campanha (nome, hashtag, métricas alvo, valor, prazo)  
When o influenciador cria uma nova campanha  
Then a campanha deve ser criada com status "Draft"  
And todos os campos devem ser preenchidos corretamente  
And as métricas atuais devem ser zeradas  
And o valor pago deve ser zero  
And todos os marcos de pagamento devem estar como false
```

#### 2. Cenário: Falha na criação - nome muito longo

```
Given um influenciador autenticado  
When o influenciador tenta criar uma campanha com nome maior que 50 caracteres  
Then a transação deve falhar  
And deve retornar erro "Campaign name is too long"
```

#### 3. Cenário: Falha na criação - nome da marca muito longo

```
Given um influenciador autenticado  
When o influenciador tenta criar uma campanha com nome da marca maior que 50 caracteres  
Then a transação deve falhar  
And deve retornar erro "Brand name is too long"
```

#### 4. Cenário: Falha na criação - hashtag muito longa

```
Given um influenciador autenticado  
When o influenciador tenta criar uma campanha com hashtag maior que 50 caracteres  
Then a transação deve falhar  
And deve retornar erro "Hashtag is too long"
```

#### 5. Cenário: Falha na criação - prazo no passado

```
Given um influenciador autenticado  
When o influenciador tenta criar uma campanha com prazo no passado  
Then a transação deve falhar  
And deve retornar erro "Deadline must be in the future"
```

#### 6. Cenário: Falha na criação - valor inválido

```
Given um influenciador autenticado  
When o influenciador tenta criar uma campanha com valor zero ou negativo  
Then a transação deve falhar  
And deve retornar erro "Amount must be greater than 0"
```

#### 7. Cenário: Falha na criação - sem métricas alvo

```
Given um influenciador autenticado  
When o influenciador tenta criar uma campanha sem definir nenhuma métrica alvo  
Then a transação deve falhar  
And deve retornar erro "At least one target metric must be set"
```

### Feature: Pagamento da Marca

#### 8. Cenário: Pagamento bem-sucedido da campanha

```
Given uma campanha existente em status "Draft"  
And a marca tem saldo suficiente de USDC  
When a marca paga a campanha  
Then o status da campanha deve mudar para "Active"  
And o valor total deve ser transferido para a conta da campanha  
And o saldo da marca deve diminuir pelo valor da campanha
```

#### 9. Cenário: Falha no pagamento - campanha não está em Draft

```
Given uma campanha existente em status "Active"  
When a marca tenta pagar novamente  
Then a transação deve falhar  
And deve retornar erro "Campaign is not in draft status"
```

#### 10. Cenário: Falha no pagamento - marca não autorizada

```
Given uma campanha existente em status "Draft"  
And um usuário que não é a marca da campanha  
When o usuário tenta pagar a campanha  
Then a transação deve falhar  
And deve retornar erro de autorização
```

#### 11. Cenário: Falha no pagamento - saldo insuficiente

```
Given uma campanha existente em status "Draft"  
And a marca não tem saldo suficiente de USDC  
When a marca tenta pagar a campanha  
Then a transação deve falhar  
And deve retornar erro de saldo insuficiente
```

### Feature: Atualização de Métricas e Pagamentos Progressivos

#### 12. Cenário: Atualização de métricas com pagamento de 10%

```
Given uma campanha ativa  
And métricas atuais zeradas  
When o oracle atualiza as métricas para 10% do alvo  
Then as métricas da campanha devem ser atualizadas  
And o marco de 10% deve ser marcado como true  
And 10% do valor deve ser pago ao influenciador  
And o valor pago total deve ser 10% do valor da campanha
```

#### 13. Cenário: Atualização de métricas com múltiplos pagamentos (50%)

```
Given uma campanha ativa com 10% já pago  
When o oracle atualiza as métricas para 50% do alvo  
Then as métricas da campanha devem ser atualizadas  
And os marcos de 20%, 30%, 40% e 50% devem ser marcados como true  
And 40% adicional do valor deve ser pago ao influenciador  
And o valor pago total deve ser 50% do valor da campanha
```

#### 14. Cenário: Conclusão da campanha (100%)

```
Given uma campanha ativa com pagamentos parciais  
When o oracle atualiza as métricas para 100% do alvo  
Then o status da campanha deve mudar para "Completed"  
And todos os marcos de pagamento devem estar como true  
And o valor total da campanha deve ter sido pago  
And o saldo da conta da campanha deve ser zero
```

#### 15. Cenário: Métricas excedendo alvos (failsafe)

```
Given uma campanha ativa  
When o oracle atualiza métricas que excedem os alvos (ex: 200% do alvo)  
Then as métricas devem ser limitadas aos valores alvo  
And o progresso deve ser calculado como 100%  
And apenas 100% do valor deve ser pago  
And a campanha deve ser marcada como "Completed"
```

#### 16. Cenário: Falha na atualização - oracle não autorizado

```
Given uma campanha ativa  
And um usuário que não é o oracle autorizado  
When o usuário tenta atualizar as métricas  
Then a transação deve falhar  
And deve retornar erro "You are not the authorized oracle"
```

#### 17. Cenário: Falha na atualização - campanha não ativa

```
Given uma campanha em status "Draft" ou "Completed" ou "Cancelled"  
When o oracle tenta atualizar as métricas  
Then a transação deve falhar  
And deve retornar erro apropriado para o status
```

#### 18. Cenário: Falha na atualização - campanha expirada

```
Given uma campanha ativa com prazo vencido  
When o oracle tenta atualizar as métricas  
Then a transação deve falhar  
And deve retornar erro "Campaign has expired"
```

### Feature: Cancelamento de Campanhas

#### 19. Cenário: Cancelamento bem-sucedido com reembolso

```
Given uma campanha ativa com 30% pago ao influenciador  
When a marca cancela a campanha  
Then o status da campanha deve mudar para "Cancelled"  
And 70% do valor deve ser reembolsado à marca  
And o saldo da conta da campanha deve ser zero
```

#### 20. Cenário: Cancelamento de campanha sem pagamentos

```
Given uma campanha ativa sem pagamentos realizados  
When a marca cancela a campanha  
Then o status da campanha deve mudar para "Cancelled"  
And 100% do valor deve ser reembolsado à marca
```

#### 21. Cenário: Cancelamento de campanha totalmente paga

```
Given uma campanha ativa com 100% pago ao influenciador  
When a marca cancela a campanha  
Then o status da campanha deve mudar para "Cancelled"  
And nenhum reembolso deve ser feito (0 USDC transferido)
```

#### 22. Cenário: Falha no cancelamento - marca não autorizada

```
Given uma campanha ativa  
And um usuário que não é a marca da campanha  
When o usuário tenta cancelar a campanha  
Then a transação deve falhar  
And deve retornar erro "You are not the authorized brand"
```

#### 23. Cenário: Falha no cancelamento - campanha já completada

```
Given uma campanha em status "Completed"  
When a marca tenta cancelar a campanha  
Then a transação deve falhar  
And deve retornar erro apropriado
```

#### 24. Cenário: Falha no cancelamento - campanha já cancelada

```
Given uma campanha em status "Cancelled"  
When a marca tenta cancelar novamente  
Then a transação deve falhar  
And deve retornar erro apropriado
```

### Feature: Validações de Segurança e Failsafes

#### 25. Cenário: Prevenção de overflow matemático

```
Given uma campanha com valores muito altos  
When operações matemáticas são realizadas  
Then deve haver verificação de overflow  
And deve retornar erro "Math overflow occurred" se necessário
```

#### 26. Cenário: Prevenção de pagamento duplicado

```
Given uma campanha com marco de 30% já pago  
When o sistema tenta processar novamente o pagamento de 30%  
Then o pagamento não deve ser processado  
And deve retornar erro "Payment already processed for this milestone"
```

#### 27. Cenário: Validação de fundos suficientes

```
Given uma campanha com saldo insuficiente para pagamento  
When um pagamento é tentado  
Then deve retornar erro "Insufficient funds for payment"
```

#### 28. Cenário: Prevenção de excesso de orçamento

```
Given uma campanha onde pagamentos excedem o valor total  
When um pagamento é calculado  
Then deve retornar erro "Payment amount exceeds campaign budget"
```

#### 29. Cenário: Validação de marco inválido

```
Given uma tentativa de pagamento para marco inexistente  
When a validação é executada  
Then deve retornar erro "Invalid payment milestone"
```

### Feature: Cálculo de Progresso

#### 30. Cenário: Cálculo correto com todas as métricas

```
Given uma campanha com alvos: 1000 likes, 100 comments, 10000 views, 50 shares  
And métricas atuais: 500 likes, 50 comments, 5000 views, 25 shares  
When o progresso é calculado  
Then deve retornar 50% (todas as métricas em 50%)
```

#### 31. Cenário: Cálculo com métricas desbalanceadas

```
Given uma campanha com alvos: 1000 likes, 100 comments, 10000 views, 50 shares  
And métricas atuais: 1000 likes, 25 comments, 2500 views, 12 shares  
When o progresso é calculado  
Then deve retornar a média ponderada correta
```

#### 32. Cenário: Cálculo com alvos zero (edge case)

```
Given uma campanha com todos os alvos zerados  
When o progresso é calculado  
Then deve retornar 0% sem erro
```

#### 33. Cenário: Limitação de progresso a 100%

```
Given métricas que excedem os alvos  
When o progresso é calculado  
Then deve retornar no máximo 100%
```

## Estrutura dos Testes

Os testes são organizados em:

1. **Setup**: Configuração de contas, tokens e parâmetros
2. **Execution**: Execução das instruções do programa
3. **Verification**: Verificação dos resultados esperados
4. **Cleanup**: Limpeza quando necessário

## Dados de Teste

- **Influenciador**: Keypair gerado dinamicamente
- **Marca**: Keypair gerado dinamicamente  
- **Oracle**: Keypair gerado dinamicamente
- **USDC Mint**: Criado com 6 decimais
- **Valores**: 1000 USDC por campanha
- **Métricas Alvo**: 1000 likes, 100 comments, 10000 views, 50 shares
- **Prazo**: 30 dias a partir da criação

## Execução dos Testes

```bash
# Executar todos os testes
anchor test

# Executar apenas testes do solengage
anchor test --skip-lint tests/solengage/solengage.ts
```

## Cobertura Esperada

- ✅ Criação de campanhas (cenários positivos e negativos)
- ✅ Pagamentos de marca (cenários positivos e negativos)  
- ✅ Atualizações de métricas e pagamentos progressivos
- ✅ Cancelamentos de campanhas
- ✅ Validações de segurança e failsafes
- ✅ Cálculos de progresso e edge cases
- ✅ Tratamento de erros e exceções
- ✅ Verificação de autorizações e permissões