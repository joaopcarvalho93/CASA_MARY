# Community / practitioner experience: Telegram and WhatsApp bots for household expense logging

> **Read this first. Source-access limitation (research date 2026-09-30):** reddit.com was unreachable from this research environment. The search tool refuses the domain ("not accessible to our user agent"), and WebFetch and curl were both blocked by the egress proxy. news.ycombinator.com, medium.com, dev.to, daddaops.com and investmentmoats.com were also blocked for full-page fetches. So **no Reddit comment could be read or quoted directly**, and HN threads show up only as titles or snippets in search results. The practitioner evidence below comes from GitHub issues and PRs (fully readable), search-result snippets of blogs and HN (flagged "snippet only"), and open-source project READMEs. Treat anything marked "snippet only" as lower confidence. A human checking the Reddit threads by hand is still worthwhile (see Gaps).

## 1. Which bots or self-hosted setups do people actually use, and why do they stick with them or abandon them?

### Takeaway
The common DIY pattern is a Telegram bot as the "quick-capture" front end, writing into something else: Google Sheets most of all, then Firefly III, with n8n and LLM workflows being the 2025–2026 trend. The appeal is lower friction than opening a budgeting app. The main reported reason for abandoning a tool is friction in manual entry or import. Telegram expense bots for couples are now also a commercial category.

