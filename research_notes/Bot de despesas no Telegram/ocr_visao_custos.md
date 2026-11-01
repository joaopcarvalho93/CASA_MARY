# Reading receipts/invoices into structured data: free OCR vs cloud OCR vs Claude vision (costs, limits, privacy, effort)

Context: two-person household, ~60 receipts/month (Portuguese supermarket/retail, thermal paper photos + some PDFs), Telegram bot on a Supabase Edge Function (Deno). Research date: 2026-09-30. Several vendor sites (supabase.com, ai.google.dev, aws.amazon.com, azure.microsoft.com, ocr.space, arxiv.org, aimultiple.com and others) were blocked by the research proxy, so some figures come from search-result snippets of those pages or from secondary sources; this is flagged inline.

## 1. Free/self-hosted OCR (Tesseract, PaddleOCR) inside a Supabase Edge Function

### Takeaway
Running Tesseract inside a Supabase Edge Function is technically possible (a Deno port exists), but the 2 s CPU-time cap and 150 MB (Free) / 256 MB (Pro) memory make it fragile for 12 MP phone photos. Tesseract's accuracy on faded thermal receipts is also poor. It gives raw text only, so you still need a parser for line items. PaddleOCR is more accurate but needs a Python server, which means separate hosting.

### Cited Findings
- Supabase Edge Function limits (from a search snippet of the official limits page, which could not be fetched directly): memory 150 MB per invocation on Free and 256 MB on Pro and above. Maximum **CPU time is 2 s** per request, which counts CPU only and excludes async I/O. Wall-clock limit is 150 s on Free and 400 s on paid plans. Request idle timeout is 150 s. Maximum function size is 20 MB when bundled locally via the CLI, or 5 MB when bundled server-side. — [Supabase Docs: Limits](https://supabase.com/docs/guides/functions/limits); related: [Understanding Edge Function CPU limits](https://supabase.com/docs/guides/troubleshooting/edge-function-cpu-limits), [wall clock time limit reached](https://supabase.com/docs/guides/troubleshooting/edge-function-wall-clock-time-limit-reached-Nk38bW)
- Supabase Edge Runtime supports npm packages via the `npm:` specifier, Node built-ins via `node:`, and deno.land/x modules. — [DEV: Using npm packages on Supabase Deno runtime](https://dev.to/yigit-konur/using-npm-packages-on-supabase-deno-runtime-4p32)
- tesseract.js wraps an emscripten (WASM) port of the Tesseract engine and runs in the browser and in Node.js. A community Deno fork exists (`tesseract.js-deno`). — [tesseract.js site](https://tesseract.projectnaptha.com/); [weston-b/tesseract.js-deno](https://github.com/weston-b/tesseract.js-deno)
- Someone has built a "document OCR edge function" in a Supabase/Deno project, which shows OCR has been attempted in this runtime. It is a PR in a small repo, not a benchmark. — [GitHub PR](https://github.com/sonavaneshubh/mota-scholarship-portal/pull/16)
- On thermal receipts the accuracy floor "hovers around 60 percent character-correct". Faded thermal prints can produce high-confidence garbage, for example reading "100,00" as "OOO OOO" at about 80 confidence. — [DEV: Vision Models for OCR, When They Beat Tesseract](https://dev.to/gabrielanhaia/vision-models-for-ocr-when-they-beat-tesseract-and-when-they-dont-54a6) (via search snippet)
- One benchmark reports a Tesseract CER of 15.56% and WER of 30.78% on the CORU receipt dataset. PaddleOCR "consistently yields the lowest error rates across all datasets", while Tesseract gives the noisiest transcripts, especially on long receipts (CORD). — [ReceiptSense, arXiv 2406.04493](https://arxiv.org/pdf/2406.04493) and [From Pixels to Pairs, arXiv 2609.17538](https://arxiv.org/pdf/2609.17538) (search snippets; PDFs not fetchable)
- "Tesseract still wins on clean printed text at scale. VLMs win on receipts, handwriting, and bad photos." Tesseract "struggled once semantic structure became important". — [DEV](https://dev.to/gabrielanhaia/vision-models-for-ocr-when-they-beat-tesseract-and-when-they-dont-54a6); [iunera: Receipt OCR with LLMs vs Tesseract](https://www.iunera.com/kraken/enterprise-ai/receipt-ocr-with-llms-vs-tesseract-what-actually-changed/) (snippets)

### Inferences
- A 2 s CPU budget is very tight for WASM Tesseract on a 1280–4032 px image. On typical hardware, recognition of a full receipt image usually takes seconds of pure CPU, so hitting the CPU limit is likely. This has not been measured here and should be benchmarked before committing. Cold-start loading of the WASM core plus the `por` traineddata also counts against the CPU and memory limits.
- tesseract.js normally spawns a Web Worker. Whether workers behave well under Supabase's edge runtime is unverified.
- Even if OCR succeeds, Tesseract returns only raw text. Extracting merchant, date, total, line items, discounts and weighted items (e.g. "0,532 kg x 2,49 €/kg") would need a custom Portuguese receipt parser that is different for each retailer layout (Continente, Pingo Doce, Lidl, Auchan, Mercadona…). This is a high implementation and maintenance effort.
- The realistic free self-hosted path is PaddleOCR on a small VPS or home server that the bot calls. That adds infrastructure the household has to maintain.

### Gaps
- No measured tesseract.js CPU times inside Supabase Edge Functions were found. The exact size of the tesseract.js WASM core and the `por` traineddata (fast vs best) was not verified.
- No Portuguese-specific receipt OCR benchmark was found.

## 2. Free tiers of cloud OCR / vision APIs

### Takeaway
At 60 receipts per month, several services would be free. Google Cloud Vision gives 1,000 units per month (raw text only). Azure Document Intelligence has 500 pages per month on F0 with a prebuilt receipt model. Mindee has about 250 pages per month, OCR.space 25,000 requests per month (raw text), and Veryfi about 100 receipts per month. The main catches are that Vision and OCR.space return text only, Textract's free tier lasts only 90 days, and the Gemini free tier may use your data to improve Google products.

### Cited Findings
**Google Cloud Vision (TEXT_DETECTION / DOCUMENT_TEXT_DETECTION)**
- The first 1,000 units per month are free. Units 1,001–5,000,000 cost $1.50 per 1,000 units, and above that $0.60 per 1,000. Each feature applied to an image is one unit, and each PDF page counts as one image. — [Google Cloud Vision pricing](https://cloud.google.com/vision/pricing) (fetched 2026-09-30)
- Returns OCR text only. It has no receipt schema, so you need your own parser.

**Azure AI Document Intelligence (prebuilt-receipt)**
- The F0 free tier gives 500 pages per month, but it analyzes only the **first 2 pages** of each document and caps files at **4 MB**. — [Microsoft Q&A](https://learn.microsoft.com/en-in/answers/questions/5927427/azure-document-intelligence-pricing); official page [azure.microsoft.com pricing](https://azure.microsoft.com/en-us/pricing/details/document-intelligence/) (not fetchable; figures from search snippets)
- Prebuilt receipt and invoice models cost about **$10 per 1,000 pages** on S0. — [Microsoft Q&A / search snippet](https://learn.microsoft.com/en-in/answers/questions/5927427/azure-document-intelligence-pricing); [DocuOCR summary](https://docuocr.com/blog/azure-document-intelligence-pricing)
- In a third-party benchmark, Azure had 87% line-item extraction accuracy, slightly ahead of Textract and Google. Its invoice field accuracy was 93%, compared with 82% for Google and 78% for AWS. — [imagetotable.ai: Google vs AWS vs Azure OCR 2026](https://imagetotable.ai/blog/google-vs-aws-vs-azure-ocr-2026) (snippet; vendor blog)

**AWS Textract AnalyzeExpense**
- The free tier is **100 pages per month for AnalyzeExpense for the first 3 months** (90 days after first use). After that it costs about **$8–$10 per 1,000 pages** (secondary sources disagree). — [Textract pricing](https://aws.amazon.com/textract/pricing/) (not fetchable); [Medium breakdown](https://medium.com/@kyandaks/amazon-textract-pricing-explained-and-how-to-track-usage-1969629dc332); [lenscopy](https://lenscopy.com/compare/aws-textract/)
- Textract and Azure return per-field confidence scores, which is useful for routing doubtful receipts to human confirmation. — [invoicedataextraction.com](https://invoicedataextraction.com/blog/invoice-ocr-accuracy-developer-guide) (snippet)

**Mindee (receipt API)**
- A free tier of **up to 250 pages per month, no credit card**, plus a 14-day trial of the receipt OCR API. Paid plans are Starter, Pro, Business and Enterprise with fixed page volumes. — [Mindee pricing](https://www.mindee.com/pricing); [Mindee receipt OCR API](https://www.mindee.com/product/receipt-ocr-api); [ERP Research review](https://www.erpresearch.com/erp-add-ons/ocr/mindee) (snippets; the exact free allowance should be confirmed on the live page)

**Veryfi**
- A free plan covering about **100 receipts plus 100 invoices per month**. One help article says 100 documents in total, so sources conflict. The API costs **$0.08 per receipt** with a **$500 per month minimum** for paid API use. — [Veryfi FAQ: free plan](https://faq.veryfi.com/en/articles/1615733-do-you-have-a-free-plan); [Veryfi OCR API plans](https://faq.veryfi.com/en/articles/3743986-what-are-the-plans-prices-for-ocr-api) (snippets)

**OCR.space**
- The free API gives **25,000 requests per month**, with a **1 MB file-size limit per image**. No registration or card is needed. Over 200 languages are claimed; Portuguese is not explicitly confirmed in the fetched material. — [OCR.space OCR API](https://ocr.space/ocrapi); [Ui.Vision forum: limits](https://forum.ui.vision/t/daily-and-monthly-limits-for-the-free-plan/22146) (snippets; page not fetchable)
- Returns raw text only, so you need your own parser. The 1 MB cap forces recompression of phone photos, which may hurt legibility on thermal receipts (inference).

**Google Gemini API (Flash / Flash-Lite)**
- On the free tier, "your data may be used to improve Google's products". Free-tier prompts, uploaded files and responses can be used and **may be read by human reviewers**. Paid-tier usage is not used to train models. — [Gemini billing docs](https://ai.google.dev/gemini-api/docs/billing); [ampm-aiops: Gemini free tier vs paid data tradeoff 2026](https://ampm-aiops.com/en/guides/gemini-free-tier-data-tradeoff-2026/) (snippets; official terms page not fetchable) — **⚠ free tier uses data for product improvement/training**
- Since 2026-04-01, Pro models are no longer on the free tier and only Flash and Flash-Lite remain free. Quoted limits are about 5–15 RPM and up to 1,000 requests per day. The Google Cloud $300 trial credit no longer applies to the Gemini API as of March 2026. — [geotoolbox Gemini pricing 2026](https://geotoolbox.ai/blog/gemini-pricing); [cloudzero](https://www.cloudzero.com/blog/gemini-pricing/) (secondary)
- Free-tier daily limits for Gemini 2.5 Flash are reported inconsistently: "cut to 20 requests/day" in one source and 500 RPD in another. Paid Gemini 2.5 Flash costs about **$0.30/M input tokens** (text, image, video) and **$2.50/M output**. — [HowToGeek](https://www.howtogeek.com/gemini-slashed-free-api-limits-what-to-use-instead/); [rapidevelopers](https://rapidevelopers.com/ai-api-limits-performance-matrix/gemini-2-5-flash); official page [ai.google.dev pricing](https://ai.google.dev/gemini-api/docs/pricing) (not fetchable) — conflicting secondary sources

**Mistral OCR**
- Mistral OCR 4 was released on 2026-06-23 and costs **$4 per 1,000 pages** ($2 in batch). Mistral OCR 3 costs $2 per 1,000 pages ($1 in batch). OCR 4 adds structured extraction with bounding boxes, block types and confidence scores. — [Mistral OCR 3 announcement](https://mistral.ai/news/mistral-ocr-3/); [Mistral pricing](https://mistral.ai/pricing/); [digitalapplied: Mistral OCR 4](https://www.digitalapplied.com/blog/mistral-ocr-4-document-ai-business-automation-2026) (snippets)

### Inferences
- At 60 receipts per month the cost ranking is: Google Vision, Azure F0, Mindee and OCR.space are all $0. Mistral OCR would cost about $0.24 per month. After their free periods, Textract and Azure S0 would cost about $0.50–$0.60 per month. Cost is not the differentiator. Output quality and implementation effort are.
- Only Azure prebuilt-receipt, Textract AnalyzeExpense, Mindee and Veryfi return **receipt-shaped JSON** (merchant, date, total, line items). Vision and OCR.space need a hand-written Portuguese parser.
- Azure's 2-pages-per-document limit on F0 does not matter for single-image receipts. The 4 MB cap does matter for original-quality photos, so resizing or JPEG compression is needed.
- Privacy: the Gemini free tier is the one clearly flagged option where data (receipt photos with the household's NIF, card digits and shopping habits) can be used for product improvement and seen by human reviewers. The paid cloud APIs (Google Cloud, Azure, AWS, Anthropic) generally do not train on customer data under commercial terms. Their exact retention periods were not all verified here (see gaps).

### Gaps
- The official Azure, AWS, OCR.space and Gemini pricing and terms pages could not be fetched, so their figures are from snippets. Exact current Gemini free-tier RPD per model and the current Flash model version (2.5 vs newer) remain unconfirmed.
- Veryfi's "free plan" may be the consumer expense app rather than API access. This needs checking.
- Retention periods for Azure DI, Textract, Mindee and OCR.space were not verified. Textract has historically offered an opt-out for AI service improvement; this was not confirmed here.
- Portuguese-language accuracy for the prebuilt receipt models (Azure lists supported locales) was not verified.

## 3. Paid LLM vision with Anthropic Claude: cost per receipt and per month

### Takeaway
Claude reads the photo or PDF directly and returns schema-validated JSON through structured outputs, so no separate OCR or parser is needed. At 60 receipts per month the estimated cost is about **$0.40–0.70 per month with Haiku 4.5**, **$0.75–1.75 with Sonnet 5 (or Sonnet 5.5)**, and **$1.90–4.35 with Opus 5** (roughly 20% less with Opus 5.5), depending on photo resolution and receipt length. The image-token formula in the brief (w×h/750, 1568 px) is outdated. The current docs use 28×28-px patches, and Claude 4.7+ models (including Opus 5 and Sonnet 5) accept up to 2576 px and 4,784 image tokens.

### Cited Findings
- **Prices (USD per million tokens, input/output):** Opus 5 $5/$25; Opus 5.5 $4/$20; Sonnet 5 $2/$10 and Sonnet 5.5 $2/$10; Haiku 4.5 $1/$5. The Batch API gives 50% off. Sonnet 5's $2/$10, announced as introductory pricing through 2026-08-31, "is now the standard price"; the planned rise to $3/$15 on 2026-09-01 "will not occur". — [Claude pricing docs](https://platform.claude.com/docs/en/about-claude/pricing) (fetched 2026-09-30)
- New API users receive "a small amount of free credits". There is no ongoing free tier. — [Claude pricing docs FAQ](https://platform.claude.com/docs/en/about-claude/pricing)
- **Image tokens:** "Each patch is a 28×28-pixel block… An image costs ⌈width/28⌉ × ⌈height/28⌉ visual tokens." The high-resolution tier ("Claude 4.7 and later models") allows a long edge of 2576 px and **4,784 visual tokens**. The standard tier ("all other models", which includes Haiku 4.5) allows 1568 px and **1,568 tokens**. Larger images are downscaled. Worked examples: a 1000×1000 image is 1,296 tokens. A 1920×1080 image is 1,560 tokens on standard and 2,691 on high-res. Per the docs, a 1000×1000 image costs about $1.30 per thousand images on Haiku 4.5 and about $6.48 per thousand on Opus 5. — [Claude Vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)
- Newer models use a different tokenizer: Claude 4.7+ models "produce approximately 30% more tokens for the same text" than Sonnet 4.6 and earlier. — [Claude pricing docs](https://platform.claude.com/docs/en/about-claude/pricing)
- Image limits: 10 MB per image (base64) on the Claude API; 8000×8000 px maximum; JPEG, PNG, GIF and WebP formats. — [Claude Vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)
- **PDF input is GA.** Each page is converted to an image and its text is also extracted. Text costs "typically 1,500–3,000 tokens per page", plus the per-page image tokens. Limits are 32 MB per request and 600 pages (100 when context is under 1M). — [Claude PDF support docs](https://platform.claude.com/docs/en/build-with-claude/pdf-support)
- **Structured outputs are GA** through `output_config.format` with a JSON schema, and are supported on Opus 5/5.5, Sonnet 5/5.5 and Haiku 4.5, among others. Unsupported schema features include numeric min/max, string length limits and `additionalProperties` other than false. — [Claude Structured outputs docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- Thinking behaviour affects output-token cost. Opus 5 runs adaptive thinking by default, and it can be disabled only at effort `high` or below. Opus 5.5 cannot disable thinking; use `low` effort instead. Haiku 4.5 does not think unless you enable it. Thinking tokens are billed as output. — Claude API skill reference, model table (2026-09-25 cache), consistent with [pricing docs](https://platform.claude.com/docs/en/about-claude/pricing)
- **Telegram input sizes:** Telegram stores photos in server-side sizes including "y" (1280×1280) and "w" (2560×2560). Photos sent as photos are compressed and re-encoded. Sending as a document/file preserves the original. — [Telegram API: Uploading and downloading files](https://core.telegram.org/api/files); [node-telegram-bot-api issue #769](https://github.com/yagop/node-telegram-bot-api/issues/769)

**Cost estimates (own calculation from the formulas above, 2026-09-30).** Assumptions: about 700 prompt and schema tokens (about 600 on Haiku's older tokenizer). Output JSON is about 800 tokens for a ~15-item receipt and about 1,800 for a ~40-item receipt. PDF page: about 2,000 text tokens plus about 2,500 image tokens. Image tokens were computed with the patch formula: a 960×1280 Telegram photo is 1,610 tokens on high-res and about 1,564 on standard; a 1920×2560 or 12 MP photo is about 4,740 on high-res and about 1,564 on standard.

| Scenario | Opus 5 | Opus 5.5 | Sonnet 5 / 5.5 | Haiku 4.5 |
|---|---|---|---|---|
| A. Typical: Telegram-compressed photo (1280 px), ~15 items | $0.032/receipt → **$1.89/mo** | $0.025 → $1.51/mo | $0.013 → **$0.76/mo** | $0.006 → **$0.37/mo** |
| B. Long: HD/original photo, ~40 items | $0.072 → $4.35/mo | $0.058 → $3.48/mo | $0.029 → $1.74/mo | $0.011 → $0.67/mo |
| C. 1-page PDF invoice | $0.051 → $3.06/mo | $0.041 → $2.45/mo | $0.020 → $1.22/mo | $0.009 → $0.55/mo |
| Add ~1,000 thinking tokens per receipt (×60) | +$1.50/mo | +$1.20/mo | +$0.60/mo | +$0.30/mo |

(Monthly figures assume 60 receipts per month. The Batch API would halve them but adds latency, which is poor UX for a chat bot.)

### Inferences
- With the brief's old formula (w×h/750 after downscaling to 1568 px), a 1280×960 photo gives about 1,638 tokens, which is close to the current figure. However, the old formula badly overstates cost for large photos if you forget the downscale cap, and understates cost on Opus 5 and Sonnet 5, which now keep up to 4,784 tokens of detail.
- Resolution tradeoff: high-res (2576 px) helps on long, narrow supermarket receipts with small print. Cropping the photo to the receipt, or letting users send "as file", gives more pixels per character. On Haiku 4.5 everything is squeezed into about 1,568 tokens, which risks illegible lines on 40+ item receipts. That makes Sonnet 5 or 5.5 the likely sweet spot.
- Even the most expensive option (Opus 5, long receipts) is under $5 per month, below one supermarket item. Cost is essentially negligible for this household, so accuracy and UX should drive the choice.
- Implementation effort is low. One HTTPS call from Deno (`npm:@anthropic-ai/sdk`) with base64 image or PDF plus a JSON schema returns parsed JSON directly. The call is async I/O, so it does not consume the Edge Function's 2 s CPU budget. Base64-encoding a few-MB image is cheap.
- Privacy: under the API's commercial terms, data is not used for training and inputs and outputs are not retained by default. Flagged content may be kept for up to 2 years. Receipts include the NIF when "contribuinte" is requested, so users may prefer to avoid free consumer tiers.

### Gaps
- Token counts are estimates. Real numbers should be measured with `count_tokens` on a sample of actual household receipts.
- No official Anthropic benchmark specific to receipts was found.

## 4. Reported accuracy: LLM vision vs OCR on receipts (long receipts, discounts, weighted items)

### Takeaway
Published comparisons consistently say that vision LLMs beat classic OCR (especially Tesseract) on receipts, bad photos and faded thermal paper. Dedicated document APIs (Azure, Textract) are strong on header fields and give confidence scores, but their line-item accuracy is lower (about 87% at best in one vendor blog). No rigorous public benchmark was found covering Portuguese receipts or specific edge cases such as discount lines and "kg × €/kg" weighted items. Treat all figures as indicative.

### Cited Findings
- Traditional extraction models (Azure DI, Google Document AI, Textract) reach 95–99% field-level accuracy. LLM vision models (GPT-4o, Claude and similar) reach 97–99% field-level accuracy on standard invoices. — [invoicedataextraction.com: Invoice OCR accuracy](https://invoicedataextraction.com/blog/invoice-ocr-accuracy-developer-guide) (snippet; vendor blog)
- Azure has 87% line-item accuracy, slightly ahead of Textract and Google Vision. "Models that read clean receipts perfectly may drop line items on dense receipts." — [imagetotable.ai 2026 comparison](https://imagetotable.ai/blog/google-vs-aws-vs-azure-ocr-2026) (snippet; vendor blog)
- An invoice benchmark by Businessware Technologies (a vendor) found that GPT-4o with a third-party OCR layer had the highest field-level accuracy. Multi-line item descriptions caused problems only for Google AI, while "AWS, Azure, GPT, Gemini, and Deepseek handled complex invoices with wrapped text flawlessly." — [Businessware: AI models invoice processing benchmark](https://www.businesswaretech.com/blog/research-ai-models-invoice-processing-benchmark); [Businessware: Textract vs Google, Azure, GPT-4o](https://www.businesswaretech.com/blog/research-best-ai-services-for-automatic-invoice-processing) (snippets; pages not fetchable)
- "On crooked photos, faded thermal receipts, unfamiliar layouts, and handwriting, a language model reads far better." The recommended 2026 pattern is a vision model as fallback on pages where Tesseract has low confidence. — [DEV: Vision models for OCR](https://dev.to/gabrielanhaia/vision-models-for-ocr-when-they-beat-tesseract-and-when-they-dont-54a6) (snippet)
- There is an open-source receipt LLM benchmark pipeline. — [ReceiptBench (GitHub)](https://github.com/trippuroskie/ReceiptBench) (not inspected)
- Claude's own docs warn it "might hallucinate or make mistakes when interpreting low-quality, rotated, or very small images", and recommend verifying outputs for tasks needing precision. — [Claude Vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)

### Inferences
- Discounts ("Desconto", "Poupança", Cartão Continente/Pingo Doce loyalty lines), weighted items ("0,532 kg x 2,49 €/kg") and multi-line product names are cases where a rule-based parser over OCR text breaks per store. An LLM with a schema can map them semantically, for example `quantity`, `unit` (kg/un), `unit_price`, `discount`, `line_total`.
- Hallucination risk is the main LLM failure mode: invented or misread numbers returned with confidence. A cheap guardrail is to check that the sum of `line_total` minus discounts equals `total` (and/or that the total matches the QR code; see section 5). Ask the user to confirm in Telegram when the check fails.

### Gaps
- No independent, peer-reviewed benchmark of Claude Opus 5, Sonnet 5 or Haiku 4.5 (or other 2026 models) on receipts with line items was found. Most comparisons are vendor blogs that could only be read as snippets.
- No data was found specifically on long (50+ line) Portuguese supermarket receipts, weighted items or loyalty discounts.

## 5. Hybrid approaches: QR code for the total + LLM for line items; OCR + deterministic parser

### Takeaway
Portuguese certified-software invoices, including supermarket "fatura simplificada" receipts, must carry an AT QR code (Portaria 195/2020). It encodes the issuer NIF, buyer NIF, date, document type/number, VAT breakdown, total tax and **gross total**, plus the ATCUD. It does **not** contain line items or the merchant name (only the NIF). Decoding it gives merchant NIF, date and total for free and deterministically. An LLM (or OCR) is then needed only when line items are wanted, and the QR total can validate the LLM output.

### Cited Findings
- The QR code must follow the technical specifications of Portaria n.º 195/2020 (13 August) and appear on documents issued by AT-certified software. — [CRN-Contabilidade: Faturas em 2026](https://crncontabilidade.pt/blog/faturas-em-2026-campos-obrigatorios-atcud-qr-code-e-como-configurar-no-software-sem-falhas/); [Jornal de Negócios: Códigos nas faturas – ATCUD e QR](https://www.jornaldenegocios.pt/opiniao/colunistas/detalhe/codigos-nas-faturas--atcud-e-qr)
- QR contents: the issuer and buyer NIF, country/fiscal space with VAT values, total tax and document totals, and the ATCUD. "The QR code contains essential invoice information, such as the NIF of the issuer and purchaser, date and value of the transaction, and the ATCUD." — [PHC Software](https://phcsoftware.com/pt/artigo/a-partir-de-janeiro-faturas-so-com-codigo-qr); [Flex Faturação](https://flexfaturacao.pt/atcud-e-qr-code-como-garantir-a-conformidade-das-suas-faturas/); AT spec PDF mirror: [Especificações Técnicas Código QR](https://www.audico.pt/wp-content/uploads/2020/08/Especificacoes_Tecnicas_Codigo_QR.pdf) (not fetchable)
- ATCUD = series validation code (at least 8 alphanumeric characters) + "-" + sequential document number. It is mandatory on every fiscally relevant document. — [search snippet summarising CRN/Winsig](https://www.winsig.pt/blog/qr-code-a-partir-de-janeiro-2021-e-atcud-a-partir-de-janeiro-2022-novidades-nas-faturas)
- Online validators exist that parse the Portuguese invoice QR and ATCUD. — [EuroCompta validator](https://eurocompta.eu/pt/validar-fatura-qr-atcud/)

### Inferences
- Suggested tiered pipeline for the bot:
  1. Decode the QR from the photo (a JS/WASM QR decoder such as jsQR or zxing-wasm is lightweight, although CPU time on a large image should be tested against the 2 s limit). Alternatively, have the user scan with the phone and send the QR text. This gives NIF, date, total and VAT deterministically at no cost.
  2. Map the issuer NIF to the merchant name with a small local table (Continente/MC, Pingo Doce/Jerónimo Martins, Lidl, etc.).
  3. Only when line items are wanted, or the QR is unreadable, call Claude (Sonnet 5 or 5.5 as the default, Haiku 4.5 as the cheap option) with a JSON schema. Validate that the sum of item totals equals the QR total.
- QR field codes (A = issuer NIF, B = buyer NIF, F = date, O = total tax, **N**/**O**/**P** for totals) are recalled from the AT spec but were **not verified**, because the spec PDF was blocked. Check the official AT spec before coding the parser.
- The OCR-plus-parser path (Google Vision free text plus regexes) costs $0. It is fine for total and date but has a high per-store maintenance cost for line items. The QR path makes it unnecessary for totals.
- Many PT retailers also email PDF invoices. Some PDFs have a text layer, so a text extractor plus the QR may be enough without vision. Otherwise Claude PDF input costs about $0.01–0.05 per page.

### Gaps
- The exact field codes and format of the AT QR string (for example `A:123456789*B:999999990*C:PT*D:FS*E:N*F:20260930*G:FS 01/123*H:ABCD1234-123*I1:PT*...*N:...*O:...*Q:hash*R:certNo`) were not verified from the official source.
- It was not verified that all supermarket thermal receipts in practice print a legible QR, or how well QR decoders cope with thermal-paper photos.
