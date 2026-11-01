# Casa Mary ligada ao Kobo e ao Kindle: opções gratuitas (pesquisa, outubro de 2026)

"Ligar ao Kobo e Kindle" pode querer dizer três coisas. Cada uma está tratada separadamente, com esforço, custo e riscos. A recomendação final está no fim.

**Sobre as fontes.** Durante a pesquisa só consegui abrir páginas do GitHub; os outros domínios (Amazon, Kobo, Readwise, Resend, Cloudflare, Hackaday, MobileRead, Instructables) não eram acessíveis. Por isso:
- Os links em "Fontes abertas" foram todos abertos e lidos.
- Afirmações marcadas com *(não verificado)* vêm de resultados de pesquisa que não consegui abrir, ou de conhecimento geral. Confirmem antes de depender delas, sobretudo preços, limites e termos das lojas.

---

## Pergunta prévia que decide muita coisa

Qual é o modelo exato e a versão de firmware de cada leitor (Definições > Informação do dispositivo)?
- No **Kindle**, a firmware decide se há jailbreak possível.
- No **Kobo**, quase tudo o que interessa funciona sem hacks, com o browser experimental.

---

## A) Leitor como ecrã e-ink da casa (lista de compras, gastos do mês, quem deve a quem)

### Visão geral das abordagens

| Abordagem | Dispositivo | Requisitos | Esforço na app | Custo | Risco |
|---|---|---|---|---|---|
| **A1. Página HTML simples no browser do leitor** | Kobo (Beta features > Web Browser) e Kindle (Experimental Browser) *(não verificado: nome dos menus e disponibilidade nos modelos recentes)* | Nenhum hack | **Pequeno** | 0 EUR | Nenhum para a garantia. Atualização só manual (recarregar a página), e o browser é lento. |
| **A2. PNG em ecrã inteiro, jailbreak Kindle (kindle-dash / Online Screensaver)** | Kindle com jailbreak | Jailbreak, USBNetwork/SSH, KUAL ou plugin de screensaver | **Médio** | 0 EUR | Jailbreak provavelmente anula a garantia. Firmwares recentes podem não ter jailbreak. |
| **A3. PNG em ecrã inteiro no Kobo (NickelMenu + FBInk, script com curl)** | Kobo | Instalar NickelMenu (cópia de `KoboRoot.tgz`), script com FBInk | **Médio** | 0 EUR | Baixo a médio. Modifica o software, mas não é um "jailbreak" no sentido do Kindle. Garantia: não confirmada. |
| **A4. KOReader** | Kindle (jailbreak) e Kobo | Instalação do KOReader | n/a | 0 EUR | Não é um ecrã de dashboard. Só traz OPDS/RSS/Calibre, ou seja, navegar para uma página ou feed. |

### A1. Página HTML para o browser do leitor (a de menor esforço)

**Como funciona.** Uma rota `/ecra?t=<token>` da app devolve HTML puro, renderizado no servidor:
- sem JavaScript, sem fontes web, sem animações;
- preto sobre branco, texto grande, largura fluida;
- `meta viewport`, e `meta refresh` opcional se a página for deixada aberta.

O leitor abre o URL (marcador guardado no browser) e mostra o conteúdo.

**Requisitos.**
- Wi-Fi no leitor.
- Nada de hacks.
- O browser dos leitores é fraco (motor antigo). Por isso: HTML/CSS básico, sem flexbox complexo e sem `position: fixed`.

**Limitações.**
- Não há "ecrã sempre ligado": é preciso abrir o browser, e o ecrã apaga-se ao fim de alguns minutos.
- Sem atualização automática fiável.
- Cada refresh de página no e-ink pisca, e a bateria gasta-se mais do que a ler.
- É ideal para "consultar a lista de compras no supermercado" ou "ver os gastos do mês" na sala, e não como moldura permanente.

**Segurança.** O URL contém dados financeiros. Usem um token longo e aleatório, `noindex`, e verifiquem no servidor (por exemplo, comparar com um segredo guardado no Cloudflare ou no Supabase). Não ponham a página atrás do login normal da app, porque o browser do leitor não lida bem com isso.

### A2. Kindle com jailbreak: PNG periódico

**Como funciona (padrão kindle-dash).**
- Um script no Kindle descarrega periodicamente um PNG de um endpoint HTTP(S), mostra-o no ecrã e volta a suspender o aparelho em RAM até à próxima atualização.
- O intervalo define-se com uma expressão cron em `local/env.sh`.
- O README diz que suspender entre atualizações é "muito eficiente em energia", mas não dá números de autonomia.
- Foi testado apenas num Kindle 4 NT; outros modelos podem precisar de ajustes.
- Precisa de SSH via USBNetwork, e traz um cliente HTTP `ht` pré-compilado porque o `curl`/`wget` do Kindle falham com HTTPS moderno.
- Licença MIT.

