# Revisão global — Casa Mary (23/10/2026)

Três agentes em modelos mais baratos (código: Sonnet; produto/ideias: Haiku; Kobo/Kindle: Sonnet) + verificação e correções minhas. Detalhes nos ficheiros 2, 3 e 4 desta pasta.

## Já corrigido e publicado (sem créditos)
1. **Saldos e estatísticas sem as transações mais antigas** — o Supabase devolve no máximo 1000 linhas por pedido e tens 1851. Agora a app vai buscar todas, aos blocos.
2. **`/comparar` do bot a zero** em meses de 30 dias (pedia "31 de setembro" à base de dados).
3. **Privacidade no bot** — quem ainda não tinha finanças caía nas do outro no `/gastos`. Agora cada um vê só as suas.
4. **Toque duplo em "Aprovar"** podia duplicar a transação e a dívida da casa.
5. **Orçamento** passa a contar a tua parte das despesas divididas (como Painel e Estatísticas).
6. **Link de entrada (`/entrar?next=`)** fechado a um truque com tabs que levava para outro site.
7. **Função da base de dados** que copia as notas das divisões deixou de poder ser chamada de fora.
8. **Menu do bot**: a edge function antiga repunha o menu sem `/lista` e `/falta`; agora o bot repõe o certo.
9. **Ficheiros temporários com extratos** apagados e postos no `.gitignore`.

## Por decidir / próximos passos de código
- **Aprovação "tudo ou nada"** (alta): aprovar são 4 passos; se um falhar a meio fica meio feito. Proposta: passar para uma função na base de dados (uma transação só).
- **PIN de 4 dígitos** (média): dá para adivinhar em 1–2 dias com tentativas; e o bloqueio é global (bloqueia os dois). Proposta: PIN de 6 dígitos e bloqueio por pessoa, a subir com as falhas.
- **Apagar/editar uma transação dividida** não atualiza a despesa da casa (nem a linha da outra pessoa).
- **Ligação ao Claude/ChatGPT (MCP)**: o acesso dado é mais largo do que as 4 ferramentas que diz. Se não a usam, desligar.
- **Edge function antiga**: duplica ~900 linhas e já diverge. Proposta: reduzi-la só a "ler o QR de uma foto" (1 deploy, ~0,1–0,4 créditos).
- **Esquema da base de dados fora do repositório** (tabelas novas criadas por SQL): exportar para `supabase/migrations` para haver histórico.

## Produto — proposta
- **Navegação:** Início · Super · Finanças · Casa · Mais. A mobília passa para "Mais".
- **Início "Este mês":** por aprovar, quem deve a quem, gastos da casa, o que falta no super, despensa a acabar, lembretes; mobília numa linha.
- **Top ideias:** resumo do mês no Telegram (dia 1), detetor de subscrições, "dinheiro livre até ao fim do mês" (`/livre`), alertas de preço dos talões, "vai acabar" pela cadência, quem paga a próxima, garrafeira/livros (a tabela já existe).

## Kobo e Kindle — recomendação
1. **Página para o browser do leitor** (`/ecra`, sem jailbreak, 0 €, esforço pequeno): lista de compras, gastos do mês, quem deve a quem, em preto e branco e letra grande. Abre-se no browser experimental do Kindle e do Kobo.
2. **"Enviar para o Kindle"** (só Kindle, esforço médio): o bot gera um EPUB com o resumo do mês ou a lista da semana e envia para o vosso endereço @kindle.com (precisa de um serviço de email grátis, ex. Resend). Versão sem código: o bot manda o ficheiro e partilham com a app Send to Kindle.
3. **Livros**: categoria "Livros" + `/livro` no bot para gastos; destaques do Kindle (`My Clippings.txt`) e do Kobo (`KoboReader.sqlite`) só por upload — não há API oficial.
- Ecrã sempre ligado (tipo painel na parede) só com jailbreak no Kindle (e pode não existir para modelos recentes) ou NickelMenu no Kobo.
- **Preciso de saber:** o modelo de cada leitor (ex.: Kindle Paperwhite 11.ª geração, Kobo Clara BW).
