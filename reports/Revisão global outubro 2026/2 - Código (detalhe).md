# Revisão global de código — Casa Mary

Âmbito: `/home/user/casa-mary` (commit `c4b4092`), só leitura. `npx tsc --noEmit` passa sem erros. Não há testes a correr no repositório: os únicos (`supabase/functions/telegram-bot/*_test.ts`) usam `jsr:` (Deno) e testam a cópia da edge function, não o código que corre no Worker. Os `.tmp/*.test.ts` são ficheiros soltos, não versionados.

Legenda de certeza: **[confirmado]** = verificado a ler o código; **[a confirmar]** = depende de configuração da base de dados/Supabase que não está no repositório.

---

## Resumo por severidade

| # | Sev. | Tema | Local |
|---|------|------|-------|
| 1 | alta | `/comparar` do bot devolve tudo a zero quando o mês mais recente tem menos de 31 dias (`-31`) | `bot.ts:993` |
| 2 | alta | Limites `.limit(2000/5000/10000)` esbarram no máximo de linhas do PostgREST (1000 por omissão): saldos, estatísticas e deduplicação silenciosamente errados | `use-finance.ts:40`, `bot.ts:896`, `importar.tsx:120,239,417` |
| 3 | alta | "Aprovar" não fica desativado durante o pedido: duplo toque duplica transação e dívida da casa | `importar.tsx:861` |
| 4 | alta | Aprovação em vários passos sem transação; um retry cria duplicados (`hashLivre` esconde o conflito) | `importar.tsx:207-370` |
| 5 | alta | Bot: `donoFinancas` cai nas finanças de outra pessoa; `/gastos`, `/comparar`, `/pendentes` mostram dados privados do outro | `bot.ts:164-182` |
| 6 | média | Orçamento soma o valor bruto; todo o resto usa `valorEfetivo` (a tua parte) | `financas/orcamento.tsx:92-130` |
| 7 | média | PIN de 4 dígitos + limitador global: força bruta em dias e bloqueio do login por qualquer pessoa | `auth.server.ts`, `auth.functions.ts` |
| 8 | média | `next` em `/entrar`: `"/\t/evil.com"` passa a validação e é redirect aberto | `entrar.tsx:30-37` |
| 9 | média | Token OAuth do MCP é um JWT completo do utilizador (não limitado às 4 ferramentas) | `lib/mcp/index.ts`, consentimento |
| 10 | média | Esquema, RLS, RPCs e tabelas do bot não estão no repositório; políticas `USING (true)` dependem de o registo público estar desligado | `supabase/migrations/*` |
| 11 | média | Apagar/editar transação dividida deixa a despesa da casa órfã ou desatualizada | `transacoes.tsx:289-460` |
| 12 | média | Bot: o `update_id` é marcado antes de tratar; se o Worker morrer (CPU/memória numa foto) a mensagem perde-se sem resposta | `bot.ts:1153`, `ler_ficheiro.ts` |
| 13 | média | Bot: um cartão à espera "engole" a mensagem seguinte (nova despesa vira descrição) | `bot.ts:475-497` |
| 14 | média | Duplicação Worker vs edge function e deriva já visível (Tricount, aviso de repetida, menu de comandos) | `supabase/functions/telegram-bot/*` |
| 15 | média | Pessoa ativa vem do `localStorage`, não da sessão; biometria pode trocar a pessoa | `casa.ts:137`, `entrar.tsx` |
| 16 | média | `.tmp/` com extratos reais (nomes, valores) não está no `.gitignore` | `.tmp/staging.*` |
| 17 | baixa | Lista do Telegram: corte a 4000 caracteres pode partir HTML; `grocery_items` nunca é limpa | `lista.ts:95` |
| 18 | baixa | Datas: `VAZIO` congelado ao carregar o módulo; vários `toISOString().slice(0,10)` em UTC | `transacoes.tsx:91` e outros |
| 19 | baixa | Mesma `queryKey ["expenses"]` com duas queries diferentes | `despesas.tsx:86`, `use-contas.ts:32` |
| 20 | baixa | Scripts de CDN (pdf.js, Tesseract) sem SRI; `tesseract.js@6` flutuante | `ler-ficheiro.ts:7-9` |
| 21 | baixa | Lógica duplicada que pode divergir (`valorEfetivo`, `kindEfetivo`, `hojeISO`, regras de categoria) | vários |
| 22 | baixa | Fatura de supermercado: 3 inserts sem transação, sem guarda de duplicado, ficheiro nunca ligado | `fatura.tsx:150-190` |
| 23 | baixa | Desempenho de `possiveisRepetidas` e invalidação total de `["finance"]` a cada edição | `finance.ts`, `importar.tsx` |
| 24 | baixa | Endurecimento do bot (segredo em URL e comparação não constante, chats não privados, erros internos no chat) | `bot.ts` |
| 25 | baixa | Leitor de texto do bot: primeiro número é o valor; datas inválidas "rolam" | `texto.ts` |
| 26 | baixa | Importador só lê o CSV antigo do Revolut e ignora a coluna Comissão; restos de backup/migração | `finance.ts`, `drizzle/` |