**Alternativa: "Online Screensaver".** O projeto `hass-lovelace-kindle-screensaver` (sibbl) mostra o padrão usado com o plugin Online Screensaver:
- PNG em escala de cinza de 8 bits;
- tamanho de ecrã configurável (exemplo 600x800);
- rotação para modo paisagem;
- contraste, níveis de preto/branco e dithering opcionais;
- responde `304 Not Modified` quando nada mudou, o que poupa transferências e piscadelas de ecrã.

Vale a pena copiar essa ideia de cache condicional.

**Jailbreak em 2026.**
- A pesquisa indica que firmwares recentes quebraram ou bloqueiam vários métodos. Uma notícia diz que, em 5 de julho de 2026, as gerações 11 ou mais recentes (Paperwhite, Colorsoft, Scribe) já podem estar numa firmware sem jailbreak conhecido *(não verificado)*. Os números de versão divergem entre fontes (5.19.2 vs 5.19.5).
- O wiki do KindleModding lista métodos (WinterBreak, AdBreak, Sanctuary, etc.) e um FAQ.
- Esse FAQ diz que o jailbreak "provavelmente" anula a garantia, que não há relatos de contas Amazon banidas, e que é preciso bloquear as atualizações OTA (modo avião ou esquecer as redes Wi-Fi). Também avisa que períodos longos em modo avião podem levar a Amazon a apagar livros sideloaded quando volta o Wi-Fi.
- Se o Kindle já atualizou sozinho para uma firmware sem método, não há nada a fazer até surgir um.

### A3. Kobo: NickelMenu + FBInk

**Como funciona.** O guia do Instructables "Kobo Weather Station" usa este padrão:
- um servidor gera uma imagem do tamanho do ecrã;
- um script no Kobo vai buscá-la periodicamente;
- o FBInk desenha a imagem no ecrã.

O FBInk é uma ferramenta GPLv3 que suporta Kobo e Kindle e desenha PNG, JPEG, etc. Só tenho este guia como resumo da pesquisa; não o abri.

O **NickelMenu** adiciona entradas de menu personalizadas ao Nickel (o software nativo) e permite lançar scripts. Instala-se copiando `KoboRoot.tgz` para a pasta `.kobo` e desinstala-se criando um ficheiro `uninstall` em `.adds/nm/`. O README no GitHub diz que a firmware 5.x ainda não é suportada, mas o aviso é vago; confirmem a versão do vosso Kobo.

**Limitação.** É um modo "mostrar imagem a pedido" (toca-se numa entrada de menu e o script corre), e não um ecrã sempre atualizado. O KOReader pode ser lançado por NickelMenu ou KFMon e lê OPDS/RSS/Calibre (ver A4), mas não tem funcionalidade de dashboard.

### Lado servidor: gerar o PNG em Cloudflare Workers

O Workers não corre Chrome headless. As alternativas são:

1. **satori + resvg-wasm.**
   - O `satori` (Vercel) converte JSX/HTML+CSS limitado em SVG. Suporta flexbox mas não tabelas nem `@font-face`, e é preciso fornecer as fontes (TTF/OTF/WOFF) como ArrayBuffer. O README só garante browser, Node e Web Workers; menciona o Cloudflare Workers como ambiente que pode restringir o carregamento dinâmico de WASM, e traz um build standalone (`satori/standalone`) para carregar o `layout.wasm` manualmente.
   - O `resvg-js` publica `@resvg/resvg-wasm` (preciso chamar `initWasm` primeiro; suporta fontes por `fontBuffers`) para converter SVG em PNG.
   - O README do resvg não fala em escala de cinza. Ou se desenha só em preto/branco/cinzas no SVG, ou se faz a conversão a 8-bit gray depois. Confirmem que o Kindle aceita o PNG (formato exato, 8-bit grayscale, sem canal alfa) *(requisito reportado por fontes secundárias da pesquisa, não verificado)*.
   - Risco prático: no plano gratuito do Workers o limite de CPU por pedido é pequeno (10 ms de CPU, segundo o meu conhecimento prévio *(não verificado)*). Renderizar PNG com WASM pode exceder. Mitigações: gerar o PNG só quando os dados mudam e guardá-lo em KV/R2/Supabase Storage, servindo depois ficheiro estático; ou renderizar fora do Worker.
