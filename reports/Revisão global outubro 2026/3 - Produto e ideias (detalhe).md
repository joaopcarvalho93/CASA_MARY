# Revisão de produto e ideias — Casa Mary (outubro 2026)

*Feito por um agente (modelo Haiku), só leitura do código.*

## Mapa atual
- Telemóvel: Início · Super · Compras · Finanças · Mais (Lista da casa, Talão e preços, Orçamento, Casa).
- O Início e o separador "Compras" são da mobília — o que menos se usa hoje aparece primeiro.
- Enterrado: Despensa, **Acerto de contas (3 toques)**, Importar (7.º de 8 separadores em Finanças), Regras, Estatísticas, Leituras/Contratos/Despesas, Ideias.

## Navegação proposta
**Telemóvel:** Início · Super · Finanças · Casa · Mais
1. **Início — "Este mês"**: linha partilhada ("saíram X € da casa · a Mariana deve Y €"), pendentes por aprovar, quem deve a quem + Acertar, despesas da casa do mês, supermercado ("faltam 7 · 2 acabaram" + campo "falta…"), despensa a acabar, lembretes (contratos, leituras), mobília numa linha no fim.
2. **Super**: Lista · Despensa · Talão e preços.
3. **Finanças**: com contador de pendentes; 5 separadores em vez de 8 (Painel com gráficos, Transações, Importar, Orçamento, Património com contas). Regras dentro de Importar/Transações.
4. **Casa**: Acerto (primeiro), Despesas partilhadas, Contas da casa (contratos + leituras), Inventário.
5. **Mais**: Mobília (Lista & sourcing, Compras, Orçamento da mobília), Ideias.

## Ideias (custo zero)
| # | Ideia | Esforço | Base |
|---|---|---|---|
| 1 | **Resumo do mês ("Wrapped") no Telegram** no dia 1: total, top categorias, vs mês anterior, maior compra, idas ao super | médio | analise.ts, bot |
| 2 | **Detetor de subscrições** (cobranças repetidas, subidas de preço) — a lógica `detetarRecorrentes` já existe sem ecrã | pequeno | finance_recurring |
| 3 | **Quem paga a próxima** — placar das despesas da casa | pequeno | expenses |
| 4 | **"Vai acabar" pela cadência** — "o café costuma durar 18 dias" | médio | pantry_items.riscado_em |
| 5 | **Dinheiro livre até ao fim do mês** (`/livre`) — saldo − fixos por pagar ÷ dias | médio | saldos, contratos |
| 6 | **Alertas de preço dos talões** — "leite −12% face à média" | médio | grocery_prices |
| 7 | **Metas de poupança a dois** (ex.: Férias 2027) | médio | tabela nova |
| 8 | **Ementa da semana → lista** (tira o que há na despensa) | médio/grande | super.ts |
| 9 | **Garrafeira e livros** — tabela `wines` já existe sem ecrã | pequeno/médio | wines |
| 10 | **Faturas para o IRS** — exportar por ano as despesas com NIF | médio | finance_merchant_nifs |
| 11 | **Garantias da mobília** com lembrete 30 dias antes | pequeno | inventory |
| 12 | **Desafio mensal por categoria** entre os dois | pequeno | budgets |
| 13 | **Lista do super offline** (PWA) para lojas sem rede | médio | supermercado |
| 14 | **Lembretes de contas e leituras** no Telegram | pequeno | contracts, readings |

## Fricção encontrada
- Não há contador de "por aprovar" em lado nenhum da app (só `/pendentes` no bot).
- Aprovar dá trabalho: categoria linha a linha; propostas de regra a meio. Ideia: "aprovar tudo o que já tem regra" + propostas de regra no fim.
- Só o Revolut tem importador de CSV (ActiveBank e Coverflex entram à mão ou por mim).
- Termos que colidem: "Compras" (mobília na app, supermercado no bot), "Lista" (mobília na app, super no bot), "Contas" (saldos na app, quem deve a quem no bot), dois "Orçamento".
- Duas entradas para despesas partilhadas (Casa › Despesas e Finanças › Transações › Dividir).
- PIN pedido de novo ao abrir links do Telegram (sessão por separador).
- Código sem ecrã: recorrentes, salários, garrafeira, compras.