---

## Achados detalhados

### 1. `/comparar` do bot dá tudo a zero em meses com menos de 31 dias — alta [confirmado]
`src/server/telegram/bot.ts:992-993`:
```ts
const [de, ate] = ma < mb ? [ma, mb] : [mb, ma];
const linhas = await movimentosEntre(owner, `${de}-01`, `${ate}-31`);
```
`occurred_at` é `date`. `lte("occurred_at", "2026-11-31")` é uma data inválida no Postgres, o PostgREST responde 400 e `movimentosEntre` faz `(data ?? [])` sem olhar para `error` (linha ~888-897). Cenário: a 1 de novembro, `/comparar` (novembro vs outubro) mostra 0,00 € em tudo. Idem para abril, junho, setembro e fevereiro, incluindo os botões "◀ ... vs ..." e "Comparar".
Correção: usar `ultimoDia(ate)` (já existe em `analise.ts:48`; exportá-lo) e passar a tratar `error` em `movimentosEntre` (responder "não consegui ler as contas" em vez de zeros).

### 2. Limites de linhas que o PostgREST ignora — alta [a confirmar: `max_rows`; não está em `supabase/config.toml`, o valor por omissão do Supabase é 1000]
`useTransactions` (`use-finance.ts:40`, `.limit(2000)`), bot (`bot.ts:896`, `.limit(5000)`), importar (`importar.tsx:120, 239, 417`, `.limit(10000)`), `usePrecos` (`use-contas.ts:111`). Se o servidor corta nas 1000 linhas, o pedido "funciona" mas devolve só as 1000 mais recentes. Consequências:
- `financas/contas.tsx:67` soma `amount` de todas as transações para o saldo de cada conta: passado o milhar, os saldos ficam errados sem aviso.
- Estatísticas "Tudo"/12 meses, Painel, Orçamento e `/gastos` a 6 meses ou ao ano ficam truncados.
- A deduplicação do importar (`importar.tsx:107-125`) não vê hashes antigos, e `aprovar` (linha 239) calcula `hashLivre` sem eles: duplicados entram, ou o `INSERT` falha no índice único `(owner_id, dedup_hash)`.
- `useExpenses` (`use-contas.ts:30`) nem tem limite: passado o milhar de despesas (contam as já acertadas), as por acertar mais antigas deixam de aparecer no Acerto.
Correção: paginar com `.range()` até esgotar, ou agregar no servidor (RPC/view para saldos e totais por mês); no mínimo, comparar `data.length` com o teto e avisar. O ecrã de saldos devia somar no servidor.

### 3. "Aprovar" pode ser tocado duas vezes — alta [confirmado]
`importar.tsx:861`: o botão "Aprovar" (e "Descartar") não tem `disabled={aprovar.isPending}`; só "Aprovar todos" tem. Cenário: toque duplo numa linha vinda do Telegram (sem `dedup_hash`): dois `aprovar.mutate([s])` em paralelo inserem duas `finance_transactions` e duas `expenses` (a dívida da casa conta a dobrar no Acerto). Nas linhas com hash, a segunda inserção rebenta no índice único, mas deixa o toast de erro e estado misto.
Correção: desativar enquanto `isPending` e, no servidor, "reclamar" a linha com `UPDATE ... SET status='approved' WHERE id=? AND status='pending' RETURNING` antes de inserir (ver 4).