2. **Renderizar fora do Worker.** Uma Supabase Edge Function (Deno) com resvg-wasm, um GitHub Actions agendado (cron) a gravar o PNG num bucket, ou qualquer máquina vossa. Qualquer um destes tem mais margem de CPU que o plano grátis do Workers.
3. **Evitar PNG.** É o caso de A1 (HTML puro), que é a solução mais simples para esta stack.

**Resolução-alvo.** Cada modelo tem a sua (por exemplo 600x800 em Kindles básicos/Kobo Clara; 1072x1448 em Kindle Paperwhite/Kobo Libra, valores do enunciado); consultem a ficha do vosso modelo e parametrizem `?w=&h=`.

**Frequência e bateria.** Atualizar uma vez de hora a hora ou a cada poucas horas, em vez de minuto a minuto. Com suspensão em RAM entre atualizações o consumo é baixo, mas o Wi-Fi ligado em cada ciclo é o que mais gasta. Devolver 304 quando nada mudou evita redesenhos.

---

## B) Ler dados do leitor para a app (leituras, destaques, gastos em livros)

Não existe API oficial pública nem do Kindle nem do Kobo para destaques ou histórico de leitura *(não encontrei nenhuma; não verifiquei os termos de serviço da Amazon/Kobo)*. As vias práticas exigem USB ou carregar um ficheiro.

### B1. Kindle: `My Clippings.txt`
- Fica na raiz do Kindle quando ligado por USB. Contém destaques, notas e marcadores.
- **Como funciona.** O utilizador carrega o ficheiro numa página da app (upload) e o servidor processa-o.
- **Parsers existentes** (para copiar a lógica ou usar como referência):
  - `kindle-hl2fr` (Rust, GPL-3.0): lê `My Clippings.txt`, deduplica, devolve JSON com `documentTitle` e `clippings` (`content`, `kind`, `locationOrPage`).
  - Resultados de pesquisa não abertos: `myclippings` (PyPI, só inglês e espanhol) e `klipper` (PyPI). Nenhum cobre português à partida, e o formato do ficheiro varia com o idioma do Kindle (cabeçalhos "Seu destaque"/"A sua nota" em PT). Contem escrever um parser pequeno em TypeScript e testá-lo com um ficheiro real vosso.
- **Esforço: médio.** Custo: 0 EUR. Risco: nenhum para garantia nem termos.
- **Notebook da Amazon** (`read.amazon.com/notebook`): é uma página web, sem API. Raspá-la com credenciais é frágil e provavelmente contra os termos *(não verificado)*. Não recomendo.

### B2. Kobo: `KoboReader.sqlite`
- Fica em `<volume Kobo>/.kobo/KoboReader.sqlite` quando ligado por USB. A tabela `Bookmark` tem `Text` (destaque), `Annotation` (nota), `DateCreated`, `ContentID`, `VolumeID`, `ChapterProgress`, `Hidden`, `Type`.
- A estrutura não é documentada pela Kobo; foi obtida por engenharia inversa.
- Projetos de referência: `kobo-highlights-to-calibre` (mostra o esquema) e `kobo-bookmark` (aplicação estática que lê o ficheiro no browser; exporta para Notion/Markdown). Os resultados de pesquisa também mencionam extratores em PyPI (não abertos) e dizem que `VolumeID` varia entre livros comprados (UUID) e carregados (caminho de ficheiro).
- **Como funciona.** O utilizador carrega o `.sqlite` e a app lê-o. Um SQLite pode ser lido no browser com sql.js/WASM sem enviar o ficheiro inteiro ao servidor, o que também protege a privacidade.
- **Esforço: médio.** Custo: 0 EUR.

### B3. KOReader (ambos os leitores, se instalado)
O plugin `exporter.koplugin` tem alvos `json`, `markdown`, `html`, `text`, `my_clippings`, `readwise`, `joplin`, `nextcloud` e `xmnote` (lista da pasta `target/`, que pode estar incompleta). Se algum dos dois usar KOReader, o alvo `json` é o formato mais fácil de importar. KOReader no Kindle exige jailbreak; no Kobo basta NickelMenu ou KFMon.

### B4. Readwise
Agrega destaques de Kindle, Kobo, etc. mas é um serviço pago após um período de teste *(não consegui abrir a página; confirmem o preço atual)*. A API do Readwise só serviria se já fossem clientes. Para um casal que quer gastar 0 EUR, é preferível o upload de ficheiro.

### B5. Compras de livros (gastos)
- A forma mais barata de acompanhar gastos em livros é **registá-los no módulo de despesas que já existe**, com uma categoria "Livros". Por exemplo, um comando do bot de Telegram `/livro 9.99 Título` ou o formulário normal.
- Importar recibos por email (Amazon/Kobo) é possível mas frágil: os formatos mudam, é preciso acesso ao Gmail (OAuth) e a app não tem recebimento de email configurado. **Não recomendo** para já.
- Os destaques e as compras não têm ligação automática entre si; cada livro seria uma linha com título, preço e destaques.