### Cited Findings
- Firefly III has several community Telegram bots. Telefly III takes "`5 Coffee with friends`" (amount + description) and then asks for destination account, category and budget. cyxou/firefly-iii-telegram-bot also manages accounts, categories and reports. There are further bots from may-cat and a Docker image rja96/fireflyiii-telegram-bot (amd64/arm64). — [Firefly III docs: third-party apps](https://docs.firefly-iii.org/references/firefly-iii/third-parties/apps/); [OpenHub Telefly III](https://openhub.net/p/telefly-iii); [cyxou bot](https://github.com/cyxou/firefly-iii-telegram-bot); [may-cat bot](https://github.com/may-cat/firefly-iii-telegram-bot); [Docker Hub rja96](https://hub.docker.com/r/rja96/fireflyiii-telegram-bot)
- n8n publishes a template for "Record transactions & generate budget reports with Gemini AI, Telegram & Firefly III". This is evidence that "LLM parses the chat message → finance backend" has become a standard recipe. — [n8n workflow 11339](https://n8n.io/workflows/11339-record-transactions-and-generate-budget-reports-with-gemini-ai-telegram-and-firefly-iii/)
- Many open-source bots are "Telegram → Google Sheets": pavelmakis/telexpense (expenses, income, transfers between accounts into a Sheet), javis86/MyFinancialBot ("zero-cost, serverless"; free-text or receipt photo → Gemini extracts fields → Google Sheet), muety/telegram-expense-bot, DollarBot and MyDollarBot (command-based, stored locally). — [telexpense](https://github.com/pavelmakis/telexpense); [MyFinancialBot](https://github.com/javis86/MyFinancialBot); [muety/telegram-expense-bot](https://github.com/muety/telegram-expense-bot); [DollarBot](https://github.com/ymdatta/DollarBot)
- Blogger setup: an Investment Moats post (Singapore personal-finance blog) describes logging spending through a Telegram chat into a Google Spreadsheet that feeds an envelope-style budget. (Title and snippet only; the page was blocked.) — [Investment Moats](https://investmentmoats.com/money/log-spending-google-spreadsheet-bot-actual-budget-envelope-system/)
- Couple use case: a Medium post (Bootcamp, dated around April 2026 per the search snippet) describes building "Penny", a Telegram bot for the author and her husband. Messages like "coffee $5" go into a shared Google Sheet. (Snippet only.) — [Medium: I Built an Expense-Tracking Bot on Telegram](https://medium.com/design-bootcamp/i-built-an-ai-expense-tracking-bot-on-telegram-264d089d4fae)
- HN "Show HN: ExpenseOwl – Simple, self-hosted expense tracker" (Feb 2025): the snippet says it prefills transaction titles from the most common entry for a category and guesses categories from titles. Reducing typing is the design goal. (Snippet only.) — [HN 42977388](https://news.ycombinator.com/item?id=42977388)
- An older HN thread, "I got control of my spending with some no-code services and 100 lines of Python" (2019), is a long-standing reference for the "chat capture + script" approach. Its contents could not be read. — [HN 19833881](https://news.ycombinator.com/item?id=19833881)
- Friction as the reason for dropping a tool: a 2026 review says Firefly III has no automatic bank import (download a CSV or OFX, then upload it) and that "if that friction stops you from tracking, you should use a tool with direct sync." — [expensesorted.com Firefly III review 2026](https://www.expensesorted.com/blog/147_firefly_iii)
- The commercial market in 2026 includes Smart Budget ("shared family & personal finance in Telegram with AI", line-by-line receipt scanning, web dashboard), Cointry (group-chat budgeting: add the bot to a shared group and everyone logs), Auritrack and TeleExpense Tracker (daily streaks, Sheets sync). — [smartbudget-bot.com](https://smartbudget-bot.com/); [cointry.io](https://cointry.io/); [Moneko "Best Telegram Bots for Budgeting in 2026"](https://moneko.io/blogs/telegram-bots-budgeting-2026); [TeleExpense](https://teleexpense.vercel.app/)
- The Telegram Bot API costs nothing: no per-message or monthly API fees. — [Botract 2026 pricing guide](https://www.botract.com/blog/telegram-bot-cost-pricing-guide)

### Inferences
- The recurring success pattern is **capture in chat, review elsewhere**: the bot does quick entry, and a sheet or dashboard does analysis. For CASA_MARY this maps to Telegram → Supabase plus a separate view (web page or Sheet export).
- "Streaks" and "daily reminders" in commercial bots suggest that habit decay, not tooling, is the main risk of abandonment. This is an inference from product features, not a measured result.
- Firefly III's bots use a multi-step dialog (amount → account → category → budget). Given the friction complaints, a single-message capture with smart defaults is probably better for a two-person household.

### Gaps
- No Reddit threads (r/selfhosted, r/FireflyIII, r/ActualBudget, r/personalfinance, r/budget) could be read, so there are no first-hand "I stopped using X because…" quotes. I found no Actual Budget-specific Telegram bot in accessible sources.
- No Supabase-specific personal expense-bot write-ups were found.

## 2. Free text vs. commands vs. receipt photos: friction points

### Takeaway
The 2025–2026 trend is clearly away from rigid `/add 5 food` commands and toward **free text parsed by an LLM**, with photos and voice as secondary inputs. Practitioners who scoped carefully argue that a photo or OCR flow is often *not* faster than typing an amount, because the user still has to check the number.

### Cited Findings
- Examples of the free-text pattern: Telefly III ("5 Coffee with friends"), Penny ("coffee $5"), and MyFinancialBot (free-form text or photo → Gemini). — [OpenHub Telefly III](https://openhub.net/p/telefly-iii); [Medium Penny (snippet)](https://medium.com/design-bootcamp/i-built-an-ai-expense-tracking-bot-on-telegram-264d089d4fae); [MyFinancialBot](https://github.com/javis86/MyFinancialBot)
- n8n workflow sellers pitch "turn daily voice notes or texts into structured finance records", with an OpenAI agent extracting date, place and amount into a Google Sheet. Voice is increasingly a first-class input. — [Gumroad n8n expense tracker](https://krisograbek.gumroad.com/l/ai-agent-n8n-workflow-expense-tracker); [ExpenseBot on Indie Hackers ("text or voice message what you spent")](https://www.indiehackers.com/post/expensebot-track-business-expenses-via-telegram-0020c6897f)
- The DollarBot and MyDollarBot generation used "simple commands" instead (older, command-driven design). — [DollarBot](https://github.com/ymdatta/DollarBot)
- A GitHub design discussion (echoshihtw/runway #267) closed a "universal capture button" because it was "more work than tapping a preset and typing an amount". It also closed an OCR fallback because "its own criterion concedes the owner still reads and confirms the number". It chose deterministic fiscal-QR parsing where a standard exists, and named Portugal's ATCUD QR as a candidate. — [runway issue #267](https://github.com/echoshihtw/runway/issues/267)

### Inferences
- For a two-person household: make free text the default ("12.40 pingo doce", "luz 63"), keep a few explicit commands for corrections (`/undo`, `/edit`) and summaries, and treat photos as optional enrichment rather than the main path.
- Always echo back what was parsed (amount, category, who paid) with one-tap correct or undo buttons. This mitigates both LLM mis-parses and the "still have to confirm" problem.

### Gaps
- No quantitative data on how long each input mode takes or how many people drop it, and no Reddit anecdotes about command vs. free-text fatigue.

## 3. Receipt OCR / LLM vision: accuracy, cost, failure modes

### Takeaway
Vision LLMs get most things right on clean photos, but their errors are *confident and large*: made-up prices, phantom items from discount lines, and doubled totals. Most of the risk sits in supermarket loyalty and discount layouts and long receipts split into parts. Totals are much more reliable to extract than line items. Where a fiscal QR code exists (Portugal), practitioners prefer decoding it deterministically over OCR.

### Cited Findings
- Snippet (source is either a Substack "state of the vision and ocr models" or a dev.to post; exact attribution not verifiable because pages were blocked): Claude 3.5 Sonnet and GPT-4o get "approximately 90% of items and prices right". When they fail, the failures are major: "Claude may hallucinate product text identifiers it can't decipher, and GPT-4o may hallucinate prices." — [thedanktoday Substack](https://thedanktoday.substack.com/p/state-of-the-vision-and-ocr-models); [dev.to receipt OCR API on a vision-LLM](https://dev.to/donrtowery/im-building-a-receiptinvoice-ocr-api-on-a-vision-llm-heres-the-why-and-the-schema-46c)
- HN comment headline: "LLM based OCR is a disaster, great potential for hallucinations and no estimate [of confidence]…" (2025; only the title/snippet was accessible). This is the sceptic camp's core argument: no per-field confidence. — [HN 43283483](https://news.ycombinator.com/item?id=43283483)
- **Discount-line failure mode (well documented):** kitchen-erp issue #64 (28 Sep 2026). Loyalty-card receipts print each discounted item as three rows (paid price, shelf "Regular Price", card saving). The parser treated "Regular Price" rows as items, so **a 5-item receipt became 14 lines and roughly doubled the total**. On long receipts read in sections, a footer "YOUR SAVINGS / Card Savings 8.67" was parsed as three separate discounts. Proposed fixes: a deterministic post-processing regex to drop `regular|was|orig price` rows, vendor-specific parsers, and synthetic test fixtures. — [kitchen-erp #64](https://github.com/jdmacleod/kitchen-erp/issues/64)
- A snippet from a 2026 blog/vendor page (unverified; unclear which of the search results it came from) says about 97% field-level accuracy on clean, well-lit photos, falling to about 85–90% for crumpled or folded receipts, with errors like "$3.99" read as "$9.99", plus thermal-fade problems. Treat as indicative, not measured. — [ReceiptSync blog](https://receiptsync.net/blog/how-openai-gpt-powers-receipt-scanners); [DadOps "Using LLMs to Parse Grocery Receipts"](https://daddaops.com/blog/llm-receipt-parser/)
- Cost gotcha (snippet): GPT-4o-mini charged a fixed ~2,833 tokens per image vs ~765 for GPT-4o at low detail, so "mini" was *not* cheaper for vision. This refers to the 2024–2025 pricing era; check current pricing for whatever model is chosen. — [Towards Data Science: OCR + GPT-4o mini](https://towardsdatascience.com/how-to-effortlessly-extract-receipt-information-with-ocr-and-gpt-4o-mini-0825b4ac1fea/)
- Practitioners are still switching models for receipt reading in 2026 (e.g. a PR "Read receipts with gpt-5.4 instead of gpt-4o"), which suggests accuracy is still seen as model-dependent. — [TallyBillMobile PR #89](https://github.com/mimifishman/TallyBillMobile/pull/89)
- A classic OCR limitation is item and price columns misaligning on crumpled receipts, which pairs items with the wrong prices. — [ReceiptSense dataset paper (arXiv 2406.04493)](https://arxiv.org/pdf/2406.04493)
- Portugal-specific best practice from an open-source project: yeer0s/recibosegarantia uses **QR decoding as the primary path** ("instant, deterministic") and OCR only as a fallback for pre-2022 or faded thermal receipts. It extracts NIFs, date, document number, ATCUD and the full IVA breakdown by region (Continente/Açores/Madeira). It explicitly refuses to infer product type because the QR standard has no such field, and it processes everything offline for privacy. — [recibosegarantia](https://github.com/yeer0s/recibosegarantia)

### Inferences
- For CASA_MARY, use this order: (1) decode the Portuguese QR (exact total, IVA, merchant NIF, date); (2) use a vision LLM only for the merchant name or category if needed; (3) extract line items only on explicit request, with a sanity check that the sum of lines ≈ QR total. The QR total gives a free ground truth for catching LLM hallucinations.
- Always store the photo and let the user confirm the amount. Never auto-commit an LLM-extracted amount silently.

### Gaps
- No Reddit or HN first-hand reports on Portuguese supermarket receipts specifically (Continente, Pingo Doce, Lidl PT), and no measured per-receipt cost figures from 2026 models.

## 4. Telegram vs WhatsApp: setup burden, bans, cost

### Takeaway
Telegram is close to frictionless (a free BotFather token, no phone number, no fees). WhatsApp's official Cloud API needs a Meta Business account and app, a dedicated number, and template rules outside a 24-hour window. The unofficial libraries (Baileys, whatsapp-web.js) risk bans, and ban waves reportedly got worse in late 2025.

### Cited Findings
- WhatsApp Cloud API needs a Facebook App and a Meta Business Account, with you as admin of both. Test numbers allow at most 5 recipients. Free-form messages are only allowed inside a 24-hour customer-service window opened by the user; outside it, pre-approved templates are required. — [Meta: WhatsApp Cloud API Get Started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started); [Helpwise setup doc](https://docs.helpwise.io/articles/223933-setup-shared-whatsapp-cloud-inbox-in-helpwise); [respond.io Cloud API help](https://respond.io/help/whatsapp/whatsapp-cloud-api)
- HN comment headline: "Yeah, it's way harder to do bots for Whatsapp. Twillio has an API for it though." There is also a 2026 HN post "WhatsApp Business API pricing 2026: what's free and where markup hides". (Titles only.) — [HN 38928821](https://news.ycombinator.com/item?id=38928821); [HN 48504753](https://news.ycombinator.com/item?id=48504753)
- **Baileys bans:** GitHub issue #1869 (5 Oct 2025) reports five bot accounts banned within one week, each in about 9 groups, on Baileys v7.0.0-rc.5 and v6.7.19. Two accounts had run for more than 3 years without a ban. The reporter notes WhatsApp was "resorting to bans even against those who don't use bots." — [Baileys #1869](https://github.com/WhiskeySockets/Baileys/issues/1869)
- Snippet from Baileys #1925 ("Ban"): numbers banned after the bot posted in groups; after switching to whatsapp-web.js "none of the numbers got banned". This is a single anecdote and may not last. — [Baileys #1925](https://github.com/WhiskeySockets/Baileys/issues/1925)
- Community bot repos built on Baileys warn that misuse can ban your account and that "your WhatsApp account can be unbanned only once." — [Knightbot-MD](https://github.com/jithuyt507-coder/Knightbot-MD)
- WhatsApp-to-Sheets expense bots do exist in the community (e.g. RemmiV1 on dev.to). — [dev.to WhatsApp expense bot](https://dev.to/chrollolw/i-built-a-whatsapp-bot-that-automatically-tracks-your-expenses-into-google-sheets-my-first-public-33ii)

### Inferences
- For a private two-user bot, Telegram is the pragmatic choice. WhatsApp only makes sense if one partner refuses Telegram. In that case the official Cloud API with a dedicated number is the only non-ban-risky route, and the 24-hour-window rule would limit proactive reminders or monthly summaries unless templates are approved.
- Never run an unofficial WhatsApp library on either partner's personal number. A ban would take out their main messenger.

### Gaps
- No verified 2026 per-conversation prices for Portugal on the WhatsApp Cloud API (the HN pricing post was inaccessible), and no Reddit ban anecdotes for low-volume, 1:1, personal-use bots specifically (all ban reports found involve groups or volume).

## 5. Shared expenses between partners via a bot (who paid, splitting)

### Takeaway
Two workable patterns show up: (a) a **shared Telegram group** containing both partners and the bot, where each person logs and the sender's identity automatically records who paid; (b) both partners DM the same bot, which writes to one shared ledger (e.g. one Google Sheet). Commercial products (Cointry, Smart Budget) now sell exactly this for couples.

### Cited Findings
- Cointry supports group-chat budgeting: add the bot to a shared Telegram group and everyone logs their expenses. — [Moneko 2026 ranking](https://moneko.io/blogs/telegram-bots-budgeting-2026); [cointry.io](https://cointry.io/)
- Smart Budget markets itself as "Shared Family & Personal Finance in Telegram with AI". — [smartbudget-bot.com](https://smartbudget-bot.com/)
- The Penny bot (a couple, shared Google Sheet) uses one sheet as the single ledger for both partners (snippet). — [Medium Penny](https://medium.com/design-bootcamp/i-built-an-ai-expense-tracking-bot-on-telegram-264d089d4fae)
- A Lemon8 comparison of Telegram expense bots highlights "multiplayer tracking so couples or housemates can easily share expenses" as a deciding feature (snippet). — [Lemon8 post](https://www.lemon8-app.com/@youthmoneymojosg/7498311525296390672?region=sg)
- Group-chat caveat: see Q6. Privacy mode hides ordinary group messages from the bot unless it is disabled or the bot is an admin. — [TeleMe privacy-mode article](https://www.teleme.io/articles/group_privacy_mode_of_telegram_bots?hl=en)

### Inferences
- For CASA_MARY: map `from.id` (Telegram user ID) to a person, so "who paid" comes free. Store a split rule per expense (default 50/50, overridable, e.g. "só meu") and compute a running balance ("João deve 23,40 € à Mary"), like Splitwise.
- A group chat gives both partners visibility of each entry, which is a social nudge to keep logging. DMs are more private but less visible to each other. A group is likely the better default for a couple, provided privacy mode is handled.

### Gaps
- I found no first-hand Reddit accounts (e.g. r/personalfinance couples threads) comparing a bot with Splitwise or Tricount for couples, or saying why couples abandon shared tracking.

## 6. Telegram-specific pitfalls (webhook retries, privacy mode, token leaks, rate limits)

### Takeaway
The best-documented pitfall is **duplicate processing from webhook retries**: if the handler doesn't return HTTP 200 quickly (slow LLM or OCR call, cold start), Telegram re-sends the update, sometimes dozens of times. The standard fixes are to acknowledge immediately and process asynchronously, and to dedupe on `update_id`. Privacy mode silently hides group messages.

### Cited Findings
- grammY docs (snippet): once Telegram re-sends an update after a timeout, the retry is unlikely to be faster, so it times out again and "your bot [sees] the update not just two times, but a few dozen times". The fix is to pass `"return"` (not the default `"throw"`) as `onTimeout` in `webhookCallback`. — [grammY: Long Polling vs Webhooks](https://grammy.dev/guide/deployment-types)
- Real incident: openclaw issue #16763 (15 Feb 2026). The webhook handler used grammY's default 10 s timeout while LLM + tool processing took 30–60+ s. This caused cascading 500s, 7 failures in about 6 minutes with increasing backoff (~10 s, 12 s, 14 s, 18 s), and a "Wrong response from the webhook: 500" error. The fix was `onTimeout: "return"`: return 200 and continue in the background. — [openclaw #16763](https://github.com/openclaw/openclaw/issues/16763)
- Telegraf issue #806 (Nov 2019): "the same update gets processed over and over again" when the 200 acknowledgement isn't sent. The proposal was optional dedupe by `update_id` over a window (default 24 h), stored as intervals since IDs are auto-incrementing. — [telegraf #806](https://github.com/telegraf/telegraf/issues/806)
- Serverless cold starts (snippet): "a serverless bot wakes slowly and the update comes back 502 or times out before the handler is ready". Recommended pattern: return 200 first, then queue the work. — [HookWatch: Telegram webhooks](https://hookwatch.dev/use-cases/telegram-webhooks); [dev.to "Your Telegram bot replies twice? It's timing"](https://dev.to/lamas51/your-telegram-bot-replies-twice-its-timing-not-a-logic-bug-2f4j)
- Privacy mode: new bots are in privacy mode by default and don't receive all group messages. Disable it with `/setprivacy` in BotFather, then **remove and re-add the bot** to existing groups (a step many people miss). Alternatively, make the bot a group admin. — [TeleMe](https://www.teleme.io/articles/group_privacy_mode_of_telegram_bots?hl=en); [NVIDIA NemoClaw #4068 (undocumented remove/re-add requirement caused silent failures)](https://github.com/NVIDIA/NemoClaw/issues/4068)
- Telegraf.js was described as not actively maintained; grammY was chosen as the maintained alternative (snippet, 2025–2026 blog). — [flashblaze: Cloudflare Workers + grammY](https://flashblaze.xyz/posts/cloudflare-workers-durable-objects-telegram-bot/)

### Inferences
- For Supabase Edge Functions: verify the `X-Telegram-Bot-Api-Secret-Token` header, insert the raw update with a UNIQUE constraint on `update_id` (idempotency), return 200 immediately, and do LLM or OCR work asynchronously (e.g. a queue table plus a background worker or `EdgeRuntime.waitUntil`). Also dedupe expenses on (chat_id, message_id), and on ATCUD for QR receipts. The Invoice2GDrive PR uses ATCUD as the duplicate key ([Invoice2GDrive PR #4](https://github.com/neteinstein/Invoice2GDrive/pull/4)).
- Whitelist the two Telegram user IDs. Anyone who finds the bot's username can message it.

### Gaps
- I found no practitioner discussion of bot-token leaks (e.g. tokens committed to GitHub) or of hitting Telegram rate limits. At two-user volume, rate limits are very unlikely to matter, but this is unsourced here.

## 7. Portugal-specific discussion (e-fatura, QR code on invoices, expense tracking)

### Takeaway
I could not access Reddit Portugal discussions (r/portugal, r/literaciafinanceira, r/PortugalExpats). The Portuguese ecosystem does offer two strong building blocks. The **mandatory fiscal QR code** (Portaria 195/2020; fields A–S with NIFs, date, ATCUD, IVA breakdown, totals) can be decoded deterministically, and open-source projects already do this. **e-Fatura CSV exports** are used by Portuguese tools for after-the-fact household analysis.

### Cited Findings
- The QR is mandatory on Portuguese invoices and encodes fields labelled A to S (issuer and buyer NIF, date, doc type, ATCUD, IVA base and tax by rate and region, total, hash chars). — [Storecove: Portugal ATCUD & QR guide](https://www.storecove.com/blog/en/portuguese-invoice-qr-and-atcud-codes/); [Faturiza: ATCUD and invoice QR codes](https://faturiza.com/blog/atcud-qr-code-invoices-accountant-processing); [fiskaly 2026 explainer](https://www.fiskaly.com/blog/fiscalization-atcud-qes-in-portugal)
- ATCUD = the series validation code (issued by AT) + "-" + the sequential document number, which makes it unique per document. — [Storecove](https://www.storecove.com/blog/en/portuguese-invoice-qr-and-atcud-codes/)
- recibosegarantia (open source, Portugal) uses QR-first decoding with OCR fallback only for pre-2022 or faded thermal receipts, validates against AT's worked examples, and rejects business invoices. — [recibosegarantia](https://github.com/yeer0s/recibosegarantia)
- neteinstein/Invoice2GDrive PR #4 (merged 28 Sep 2026) goes QR → photo → Google Sheets + Drive. It parses the AT QR, validates NIF check digits and totals (flags but does not block), rejects non-Portuguese invoices, flags missing ATCUDs, caches merchant names per NIF, uses ATCUD for duplicate detection, and falls back to manual entry or pasted QR text. Scanners: ML Kit (Android), AVFoundation (iOS), BarcodeDetector/jsQR (web). — [Invoice2GDrive PR #4](https://github.com/neteinstein/Invoice2GDrive/pull/4)
- Library for the QR format (generation side, useful as a spec reference): joaomfrebelo/at_qrcode. — [at_qrcode](https://github.com/joaomfrebelo/at_qrcode)
- Portuguese tools analyse the e-Fatura CSV export. Otimiza takes the CSV (multiple NIFs of a household can be zipped together) and suggests IRS category re-classification. Xatura does photo-of-talão OCR (store, amount, date) with Excel export in its Pro tier. — [Otimiza e-Fatura guide](https://otimiza.pt/guia-efatura); [Xatura: organizar faturas Continente](https://www.xatura.pt/guias/organizar-faturas-continente); [saftparaexcel e-fatura CSV](https://saftparaexcel.pt/e-fatura-csv-para-excel/)

### Inferences
- Merchant NIF (field A) plus a cached NIF→merchant name and category mapping gives automatic categorisation after the first occurrence. The QR does not include the merchant *name*, so the first time needs user input or an LLM guess. This matches Invoice2GDrive's "cache merchant names per NIF".
- Decoding the QR from a Telegram photo server-side (e.g. zxing or pyzbar) avoids LLM cost and hallucination for the total and IVA. Telegram compresses photos, so small QR codes on long receipts may not decode; encourage "send as file" or a close-up of the QR. This is not verified in sources and should be tested.
- A monthly e-Fatura CSV import could reconcile bot-logged expenses against AT's record. The two NIFs would need separate exports.

### Gaps
- **No r/portugal, r/literaciafinanceira or r/PortugalExpats threads could be accessed.** I have no direct evidence of what Portuguese users say about expense tracking habits, e-Fatura accuracy, or apps they prefer.
- No sourced data on how reliably Telegram-compressed photos preserve the Portuguese QR, or on the share of small-merchant receipts that lack a readable QR.