### 4. Aprovação em vários passos, sem transação — alta [confirmado]
`importar.tsx:207-370`: (a) insere transações; (b) atualiza `finance_staged_transactions` em blocos de 25; (c) cria `expenses` e atualiza a transação com `split_expense_id`; (d) insere `finance_transaction_items`. Se (b), (c) ou (d) falharem a meio, as linhas ficam `approved` mas sem despesa da casa (já não aparecem para reaprovar) ou ficam `pending` com a transação já criada. No segundo caso, ao reaprovar, `hashLivre` (linha ~239-249) devolve `hash#2` e cria um duplicado verdadeiro sem aviso: a correção "linhas iguais verdadeiras já não falham" (commit `3d1ad73`) tapa precisamente o erro que protegia contra isto. Além disso, `update({split_expense_id...})` na linha ~330 não verifica `error`: a despesa existe mas a transação continua a contar 100% nas estatísticas.
Correção: uma função SQL `aprovar_staged(ids uuid[], pessoa uuid)` que faça tudo numa transação e use `status='pending'` como guarda; o cliente só a chama.

### 5. Bot: `donoFinancas` e privacidade entre utilizadores — alta [confirmado]
`bot.ts:164-182`: se quem escreve não tem nenhum `finance_import_batches` próprio, o dono passa a ser o do lote mais recente de qualquer pessoa ("senão, as da casa"). Esse `owner` é depois usado com a service role (RLS ignorada) em `completar` -> `avisoRepetida` (`:307`), `enviarParaAprovacao` (`:766`), `/pendentes` (`:875`), `gastos` (`:942`) e `comparar` (`:989`). Cenário: a Mariana ainda não importou nada, manda `/gastos` e vê as despesas, receitas e comerciantes do João; ou manda "café 3,50" e a despesa dela entra na caixa de aprovação do João. Contraria a promessa da app ("Só tu vês esta área") e a RLS por `owner_id`.
Correção: `owner = pessoa.auth_user_id` e ponto final; se não houver, responder "liga a tua conta". O `finance_import_batches` como critério é desnecessário.

### 6. Orçamento usa valor bruto; o resto da app usa a tua parte — média [confirmado]
`financas/orcamento.tsx:92-96, 106, 130` somam `Math.abs(num(t.amount))`. Painel (`index.tsx:56-68`), Estatísticas (`estatisticas.tsx:71-80`), Transações (`transacoes.tsx`) e o bot (`analise.ts:149`) usam `valorEfetivo` (desconta a parte do outro). Cenário: jantar de 60 € dividido a meio: Estatísticas diz 30 €, Orçamento gasta 60 € da categoria e a poupança mensal fica errada. Além disso, o Orçamento classifica por `kindEfetivo` e o Painel/Estatísticas pelo sinal de `valorEfetivo`; o bot, por `kind`. Um movimento com `kind` e sinal em desacordo (reembolso marcado como "Despesa") conta em sítios diferentes.
Correção: um único módulo (`totaisDoMes`) usado por todos, com `valorEfetivo`, e decidir se a classificação é por `kind` ou por sinal.

### 7. PIN de 4 dígitos e limitador — média [confirmado]
`auth.functions.ts:11` só aceita `^\d{4}$` (10 000 combinações, e há dois PINs válidos). `auth.server.ts:8-22`: o limite por IP (8 tentativas livres) é contornável quando `cf-connecting-ip` falta (cai em `x-forwarded-for`), e o global permite 20 falhas por janela de 10 min, seguidas de bloqueio de 10 min. Isto dá cerca de 2 900 tentativas por dia para um atacante: tempo esperado de 1 a 2 dias para um dos PINs. Ao mesmo tempo, 20 PINs errados bloqueiam o login dos dois utilizadores legítimos durante 10 min, repetível.
Correção: PIN de 6+ dígitos (ou passphrase), bloqueio global progressivo só depois de bem mais falhas, alerta (Telegram) após N falhas, e notificar o dono.

