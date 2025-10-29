# Testes Solengage - Casos Essenciais

Este documento descreve os cenários de teste essenciais para o programa Solengage seguindo o padrão BDD (Behavior-Driven Development).

## Visão Geral

O Solengage é um programa Solana que gerencia campanhas de marketing de influenciadores com pagamentos progressivos baseados em métricas de engajamento.

## Casos de Teste Essenciais

### 1. Criar Campanha

#### Cenário: Criação bem-sucedida de campanha

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
```

#### Cenário: Falha na criação - parâmetros inválidos

```
Given um influenciador autenticado  
When o influenciador tenta criar uma campanha com parâmetros inválidos  
Then a transação deve falhar  
And deve retornar erro apropriado (nome muito longo, prazo no passado, valor inválido, etc.)
```

### 2. Ativar Campanha (Depósito USDC da Marca)

#### Cenário: Ativação bem-sucedida da campanha

```
Given uma campanha existente em status "Draft"  
And a marca tem saldo suficiente de USDC  
When a marca deposita USDC para ativar a campanha  
Then o status da campanha deve mudar para "Active"  
And o valor total deve ser transferido para a conta da campanha  
And o saldo da marca deve diminuir pelo valor da campanha
```

#### Cenário: Falha na ativação - saldo insuficiente

```
Given uma campanha existente em status "Draft"  
And a marca não tem saldo suficiente de USDC  
When a marca tenta ativar a campanha  
Then a transação deve falhar  
And deve retornar erro de saldo insuficiente
```

### 3. Atualizar Dados de Campanha Ativa (Oracle)

#### Cenário: Atualização bem-sucedida de métricas

```
Given uma campanha ativa  
And um oracle autorizado  
When o oracle atualiza as métricas da campanha  
Then as métricas da campanha devem ser atualizadas  
And o progresso deve ser recalculado  
And os dados devem ser persistidos corretamente
```

#### Cenário: Falha na atualização - oracle não autorizado

```
Given uma campanha ativa  
And um usuário que não é o oracle autorizado  
When o usuário tenta atualizar as métricas  
Then a transação deve falhar  
And deve retornar erro "You are not the authorized oracle"
```

### 4. Micro Pagamentos (Backend verifica métricas e paga a cada 10%)

#### Cenário: Pagamento de 10% ao atingir meta

```
Given uma campanha ativa  
And métricas atuais zeradas  
When as métricas atingem 10% do alvo  
Then o marco de 10% deve ser marcado como true  
And 10% do valor deve ser pago ao influenciador  
And o valor pago total deve ser atualizado
```

#### Cenário: Múltiplos pagamentos progressivos

```
Given uma campanha ativa com 10% já pago  
When as métricas atingem 50% do alvo  
Then os marcos de 20%, 30%, 40% e 50% devem ser marcados como true  
And 40% adicional do valor deve ser pago ao influenciador  
And o valor pago total deve ser 50% do valor da campanha
```

#### Cenário: Conclusão da campanha (100%)

```
Given uma campanha ativa com pagamentos parciais  
When as métricas atingem 100% do alvo  
Then o status da campanha deve mudar para "Completed"  
And todos os marcos de pagamento devem estar como true  
And o valor total da campanha deve ter sido pago
```

#### Cenário: Prevenção de pagamento duplicado

```
Given uma campanha com marco de 30% já pago  
When o sistema tenta processar novamente o pagamento de 30%  
Then o pagamento não deve ser processado  
And deve retornar erro "Payment already processed for this milestone"
```

### 5. Buscar Informações sobre Status das Campanhas

#### Cenário: Consulta de status de campanha

```
Given uma campanha existente  
When é solicitada informação sobre o status da campanha  
Then deve retornar:  
  - Status atual (Draft, Active, Completed, Cancelled)  
  - Progresso das métricas  
  - Valor total pago  
  - Marcos de pagamento atingidos  
  - Dados da campanha (nome, hashtag, prazo, etc.)
```

#### Cenário: Consulta de múltiplas campanhas

```
Given múltiplas campanhas de um influenciador  
When é solicitada lista de campanhas  
Then deve retornar array com informações resumidas de cada campanha  
And deve incluir filtros por status se solicitado
```

## Estrutura dos Testes

Os testes são organizados em:

1. **Setup**: Configuração de contas, tokens e parâmetros
2. **Execution**: Execução das instruções do programa
3. **Verification**: Verificação dos resultados esperados

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

## Cobertura dos Casos Essenciais

- ✅ Criar campanha (cenários positivos e negativos)
- ✅ Ativar campanha com depósito USDC
- ✅ Atualizar dados de campanha ativa via oracle
- ✅ Micro pagamentos progressivos (a cada 10%)
- ✅ Buscar informações sobre status das campanhas