---

## C) Enviar coisas da app para o leitor

### C1. Kindle: "Enviar para Kindle" por email
- Cada Kindle tem um endereço `nome@kindle.com`. O remetente tem de estar na lista "Approved Personal Document E-mail List" da conta Amazon, senão a Amazon rejeita.
- **Formatos.** A Amazon aceita EPUB e PDF por email; deixou de aceitar MOBI/AZW em agosto de 2022 *(fontes da pesquisa, não abertas)*. Os limites de tamanho (50 MB por email segundo uma fonte) variam consoante o método; confirmem na ajuda da Amazon.
- **Custo.** Gratuito. Entregar para `@free.kindle.com` evita custos de roaming em Wi-Fi/3G, mas num Kindle só Wi-Fi a diferença é irrelevante *(não verificado)*.
- **Esforço: médio.** A app não tem envio de email. Precisa de:
  1. gerar o documento (EPUB ou PDF);
  2. um serviço de envio de email.

  Opções gratuitas: **Resend** (tem plano gratuito, que segundo o meu conhecimento ronda os 3.000 emails/mês e 100/dia, mas não consegui abrir a página, confirmem) com chamada HTTP simples a partir de um Worker e suporte a anexos; ou SMTP/Gmail com palavra-passe de aplicação (mais fiddly em Workers).
  Para Resend é preciso verificar um domínio vosso para enviar de um endereço próprio; sem domínio, só dá para testar enviando para o email do dono da conta *(não verificado)*.
- **Gerar EPUB em Worker.** Um EPUB é um zip de XHTML. Com `fflate` ou `JSZip` faz-se em poucas dezenas de linhas, e o reflow fica melhor em e-ink do que um PDF. É mais leve em CPU do que gerar PDF.
- **Risco.** Termos da Amazon: documentos pessoais são para uso próprio; um email semanal de documentos vossos não levanta problemas *(não verificado)*. O risco é apenas o remetente na lista de aprovados (mantenham-na restrita).
- **Truque sem código.** O bot de Telegram envia o ficheiro; no telemóvel partilham-no com a app "Send to Kindle" da Amazon. Sem email, sem servidor de envio, sem custo.

### C2. Kobo
- Não encontrei um equivalente oficial a "enviar por email" para Kobo em 2026. A pesquisa só mostrou:
  - a integração oficial **NetGalley > Kobo** (2025), que só envia ARCs em EPUB e não serve para documentos próprios;
  - o site de terceiros `send.djazz.se`, que (segundo um blogue de fevereiro de 2026) mostra um código de quatro dígitos no Kobo e deixa carregar um ficheiro de outro dispositivo *(não aberto, é de terceiros; não enviem dados sensíveis por aí)*;
  - o antigo `sendtokobo.com` (2014, estado desconhecido).
- **Instapaper.** A Kobo substituiu o Pocket pelo Instapaper numa atualização de firmware gratuita em 2025, e não é preciso ter Premium *(fontes da pesquisa, não abertas)*. Daria para a app guardar uma página no Instapaper, mas isso exige integração com a API deles (OAuth/xAuth), e o ganho é pequeno.
- **Dropbox/Google Drive no Kobo.** Não consegui confirmar uma integração nativa para documentos próprios. Não contem com isso sem verificar no vosso modelo.
- **Alternativas reais.** (i) USB: copiar um EPUB para o Kobo (grátis, manual); (ii) Calibre; (iii) com KOReader, o cliente OPDS/Calibre sem fios; (iv) A1 acima (página no browser).

---

## Recomendação: as duas opções com mais valor e menos esforço

### 1.ª: Página `/ecra` em HTML simples (A1), esforço **pequeno**, serve Kobo e Kindle
Valor imediato (lista de compras, gastos do mês, quem deve a quem) sem hacks, sem garantia em risco e sem custos.