### 8. Redirect aberto em `/entrar?next=` — média [confirmado]
`entrar.tsx:30-37` rejeita `//` e `\`, mas `"/\t/evil.com"` (tab) ou `"/\n/evil.com"` passam, e `window.location.replace(next)` (`:72` e `:103`) é resolvido pelo browser como `//evil.com`, porque o parser de URLs remove tabs e newlines. Um link `https://casa-mary.lovable.app/entrar?next=%2F%09%2Fevil.com` mostra o ecrã real de PIN e envia o utilizador para outro sítio depois de entrar (phishing).
Correção: `new URL(next, location.origin).origin === location.origin` e rejeitar `/[\u0000-\u001f]/`.

### 9. MCP: o token dá acesso total, não só às 4 ferramentas — média [confirmado]
`lib/mcp/index.ts` aceita `acceptedAudiences: "authenticated"`; as ferramentas usam o JWT do utilizador (bom: RLS aplica-se). Mas esse JWT é um token Supabase normal que também funciona contra o PostgREST (a chave publicável está no bundle): um cliente autorizado pode ler e escrever tudo o que a RLS deixa (finanças privadas, apagar transações, etc.), não só `listar_transacoes`. O ecrã de consentimento (`[.]lovable.oauth.consent.tsx:75-79`) diz "consultar a lista… e ler as tuas transações", o que é enganador, e não mostra o redirect URI nem o cliente registado dinamicamente.
Correção: tornar claro no consentimento que é acesso total à conta, ou pedir ao Lovable/Supabase scopes; rever a lista de clientes OAuth; considerar desligar o MCP se não for usado.

### 10. Esquema fora do repositório; dependência de RLS permissiva — média [a confirmar]
`supabase/migrations/` (16 ficheiros, o último a 2026-09-15) não tem `telegram_*`, `finance_merchant_nifs`, `pin_attempts`/`pin_register_fail`, `registar_acerto`/`anular_acerto`, colunas `merchant`, `atcud`, `paid_by`, `to_household`, `riscado_em`, nem os enums `Home`/`Utilities`/`Tricount`. O `types.ts` foi editado à mão para os refletir. Não dá para rever as políticas dessas tabelas nem recriar a base. As tabelas "da casa" (`expenses`, `settlements`, `purchases`, `wines`…) usam `USING (true) TO authenticated`: só é seguro se o registo de novos utilizadores estiver desligado no Supabase Auth (a chave publicável é pública e qualquer `signUp` seria "authenticated"). `registar_acerto` aceita `p_amount` do cliente: confirmar se valida contra `p_expense_ids`. As tabelas `finance_merchant_nifs` e `telegram_*` são acedidas por service role e devem ter RLS sem políticas.
Correção: exportar o esquema real (`supabase db pull`) para `migrations/`; confirmar "Allow new users to sign up = off"; ver as funções SQL.

### 11. Transação dividida: apagar e editar deixam a despesa da casa desatualizada — média [confirmado]
`transacoes.tsx:443-453` (`apagar`) só apaga a transação; a `expenses` ligada (`split_expense_id`) e o `owed_amount` ficam no Acerto. O diálogo diz só "desaparece de vez". `guardar` (`:289-420`) altera `amount` sem atualizar `split_amount` nem a despesa: a parte do outro e o valor total ficam desfasados. Também é multi-passo sem transação: se a criação da despesa falhar depois de a transação ser inserida, o formulário continua aberto e carregar de novo "Guardar" cria uma segunda transação.
Correção: no apagar, perguntar e apagar a despesa associada (ou impedir se já estiver acertada, `settlement_id`); no editar de transação dividida, desativar o campo valor ou recalcular; envolver em RPC.

### 12. Bot: o `update_id` é registado antes de tratar — média [confirmado]
`bot.ts:1153-1158`: o insert em `telegram_updates` dá deduplicação, mas se o Worker for morto (OOM ao descodificar uma foto de 12 MP, CPU, deploy), o Telegram repete e o `23505` devolve "ok": o utilizador nunca recebe resposta nem despesa. `ler_ficheiro.ts:87` chama `jpeg.decode` com `maxMemoryUsageInMB: 200` (acima dos 128 MB do Worker) e sem teto de pixéis antes de descodificar; PNG não tem teto. `catch` geral só apanha exceções, não mortes do isolate.
Correção: ler a largura/altura do cabeçalho JPEG/PNG antes de descodificar e rejeitar > ~12 MP (enviar para o caminho da edge); marcar o update como "feito" só no fim (estado `processing` com expiração); responder a erros com `tg()` protegido.

### 13. Bot: o cartão pendente engole a mensagem seguinte — média [confirmado]
`bot.ts:475-497`: se existe um rascunho com `awaiting` (valor/descrição/data) atualizado há menos de 30 min, qualquer texto que não seja lista/comando é tratado como resposta a esse cartão. Cenário: mandas a foto sem QR (fica à espera do valor), 10 min depois escreves "almoço 12,50": o rascunho recebe valor 12,5 (ou, se esperava descrição, `d.descricao = "almoço 12,50"`) e a despesa nova nunca é criada. Os rascunhos abandonados também nunca se apagam (só os cancelados/enviados).
Correção: só consumir texto como resposta quando é curto/compatível (número, data) ou a resposta do Telegram (`reply_to_message`) aponta para o cartão; limpar rascunhos > 24 h.

### 14. Worker e edge function duplicam ~900 linhas e já divergem — média [confirmado]
`supabase/functions/telegram-bot/index.ts` (985 linhas) é quase cópia de `src/server/telegram/bot.ts` (394 linhas de diff). Deriva já existente:
- `CONTAS` sem "Tricount" na edge (`index.ts:54`, `texto.ts:17,31`): as faturas lidas pela edge não deixam escolher a conta.
- A edge não tem `avisoRepetida`: fotos reencaminhadas não avisam de repetidas.
- Menu de comandos: cada cold start da edge (`index.ts:936-942, 962`) chama `setMyCommands` com 5 comandos e apaga `/lista` e `/falta` do menu até ao próximo cold start do Worker.
- `sugerirCategoria` do bot ignora `match_field` (lê-o do SQL mas só compara com a descrição), ao contrário de `finance.ts:sugerirCategoria`.
- Os testes existentes só cobrem a cópia da edge.
Correção: se a edge só serve para fotos difíceis, reduzi-la a "ler QR e devolver JSON" (sem lógica de cartões, sem `configurar`, sem menu) ou eliminar e usar `zxing-wasm` no Worker se couber no limite; partilhar `texto.ts`/`analise.ts` por import (symlink ou pasta comum).

### 15. A "pessoa ativa" não está ligada à sessão — média [confirmado]
`casa.ts:137` guarda a pessoa no `localStorage`; `use-casa.ts:useActivePersonId` usa-a para `paid_by`, `person_id`, dívidas, etc. `entrar.tsx:147` define-a por `people.name === "João Carvalho"` (strings fixas também em `auth.server.ts:162-168`), e se não houver correspondência deixa a anterior sem aviso. No desbloqueio por biometria (`entrar.tsx:82`) `writeActivePerson(cred.pessoaId)` vem da credencial local, não da sessão: se o João entra por PIN num telemóvel que tem a credencial da Mariana, as despesas ficam atribuídas à Mariana com a sessão do João. A coluna `people.auth_user_id` já existe e é o que o bot usa.
Correção: derivar a pessoa ativa de `people.auth_user_id = auth.uid()` (um hook) e remover o `localStorage`.

### 16. `.tmp/` com dados bancários reais, sem estar ignorado — média [confirmado]
`.tmp/staging.sql` (24 KB), `staging.json`, `staging.ts`, `sql.ts` têm movimentos de setembro 2026, nomes de terceiros ("TRF MB WAY P/ ...") e o `owner_id` real. `git check-ignore .tmp` diz que não está ignorado; um `git add -A` publica-o. Correção: adicionar `.tmp/` ao `.gitignore` e apagar os ficheiros (e verificar se já estão no histórico).

### 17. Lista de compras no Telegram — baixa [confirmado]
- `lista.ts:95`: `linhas.join("\n").slice(0, 4000)` pode cortar a meio de um `<b>`/`<i>` ou de `&amp;`, e o Telegram responde "can't parse entities": a lista deixa de enviar ou atualizar (e `atualizarListas` apaga o registo se a descrição contiver "not found"/"can't be edited", mas este erro não, por isso repete). Em listas grandes, usar cortes por linha inteira.
- Os botões estão limitados a 80, mas os produtos para além disso não são riscáveis no Telegram.
- `grocery_items` nunca é apagada (confirmar com `grep "\.delete()"`: só `pantry_items` tem apagar): `lerLista`, `juntarALista` e `useGroceryExtras` lêem a tabela inteira a cada toque, e o limite de 1000 linhas acabará por esconder itens ativos.
Correção: apagar os riscados com mais de X dias (cron ou na leitura) e filtrar `checked=false OR checked_at > desde` na query.