**Esboço de implementação (TanStack Start + Cloudflare Workers + Supabase).**
1. Criar uma rota de servidor (por exemplo `src/routes/ecra.tsx` ou uma rota de API que devolve `text/html`), com loader que verifica `?t=` contra um segredo (variável de ambiente `ECRA_TOKEN`, comparação em tempo constante).
2. No loader, ler do Supabase com a service role (só no servidor): itens da lista de compras por comprar, total do mês por categoria, saldo entre os dois.
3. Devolver HTML mínimo: `<meta name="viewport" content="width=device-width">`, `<meta name="robots" content="noindex">`, CSS inline (preto/branco, `font-size` 20-24 px, sem JS). Opcional: `<meta http-equiv="refresh" content="900">`.
4. Cabeçalhos: `Cache-Control: private, max-age=60`. Teste primeiro no browser do telemóvel com a janela estreita, depois no leitor.
5. Guardar como marcador no browser do Kobo (Beta features) e no browser experimental do Kindle.
6. Extensão futura (A2/A3), se quiserem um ecrã permanente: a mesma rota passa a servir `/ecra.png?w=1072&h=1448` com satori + resvg-wasm, **com a imagem guardada em cache** (Supabase Storage ou KV) e atualizada só quando os dados mudam, para ficar dentro dos limites de CPU do Worker. No Kindle precisa de jailbreak (kindle-dash ou Online Screensaver), no Kobo de NickelMenu + FBInk.

### 2.ª: Relatório/lista em EPUB por "Enviar para Kindle" (C1), esforço **médio**, só Kindle
Útil se quiserem ler no Kindle a lista de compras semanal ou o relatório mensal.

**Esboço.**
1. Endpoint `POST /api/enviar-kindle` (protegido) que gera o EPUB (XHTML + zip com `fflate`) a partir de dados do Supabase.
2. Enviar com Resend (`fetch` para a API com o EPUB em base64 como anexo) para `nome@kindle.com`, a partir de um remetente que adicionaram à lista de aprovados da Amazon.
3. Disparo: comando `/enviar` no bot de Telegram (o bot já existe) e/ou um cron do Cloudflare (Cron Triggers) ao domingo.
4. Guardar `KINDLE_EMAIL` e `RESEND_API_KEY` como segredos do Worker.
5. Mais simples ainda para arrancar: o bot envia o EPUB/PDF por Telegram e partilham-no manualmente com a app Send to Kindle, sem Resend.

### Para depois (sem urgência)
- **Gastos em livros (B5):** categoria "Livros" nas despesas + comando `/livro` no Telegram (esforço pequeno).
- **Destaques (B1/B2):** upload de `My Clippings.txt` ou de `KoboReader.sqlite` (esforço médio), só se realmente quiserem guardar destaques na app.

### O que evitaria
Raspar o notebook da Amazon, importar recibos por email, usar Readwise (pago) e jailbreak do Kindle como primeiro passo.

---

## Fontes abertas (todas lidas durante a pesquisa)

- pascalw/kindle-dash: https://github.com/pascalw/kindle-dash
- sibbl/hass-lovelace-kindle-screensaver: https://github.com/sibbl/hass-lovelace-kindle-screensaver
- NickelMenu: https://github.com/pgaskin/NickelMenu
- FBInk: https://github.com/NiLuJe/FBInk
- KOReader: https://github.com/koreader/koreader
- Instalação do KOReader no Kobo: https://github.com/koreader/koreader/wiki/Installation-on-Kobo-devices
- Instalação do KOReader no Kindle: https://github.com/koreader/koreader/wiki/Installation-on-Kindle-devices
- Plugin de exportação do KOReader (pasta `target/`): https://github.com/koreader/koreader/tree/master/plugins/exporter.koplugin/target
- Wiki KindleModding (repositório): https://github.com/KindleModding/kindlemodding.github.io
- FAQ de jailbreak do KindleModding: https://github.com/KindleModding/kindlemodding.github.io/blob/main/content/jailbreaking/jailbreak-faq.md
- Pós-jailbreak (KPM, KOReader): https://github.com/KindleModding/kindlemodding.github.io/blob/main/content/jailbreaking/whats-next/_index.md
- satori: https://github.com/vercel/satori
- resvg-js: https://github.com/yisibl/resvg-js
- kobo-highlights-to-calibre: https://github.com/valeriangalliat/kobo-highlights-to-calibre
- kobo-bookmark: https://github.com/huybn5776/kobo-bookmark
- kindle-hl2fr: https://github.com/fauu/kindle-hl2fr

## Informação vinda só de resultados de pesquisa (não abertos; sem link de propósito)
- Guia Instructables "Kobo Weather Station" (Kobo + FBInk), notícias Hackaday de julho de 2026 e Liliputing sobre jailbreak e firmware, post da Five Filters sobre EPUB no Send to Kindle, ajuda da Kobo sobre NetGalley, notícias sobre Instapaper no Kobo, post do `send.djazz.se`.
- Preços e limites de Resend, Readwise e do plano gratuito do Cloudflare Workers, e os nomes dos menus dos browsers dos leitores: confirmar antes de implementar.