### 18. Datas e fuso horário — baixa [confirmado]
- `transacoes.tsx:91`: `VAZIO.occurred_at = new Date().toISOString().slice(0,10)` é avaliado uma vez, ao carregar o módulo. Numa PWA aberta dias seguidos, "Nova transação" propõe a data de quando a app abriu (e em UTC).
- Variantes UTC: `despesas.tsx:77,190`, `acerto.tsx:117`, `leituras.tsx:41,65`, `financas/index.tsx:36-40`, `estatisticas.tsx:67`, `orcamento.tsx:83`. Entre as 00:00 e as 01:00 de Lisboa, no horário de verão, dão o dia/mês anterior. `hojeISO()` existe em duas cópias (`finance.ts`, `inventario.ts`) e usa a hora local do aparelho.
- `lerTexto` aceita "31/02" e `new Date(2026,1,31)` passa a 3 de março sem erro.
Correção: um `hojeLisboa()` partilhado (`Intl.DateTimeFormat("en-CA", {timeZone:"Europe/Lisbon"})`) e `VAZIO` como função.

### 19. Colisão de `queryKey ["expenses"]` — baixa [confirmado]
`despesas.tsx:86` (filtra `is_household=true`, `select *`) e `use-contas.ts:32` (`useExpenses`, todas as despesas, colunas específicas) usam a mesma chave. A cache serve primeiro os dados da outra query (com `staleTime` 0 só se corrige no refetch). Cenário: abrir Acerto a seguir a Despesas mostra por instantes só as despesas da casa e sem as dívidas diretas (`is_household=false`); `registar_acerto` com uma seleção feita nesse instante manda ids incompletos. Correção: chaves distintas (`["expenses","casa"]`, `["expenses","todas"]`).

### 20. Scripts de CDN no browser — baixa [confirmado]
`ler-ficheiro.ts:7-9`: `pdfjs-dist@4.10.38` e `tesseract.js@6` (flutuante, não é versão exata) carregados do jsDelivr e executados na origem autenticada (o token Supabase está no `localStorage`). Sem SRI. Correção: fixar versão exata e SRI, ou empacotar com o Vite (lazy import).

### 21. Lógica duplicada (risco de divergência) — baixa [confirmado]
- `valorEfetivo`: `finance.ts`, `analise.ts:149-153` (e cópia na edge), `lib/mcp/tools/transacoes.ts:29`.
- `kindEfetivo` / `tipoEfetivo` (`analise.ts`).
- `hojeISO` ×2; motor de regras de categoria ×2 (cliente e bot); regex de datas e dinheiro em `texto.ts`, `faturas.ts`, `casa.ts:parseMoney`, `finance.ts:numeroBanco` com regras diferentes de milhares ("1.500" vira 1500 em `parseMoney` mas "1.500" em `numeroBanco` vira 1.5 se não tiver vírgula).
Correção: mover o que o bot e a app partilham para `src/lib/` sem dependências do browser (o bot já importa `@/lib/super`), e importar de lá em `analise.ts` e MCP.

### 22. Fatura de supermercado — baixa [confirmado]
`fatura.tsx:150-190`: `purchases`, `purchase_items` e `grocery_prices` são três inserts separados: se o segundo falhar fica uma compra vazia e repetir cria duplicado; não há guarda de duplicado (mesma loja, data e total). `invoice_path` e `expense_id` de `purchases` nunca são escritos, por isso a fatura que veio do Telegram (`?ficheiro=`) não fica ligada à compra nem à transação. `faturas.ts` trata "cartão"/"promo"/"poupan" no nome como desconto (um artigo "CARTAO PRESENTE" abate ao anterior). `ler-ficheiro.ts` (OCR) corre no browser, o `src/server/telegram/ler_ficheiro.ts` no Worker: dois leitores diferentes para o mesmo fim.

### 23. Desempenho no importar — baixa [confirmado]
`finance.ts:possiveisRepetidas` é O(staged × (contas + staged)) com `Date.parse` ×2 por par: com 600 linhas por aprovar e 3000 transações são milhões de iterações; corre de novo a cada `invalidate()` (`importar.tsx:419`, deps `[staged, jaNasContas]`). Cada edição (`atualizar`, no `onBlur`) invalida `["finance"]` e refaz o pedido `para-repetidas` (até 1000+ linhas). Correção: indexar por dia (`Map<data, linhas[]>`) e invalidar só `["finance","staged"]`.

### 24. Endurecimento do bot — baixa [confirmado]
- `bot.ts:1149` compara `x-telegram-bot-api-secret-token !== SEGREDO()` e `?configurar=<SECRET>` (`:1138`) com `===`: usar comparação de tempo constante; o segredo em URL fica em logs/histórico.
- `tratar` (`:1047`) não verifica `chat.type === "private"`: se o bot for adicionado a um grupo, `/gastos` e `/contas` respondem no grupo.
- `tratarPedido` (`:1174`) envia `Algo correu mal: ${e.message}` para o chat, com texto interno (erros do Supabase, nomes de colunas). Um `tg()` que falhe no `catch` rebenta de novo e devolve 500.
- `tg()` (`:113`) não trata 429 nem JSON inválido.

### 25. Leitor de texto do bot — baixa [confirmado]
`texto.ts`: o valor é o primeiro número isolado, por isso "2 cafés 3,50" regista 2 €; "comprar pão 1,50" é tratado como lista (`bot.ts:467`, prefixo "comprar"), não como despesa. O cartão mostra o valor antes de enviar, por isso o custo é só de toque.

### 26. Importador e restos — baixa [confirmado]
- `parseRevolutCsv` só aceita o CSV antigo (`Tipo,Produto,Data de início,...`) e ignora a coluna `Comissão`; o extrato "consolidated statement" que o próprio `.tmp/staging.ts` usa (colunas `Data,Descrição,...`) não é suportado, por isso foi importado com scripts à parte. Sem a comissão, o saldo por conta (`contas.tsx`) deriva.
- `drizzle/` (`0000_secure_finance_rules_backup.sql`) e a tabela `finance_category_rules_bak_20260921` são restos de uma operação pontual; `drizzle.config.ts` aponta para `LOVABLE_DB_MIGRATION_URL`. Decidir se ficam.
- `orcamento.tsx:84`: `mesesComDados.includes(mes) ? mes : mes` é código morto.
- `lib/mcp/tools/despensa-estado.ts` só escreve `status` (não `riscado_em`/`riscado_de` como bot e app): marcar "temos" por MCP não aparece em "No carrinho" e "acabou" deixa `riscado_*` antigos. `listar_transacoes` limita a 500 sem indicar truncagem, um modelo pode somar totais parciais.
- `despensa.tsx:setStatus` também só escreve `status` (mesma incoerência).

---

## O que está bem (para não se mexer)
- `entrarComPin`: PIN comparado no servidor, `timingSafeEqual`, contador por IP e global em Postgres atómico (`pin_register_fail`), `SUPABASE_SERVICE_ROLE_KEY` só em módulos `.server`/server route; nenhum segredo vai para o bundle (`.env` só tem chaves publicáveis).
- RLS por `owner_id` nas tabelas `finance_*` do repositório; o MCP usa o JWT do utilizador e não a service role.
- `valorEfetivo`/`calcularSaldo` no Acerto: sinais e `settlement_id` corretos; `registar_acerto` é atómico no servidor.
- Bot: segredo do webhook obrigatório, dedupe por `update_id`, callback_data sempre < 64 bytes (maior: `la:<uuid>:<n>`, 42 bytes), no máximo 80 botões na lista.

## Ordem de arranque sugerida
1. Corrigir `-31` no `/comparar` (1) e `donoFinancas` (5): são pequenos e acabam com um bug visível e um problema de privacidade.
2. Confirmar `max_rows` e paginar/agregar (2).
3. Mover a aprovação para uma RPC transacional e desativar botões (3, 4, 11).
4. Unificar totais (6, 21) e a pessoa ativa (15).
5. `.gitignore` do `.tmp`, `next` seguro, PIN mais longo (16, 8, 7), `supabase db pull` (10).
