# Código QR das faturas portuguesas (AT): conteúdo, parsing e descodificação gratuita em Deno / Supabase Edge

Research date: 2026-09-30. Research environment note: the egress proxy for this session **blocked** portaldasfinancas.gov.pt, dre.pt, supabase.com, nif.pt, ec.europa.eu (VIES), storecove.com and several vendor sites. The official AT spec, the Portaria and the Despacho were therefore read from **verbatim PDF copies** that ship in the open-source repo `joaomfrebelo/at_qrcode` (`documentation/Especificacoes_Tecnicas_Codigo_QR.pdf`, `Portaria_195_2020.pdf`, `Despacho_SEAAF_412_2020_XXII.pdf`). The Portaria copy is AT's own "Legislação" reprint (DSCPAC letterhead). The spec copy is AT's "Versão 1.0, 13-08-2020". Where I rely on search-engine snippets that I could not open, I say so.

Some claims were tested locally with Node 22: parsing the spec's worked examples, and decoding with zxing-wasm, `qr` and jsQR. Those tests are labelled **[tested locally]**.

---

## 1. Legal basis: what is mandatory, since when, on which documents

### Takeaway
Decreto-Lei n.º 28/2019 created the QR code and the ATCUD. Portaria n.º 195/2020 (13 Aug 2020) regulates them. The QR code became mandatory in practice on **1 Jan 2022**, after a COVID postponement from 2021. The ATCUD was optional in 2022 and has been mandatory since **1 Jan 2023**. The QR is required on all invoices and other fiscally relevant documents issued by AT-certified invoicing software. That covers FT, FS, FR, NC/ND, and also pro-formas and transport documents in the spec's own examples. Supermarket receipts from LIDL, Continente, Pingo Doce and IKEA therefore carry it.

### Cited Findings
- Portaria n.º 195/2020, de 13 de agosto, was published in Diário da República n.º 157/2020, Série I, 2020-08-13, pp. 13-15. Its object is to regulate "os requisitos de criação do código de barras bidimensional (código QR) e do código único do documento (ATCUD), a que se refere o n.º 3 do artigo 7.º do Decreto-Lei n.º 28/2019". AT's reprint lists "Histórico de alterações: –" (no amendments). — [AT reprint of Portaria 195/2020, copy in joaomfrebelo/at_qrcode](https://github.com/joaomfrebelo/at_qrcode/tree/master/documentation)
- Art. 6.º(1): the QR code "deve constar obrigatoriamente nas faturas e outros documentos fiscalmente relevantes, emitidos por programas certificados pela AT, nos termos do artigo 4.º do Decreto-Lei n.º 28/2019". Art. 6.º(3): on multi-page documents it may appear on the first or last page. — [Portaria 195/2020 (AT reprint)](https://github.com/joaomfrebelo/at_qrcode/tree/master/documentation)
- Art. 5.º: the QR must follow "especificações técnicas definidas pela Autoridade Tributária e Aduaneira, a disponibilizar no Portal das Finanças". — [Portaria 195/2020](https://github.com/joaomfrebelo/at_qrcode/tree/master/documentation)
- Art. 3.º, ATCUD composition: a series validation code assigned by AT (minimum 8 characters), then "-", then the document's sequential number. For software, the sequential number is the digits right after the "/" in the SAF-T document ID. — [Portaria 195/2020](https://github.com/joaomfrebelo/at_qrcode/tree/master/documentation)
- Art. 4.º: the ATCUD is printed as «ATCUD:CodigodeValidação-NumeroSequencial». It is mandatory on every invoice and fiscally relevant document, whatever processing method was used (software, other electronic means, pre-printed forms from authorised printers). On multi-page documents it appears on every page, "imediatamente acima do código de barras bidimensional". — [Portaria 195/2020](https://github.com/joaomfrebelo/at_qrcode/tree/master/documentation)
- Art. 8.º: the Portaria's original entry into force was 1 Jan 2021, with a series-communication transition from 1 Dec 2020. — [Portaria 195/2020](https://github.com/joaomfrebelo/at_qrcode/tree/master/documentation)
- In practice the QR became mandatory on 1 Jan 2022. Under Despacho SEAAF n.º 351/2021-XXII (10/11 Nov 2021) the ATCUD was optional in 2022 and mandatory from 1 Jan 2023. — [Cegid Vendus](https://www.vendus.pt/blog/atcud-codigo-unico-documentos/); [Softpack](https://softpack.pt/faturacao-qrcode-nas-faturas-em-2022-e-atcud/); [Saphety](https://saphety.com/blog/atcud-obrigatoriedade-a-partir-de-dia-1-de-janeiro-2023); [Winsig](https://www.winsig.pt/blog/qr-code-a-partir-de-janeiro-2021-e-atcud-a-partir-de-janeiro-2022-novidades-nas-faturas) (vendor and secondary sources; I could not open the Despacho 351/2021 text itself)
- AT's stated purpose for the QR is to simplify how individuals report invoices for IRS deductible expenses, and to fight the informal economy and fraud. — [AT spec v1.0, §1](https://github.com/joaomfrebelo/at_qrcode/tree/master/documentation)
- A 2026 vendor guide still lists ATCUD and the QR among the mandatory invoice fields. — [CRN-Contabilidade, "Faturas em 2026"](https://crncontabilidade.pt/blog/faturas-em-2026-campos-obrigatorios-atcud-qr-code-e-como-configurar-no-software-sem-falhas/) (search snippet only)

### Inferences
- Any receipt from a large retailer issued since 2022 should carry the QR, because large retailers use certified software. Manual or pre-printed invoices, such as those from tiny businesses, may lack a QR but still carry the ATCUD. OCC has a note on "QR code em faturas manuais" that I did not open.
- The printed "ATCUD: XXXXXXXX-NNNN" line is an OCR/text anchor that exists even when the QR is unreadable.

### Gaps
- I could not open diariodarepublica.pt to confirm whether Portaria 195/2020 was amended after 2020. AT's reprint says "no amendments", but that reprint dates from 2020.
- I could not access portaldasfinancas.gov.pt to check for a spec version newer than **1.0 (13-08-2020)**. None of the sources I found mentioned a newer version. Treat v1.0 as current unless you confirm otherwise on the Portal.
- I could not open the Despacho 351/2021-XXII text. The 2022/2023 dates come from multiple consistent vendor sources.

---

## 2. Exact QR content format (official AT "Especificações Técnicas – Código QR", v1.0, Aug 2020)

### Takeaway
The QR payload is plain text of `CODE:value` pairs joined by `*`. The fields always come in the fixed order A…S. Money values use `.` as the decimal separator, always have 2 decimals and have no thousands separator. The date is `YYYYMMDD`. Optional fields are omitted when empty. Field S may contain `;` but never `*`.

### Cited Findings (all from the AT spec PDF, [copy in joaomfrebelo/at_qrcode](https://github.com/joaomfrebelo/at_qrcode/tree/master/documentation), unless noted)

**Symbol parameters (§2):** ECC level "M"; mode Byte; 2 dots per module; minimum version v=9; image at least 30x30 mm; margin 0.25 cm.

**Message rules (§3):**
- a) Each field is `Código` + `:` + value, with no spaces.
- b) Fields are concatenated with `*`, always in the table order.
- c) The decimal separator is `.`. Monetary fields always have 2 decimals.
- d) Fields marked `+` are mandatory. e) Fields marked `++` are optional but must be present whenever the information exists. f) An optional field with no information must not be created.
- g) At least one tax region (I1/J1/K1) must always exist. h) A document with no VAT rate indicated that belongs in SAF-T table 4.2/4.3/4.4 uses `I1:0`.
- i) Maximum lengths apply (see the table). j) Elements inside field `S` are joined with `;`.

**Field table (§4):**

| Code | Meaning (PT, official) | Max len | Mandatory | Official example |
|---|---|---|---|---|
| A | NIF do emitente (no country prefix) | 9 | + | `A:123456789` |
| B | NIF do adquirente; `999999990` for "Consumidor final" | 30 | + | `B:999999990` |
| C | País do adquirente (SAF-T Customer Country) | 12 | + | `C:PT` |
| D | Tipo de documento (SAF-T typology) | 2 | + | `D:FT` |
| E | Estado do documento (SAF-T typology) | 1 | + | `E:N` |
| F | Data do documento, `YYYYMMDD` | 8 | + | `F:20191231` |
| G | Identificação única do documento (SAF-T InvoiceNo) | 60 | + | `G:FT AB2019/0035` |
| H | ATCUD | 70 | + | `H:CSDF7T5H-0035` |
| I1 | Espaço fiscal (SAF-T TaxCountryRegion), or `0` if no VAT rate | 5 | + | `I1:PT` |
| I2 | Base tributável isenta de IVA (incl. Imposto do Selo ops) | 16 | ++ | `I2:12000.00` |
| I3 | Base tributável à taxa reduzida | 16 | ++ | `I3:15000.00` |
| I4 | Total IVA à taxa reduzida | 16 | ++ | `I4:900.00` |
| I5 | Base tributável à taxa intermédia | 16 | ++ | `I5:50000.00` |
| I6 | Total IVA à taxa intermédia | 16 | ++ | `I6:6500.00` |
| I7 | Base tributável à taxa normal | 16 | ++ | `I7:80000.00` |
| I8 | Total IVA à taxa normal | 16 | ++ | `I8:18400.00` |
| J1–J8 | Same as I1–I8 for a 2nd tax region (example PT-AC, Azores) | 5/16 | ++ | `J1:PT-AC` … |
| K1–K8 | Same as I1–I8 for a 3rd tax region (example PT-MA, Madeira) | 5/16 | ++ | `K1:PT-MA` … |
| L | Não sujeito / não tributável em IVA (total) | 16 | ++ | `L:100.00` |
| M | Imposto do Selo (total) | 16 | ++ | `M:25.00` |
| N | Total de impostos = VAT + Stamp duty (SAF-T TaxPayable) | 16 | + | `N:64000.02` |
| O | Total do documento com impostos (SAF-T GrossTotal) | 16 | + | `O:513600.58` |
| P | Retenções na fonte (SAF-T WithholdingTaxAmount) | 16 | ++ | `P:100.00` |
| Q | 4 caracteres do Hash (per Portaria 363/2010) | 4 | + | `Q:kLp0` |
| R | Nº do certificado do software (AT) | 4 | + | `R:9999` |
| S | Outras informações, free text, e.g. payment info (IBAN / Ref MB) joined with `;`, no `*` | 65 | ++ | `S:TB;PT000…;513500.58` or `S:MB;entidade;referência;valor` |

- Note on the brief: the task brief listed "P, Q = hash chars". Per the official table, **P = withholding tax (retenções na fonte)** and **Q = 4 hash characters**. There are also **J1–J8 (2nd region), K1–K8 (3rd region), L (not subject), M (stamp duty)**. The brief's other codes match the spec.
- The spec does not say that the I block means mainland, J the Azores and K Madeira. Those region codes appear only in the examples (`J1:PT-AC`, `K1:PT-MA`), and the rule says the codes are simply "espaços fiscais". A parser should read the region from I1/J1/K1 rather than assume it.

**Official example strings (verbatim from §5; the PDF wraps lines, joined here):**
- Example 2, Fatura simplificada (the closest to a supermarket receipt):
  `A:123456789*B:999999990*C:PT*D:FS*E:N*F:20190812*G:FS CDVF/12345*H:CDF7T5HD-12345*I1:PT*I7:0.65*I8:0.15*N:0.15*O:0.80*Q:YhGV*R:9999*S:NU;0.80`
  (141 characters, QR version 9, 53x53 modules, 30.162 mm)
- Example 1, Fatura with all three regions plus IBAN:
  `A:123456789*B:999999990*C:PT*D:FT*E:N*F:20191231*G:FT AB2019/0035*H:CSDF7T5H-0035*I1:PT*I2:12000.00*I3:15000.00*I4:900.00*I5:50000.00*I6:6500.00*I7:80000.00*I8:18400.00*J1:PT-AC*J2:10000.00*J3:25000.56*J4:1000.02*J5:75000.00*J6:6750.00*J7:100000.00*J8:18000.00*K1:PT-MA*K2:5000.00*K3:12500.00*K4:625.00*K5:25000.00*K6:3000.00*K7:40000.00*K8:8800.00*L:100.00*M:25.00*N:64000.02*O:513600.58*P:100.00*Q:kLp0*R:9999*S:TB;PT00000000000000000000000;513500.58`
  (452 characters, QR version 17)
- Example 3, Pró-forma: `A:500000000*B:123456789*C:PT*D:PF*E:N*F:20190123*G:PF G2019CB/145789*H:HB6FT7RV-145789*I1:PT*I2:12345.34*I3:12532.65*I4:751.96*I5:52789.00*I6:6862.57*I7:32425.69*I8:7457.91*N:15072.44*O:125165.12*Q:r/fY*R:9999`
- Example 4, Guia de transporte (not valued): `A:500000000*B:123456789*C:PT*D:GT*E:N*F:20190720*G:GT G234CB/50987*H:GTVX4Y8B-50987*I1:0*N:0.00*O:0.00*Q:5uIg*R:9999`
- Values can contain spaces (G: `FS CDVF/12345`) and `/` (Q: `r/fY`). A parser must split on `*` and then on the **first** `:` only, and must not strip internal spaces.

**SAF-T code lists used by D and E (secondary source):**
- D, InvoiceType values: FT = Fatura, FS = Fatura simplificada, FR = Fatura-recibo, ND = Nota de débito, NC = Nota de crédito. The spec examples also show PF (pró-forma) and GT (guia de transporte).
- E, InvoiceStatus values: N = Normal, T = Por conta de terceiros, A = Anulado, F = Faturado, R = Resumo.
- Sources: [PHC SAF-T doc](http://phc.pt/portal/sug/ptxview.aspx?ptxid=20347648); [GOBL pt-saft](https://docs.gobl.org/addons/pt-saft-v1). I relied on the search summary; the official XSD at [portaldasfinancas SAF-T 1.04_01 XSD](https://info.portaldasfinancas.gov.pt/apps/saft-pt04/saftpt1.04_01.xsd) was blocked. For an expense tracker, NC (credit note, i.e. a refund) and E=A (cancelled) are the important cases to handle.

**[tested locally] Arithmetic reconciliation of the official examples.** I parsed examples 1–3 with the parser in section 3:
- N = sum of IVA (I4+I6+I8+J4+J6+J8+K4+K6+K8) + M. This holds exactly: 64000.02, 0.15, 15072.44.
- O = sum of bases (x2+x3+x5+x7 for each region) + L + N. This holds exactly: 513600.58, 0.80, 125165.12. P (withholding) is **not** subtracted from O.
- An independent Python project reports the same reconciliation logic. — [yeer0s/recibosegarantia](https://github.com/yeer0s/recibosegarantia)

### Inferences
- `S:NU;0.80` in the FS example most likely means payment in *numerário* (cash) of 0.80. The spec defines only TB (transferência bancária/IBAN) and MB (Multibanco reference) in its instructions, so treat S as free text. **Not verified.**
- The spec doesn't map "reduzida / intermédia / normal" to percentages. For mainland PT these are commonly 6% / 13% / 23%. Azores and Madeira have their own lower rates. **Not verified in this session.** Derive the effective rate as IVA ÷ base when you need it.
- The pair `A` (issuer NIF) + `G` (document ID), or simply `H` (ATCUD), is a natural **unique key for de-duplicating** receipts in the database. The ATCUD is unique per document by design (series code + sequential number).

### Gaps
- There is no official description of S sub-codes beyond TB and MB.
- I could not confirm whether real retailers (LIDL, Continente, Pingo Doce) put anything in S. Capture a real QR from each to check.

---

## 3. What you can and cannot get from the QR (total, date, merchant, VAT, items)

### Takeaway
The QR gives the **total paid (O)**, **date (F)**, **merchant NIF (A)**, buyer NIF (B), document type and number (D, G), ATCUD (H), and the **full VAT breakdown by rate band and tax region** (I/J/K, plus L, M and N). It does **not** contain the merchant's name, its address, the time of day, line items or the payment method. The only exception is when the issuer chooses to put payment info in S.

### Cited Findings
- None of the 30+ fields in the official field table is a merchant name, an item, a quantity or a unit price. The only free field is S (65 chars max). — [AT spec v1.0 §4](https://github.com/joaomfrebelo/at_qrcode/tree/master/documentation)
- The QR code "contém os principais elementos de uma fatura, embora não contenha a discriminação de cada produto adquirido". — [Doutor Finanças](https://www.doutorfinancas.pt/carreira-e-rendimentos/introducao-do-codigo-qr-obrigatorio-conheca-as-novas-regras-nas-faturas/) (search snippet)
- An independent project states there is no field for item types "not in Portaria 195/2020, not anywhere". It decodes NIFs, date, document number, ATCUD, the full IVA breakdown for I/J/K, M, P and totals, and has no merchant-name mapping. — [yeer0s/recibosegarantia](https://github.com/yeer0s/recibosegarantia)
- The open-source Android app CajuScan extracts value, date and merchant NIF. It resolves names **locally**: it saves each merchant NIF, lets the user attach a name and category, and suggests them on the next scan. It is offline, with no external lookup. — [marotoweb/cajuscan_app](https://github.com/marotoweb/cajuscan_app)

### Merchant name from NIF: options
- **Local mapping table** (recommended, free, what CajuScan does). A few NIFs cover most household spending. Example from a real LIDL receipt: "LIDL & Cia", NIF **503340855**, printed in the receipt header. — CajuScan approach: [cajuscan_app](https://github.com/marotoweb/cajuscan_app)
- **NIF.PT webservice**. It is free after you request a key by form and confirm it by email. The free quota is **1000 requests/month, 100/day, 10/hour, 1/minute**, and more can be bought as paid credits. It can search companies and validate any national NIF. — [nif.pt/api](https://www.nif.pt/api/), [nif.pt/contactos/api](https://www.nif.pt/contactos/api/) (from search snippets; the site was blocked, so I could not read the response fields)
- **EU VIES**. The SOAP service `checkVatService` (also a REST endpoint) takes country code + VAT number and returns valid, name and address. Each member state controls what it returns. Portuguese data "is available" but "the system is regularly overloaded during business hours". — [vatverify.dev VIES guide](https://www.vatverify.dev/guides/vies-api-guide); [VATify.eu Portugal](https://www.vatify.eu/portugal-vat-number.html) (secondary sources). **Not verified**: I tried a live VIES query for 503340855 and the proxy blocked it. VIES only covers VAT-registered entities, and supermarkets are.
- **Scrape-style sites** (contribuinte.pt, validarnif.pt, racius, etc.) exist, but I found no documented free API for them. — [contribuinte.pt](https://contribuinte.pt/posts/consultar-nif-empresa-portugal-2026) (snippet)

### Inferences
- A sensible design: look up the NIF in a local `comerciantes(nif, nome, categoria_default)` table first. If it's missing, optionally call VIES (free, no key) or NIF.PT (free key, 1/min limit), cache the result in the table, and let the user rename the merchant via the bot.
- The **time of purchase is not in the QR**, only the date. If you need the time, you would need OCR of the printed receipt; LIDL receipts print e.g. "31.08.26 20:15" next to the ATCUD line.
- For **categorisation** there is a free signal: the VAT band split. Most of a supermarket receipt at the reduced rate means food. Mostly normal rate means non-food or household. This is a heuristic, not verified. Line items can only be recovered by OCR of the receipt text, or from the PDF text for e-invoices (see section 6).
- `B` shows whether the user's own NIF was put on the invoice (B ≠ 999999990). That is useful for the IRS / e-fatura deduction flag.

### Gaps
- I could not verify the exact response schema of the NIF.PT API or VIES for PT numbers.

---

## 4. QR decoding libraries for Deno / Supabase Edge (no native deps) and how to feed them a Telegram photo

### Takeaway
The best fit is **`zxing-wasm`** (ZXing-C++ compiled to WebAssembly). Its `readBarcodes()` accepts **raw JPEG/PNG bytes** (`Uint8Array`, `ArrayBuffer` or `Blob`) directly. You don't need canvas or a separate image decoder, and it officially supports Deno. The best pure-JS fallback is **`qr`** (paulmillr, zero-dep, on npm and JSR). It needs RGBA pixels, so pair it with `jpeg-js` or `imagescript`. **jsQR** works but is unmaintained and was the weakest in my test.

### Cited Findings
- **zxing-wasm** (latest 3.1.4, published 2026-09-10, MIT) is "ZXing-C++ WebAssembly as an ES/CJS module with types. Read or write barcodes in various JS runtimes: Web, Node.js, Bun, and Deno". `readBarcodes` accepts "an image Blob, image File, ArrayBuffer, Uint8Array, or an ImageData", with options such as `tryHarder`, `formats: ["QRCode"]` and `maxNumberOfSymbols`. The reader-only wasm is about 1.04 MiB. By default the .wasm is fetched from jsDelivr; override it with `prepareZXingModule({ overrides: { locateFile | wasmBinary } })`. — [npm registry: zxing-wasm](https://registry.npmjs.org/zxing-wasm), [GitHub Sec-ant/zxing-wasm](https://github.com/Sec-ant/zxing-wasm)
- **qr** by paulmillr (npm `qr` 0.7.2, 2026-09-28; JSR `@paulmillr/qr`; MIT OR Apache-2.0): a zero-dependency QR generator and reader. The README claims it "decodes 58% of BoofCV photo vectors" and is "faster than zxing-wasm". Outside browsers you must "decode image files to RGBA with any image library and pass `{ width, height, data }` to `decodeQR`". Tiny 1px/module images must be upscaled at least 2x. — [npm registry: qr](https://registry.npmjs.org/qr), [GitHub paulmillr/qr](https://github.com/paulmillr/qr)
- **jsQR** 1.4.0 (last release 2021-04-24, Apache-2.0, zero deps) is a "pure javascript QR code reading library that takes in raw images". It needs an RGBA `Uint8ClampedArray` plus width and height. — [npm: jsqr](https://registry.npmjs.org/jsqr), [cozmo/jsQR](https://github.com/cozmo/jsQR)
- **@zxing/library** 0.23.0 (2026-04-29) is a TypeScript port of ZXing. Its browser helpers assume a DOM; in a server you feed it a luminance source yourself. — [npm: @zxing/library](https://registry.npmjs.org/@zxing/library)
- **rxing-wasm** 0.5.8 (2026-09-16) provides wasm bindings of the Rust ZXing port for decode and encode. — [npm: rxing-wasm](https://registry.npmjs.org/rxing-wasm) (not tested)
- **qr-scanner** 1.4.2 (2022) is browser/camera oriented, using a Web Worker and OffscreenCanvas. It is not suited to Deno server use. — [npm: qr-scanner](https://registry.npmjs.org/qr-scanner), [nimiq/qr-scanner](https://github.com/nimiq/qr-scanner)
- **Pixel decoders without canvas**: `jpeg-js` 0.4.4 (pure JS JPEG encoder/decoder, BSD-3), `pngjs` 7.0.0 (pure JS), and `imagescript` 1.3.1 (zero-dependency image manipulation, AGPL-3.0-or-later OR MIT; decodes and resizes JPEG/PNG and does crop and grayscale). — [npm: jpeg-js](https://registry.npmjs.org/jpeg-js), [npm: pngjs](https://registry.npmjs.org/pngjs), [npm: imagescript](https://registry.npmjs.org/imagescript)
- **Supabase Edge limits** (from search snippets; supabase.com was blocked): about **2 s of CPU time per request**, memory reported as 256 MB (another source says 150 MB on Free and 256 MB on Pro), and wall clock 150 s (Free) or 400 s (paid). "Only WASM-based libraries are supported" for image processing, so native libraries like Sharp are out. `npm:` specifiers are resolved at deploy time. — [Supabase Docs: Limits](https://supabase.com/docs/guides/functions/limits); [Supabase Docs: CPU limits](https://supabase.com/docs/guides/troubleshooting/edge-function-cpu-limits); [Supabase Docs: Image manipulation](https://supabase.com/docs/guides/functions/examples/image-manipulation); [WebVerse Arena 2026](https://www.webversearena.com/blog/supabase-edge-functions-production-guide-2026) (secondary)

**[tested locally] Synthetic "phone photo" benchmark (Node 22, not Deno).** I rendered the official FS example QR (ECC M) into a 1200x1600 "thermal paper" scene with uneven lighting, Gaussian-ish noise, reduced contrast and rotation, then saved it as JPEG at quality 55. I ran zxing-wasm on the **JPEG bytes directly**, and `qr` and jsQR on RGBA from `jpeg-js`:

| module px | noise | contrast | rotation | jsQR | qr (paulmillr) | zxing-wasm |
|---|---|---|---|---|---|---|
| 8 | low | high | 0° | ok | ok | ok |
| 6 | high | medium | 7° | **fail** | ok | ok |
| 4 | very high | low | 15° | fail | fail | fail |
| 3 | high | medium | 5° | fail | ok | ok |

This is a small synthetic test (n=4, no blur or perspective), so it shows a trend and is not a benchmark. It confirms that zxing-wasm can take JPEG bytes directly with no image library, and that jsQR is the least robust.

### Inferences / implementation recipe (Supabase Edge, Deno)
1. **Telegram**: in the webhook update, take `message.photo[message.photo.length - 1].file_id` (the largest size), call `getFile`, then fetch `https://api.telegram.org/file/bot<TOKEN>/<file_path>` to get the JPEG bytes.
   - Telegram recompresses "photos". When the user sends the image **as a file/document**, the original resolution is preserved, which helps a lot with long thermal receipts. In that case read `message.document`. This is based on my general knowledge of the Telegram Bot API and was not re-verified in this session.
2. **Decode**:
   ```ts
   import { readBarcodes, prepareZXingModule } from "npm:zxing-wasm@3/reader";
   // optional: pin the wasm instead of the jsDelivr default
   // prepareZXingModule({ overrides: { locateFile: (p, pre) => p.endsWith(".wasm") ? `https://cdn.jsdelivr.net/npm/zxing-wasm@3.1.4/dist/reader/${p}` : pre + p }, fireImmediately: true });
   const res = await readBarcodes(jpegBytes, { formats: ["QRCode"], tryHarder: true, maxNumberOfSymbols: 1 });
   const raw = res.find(r => r.text?.startsWith("A:"))?.text;
   ```
   My tested Node version used `prepareZXingModule({ overrides: { wasmBinary } })` with the .wasm read from `node_modules`. In Deno you can do the same with `Deno.readFile`, or let it fetch from jsDelivr.
3. **Fallbacks when nothing is found**: (a) decode pixels with `imagescript` or `jpeg-js`, convert to grayscale, and increase contrast. (b) Try several downscales (e.g. longest side 2000 / 1400 / 1000 px). Phone photos are often 12 MP, and large images cost CPU against the ~2 s budget. (c) The QR is usually at the bottom of a receipt, so crop the bottom 40–50% and retry. (d) Pass the same RGBA through `qr`'s `decodeQR`. (e) If all fail, ask the user in the bot to re-send a closer photo of the QR, or to send it as a file.
4. **Parse** (tested against official examples 1–3):
   ```ts
   export function parseATQR(raw: string) {
     const s = raw.trim();
     if (!/^A:\d{9}\*B:/.test(s)) return null;           // not an AT invoice QR
     const f: Record<string,string> = {};
     for (const part of s.split("*")) { const i = part.indexOf(":"); if (i > 0) f[part.slice(0,i)] = part.slice(i+1); }
     const n = (k: string) => f[k] ? Number(f[k]) : 0;
     const region = (p: "I"|"J"|"K") => f[p+"1"] && f[p+"1"] !== "0" ? {
       region: f[p+"1"], isenta: n(p+"2"),
       reduzida: { base: n(p+"3"), iva: n(p+"4") }, intermedia: { base: n(p+"5"), iva: n(p+"6") },
       normal: { base: n(p+"7"), iva: n(p+"8") } } : null;
     const d = f.F;
     return { nifEmitente: f.A, nifAdquirente: f.B, pais: f.C, tipoDoc: f.D, estado: f.E,
       data: d ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : null, docId: f.G, atcud: f.H,
       regioes: (["I","J","K"] as const).map(region).filter(Boolean), naoSujeito: n("L"), impostoSelo: n("M"),
       totalImpostos: n("N"), total: n("O"), retencao: n("P"), hash4: f.Q, certificado: f.R, outras: f.S ?? null };
   }
   ```
   - Sanity checks: `N ≈ ΣIVA + M` and `O ≈ Σbases + L + N`, within ±0.01. For credit notes (D = NC), store a negative amount. Ignore or flag E = A (cancelled).
   - To validate NIF A, use the mod-11 check digit (weights 9..2). pt-fiscal implements this.
5. **CPU budget**: zxing-wasm instantiation plus one decode of a ~1–2 MP image should fit inside 2 s CPU. **Not measured in Deno/Supabase**; benchmark on the real platform. Downscale before multi-pass retries.

### Gaps
- I did not run anything inside Deno or on Supabase itself (no Deno binary; supabase.com was blocked). Deno support is per the zxing-wasm README. Test the Supabase deployment and cold start with the `npm:` import.
- I found no public benchmark on **real thermal-receipt photos**. The table above is synthetic. Known practical problems on real receipts: faded thermal print, curl and crease, glare, and the small 30 mm QR in a 12 MP photo of a long receipt. Cropping and downscaling help.

---

## 5. Existing open-source parsers and apps

### Takeaway
Several open-source parsers exist. In TypeScript: `luis-gouveia/invoice-qr-decoder`, `marcelogdomingues/pt-fiscal` (builder and validators), and snippets inside ERP repos. Others are in Dart, Python, C#, Go and PHP. AT's official **e-fatura** app scans the QR to register invoices. None is a dominant, widely used npm package, so writing the ~20-line parser yourself (section 4) is reasonable. Copying from these repos is also fine.

### Cited Findings
- **luis-gouveia/invoice-qr-decoder** (TypeScript, MIT) decodes Portuguese invoice QR codes per DL 28/2019 and the AT spec. Its API is `isValid(data)` and `decode(data)`, returning a structured object; it also has a CLI. The npm name is not stated in the README. — [GitHub](https://github.com/luis-gouveia/invoice-qr-decoder)
- **marcelogdomingues/pt-fiscal** (TypeScript, MIT, zero-dependency, npm `pt-fiscal`) covers NIF, IBAN, postal codes, ATCUD and `buildInvoiceQRCode(data)`, which builds the `A:…*B:…` payload. It validates structure and check digits but does not check that a NIF exists. — [GitHub](https://github.com/marcelogdomingues/pt-fiscal)
- **yeer0s/recibosegarantia** (Python, offline, no deps) decodes the mandatory QR, reconciles against AT's four worked examples, and falls back to OCR only for pre-2022 receipts. — [GitHub](https://github.com/yeer0s/recibosegarantia)
- **marotoweb/cajuscan_app** (Flutter/Dart Android, on F-Droid, 21★) scans AT invoice QR codes and sends them to the Cashew finance app. It maps NIFs to names locally. — [GitHub](https://github.com/marotoweb/cajuscan_app)
- **SmartDigitPT/QRcode_ATCUD-toDDL** (.NET 6) parses AT QR strings to JSON. — [GitHub](https://github.com/SmartDigitPT/QRcode_ATCUD-toDDL)
- **joaomfrebelo/at_qrcode** (PHP) generates and parses the AT QR, and ships the official spec, Portaria and Despacho PDFs. — [GitHub](https://github.com/joaomfrebelo/at_qrcode)
- GitHub code search also found AT-QR parsing code in `helderandre/infinity-erp-v2` (`apps/app/lib/financial/parse-pt-fiscal-qr.ts`), `dudu23-07/microlagos-faturasocr` (`src/qrcode-extractor.js`), `davoodepb/guideeasy-logistics` (`src/lib/qr-extract.ts`), `hugomcruz/accounting` (`backend/app/services/qr_parser.py`), `flyzard/invoicego` (Go), and `lfrmonteiro99/monthy_budget` (Dart `atcud_parser_test`). — [GitHub code search](https://github.com/search?q=%22*B%3A%22+%22*H%3A%22+atcud&type=code) (listing only; I did not review the code quality)
- **npm**: searching for "atcud" returns only `@readystack/saft-pt-atcud-lint` (a SAF-T XML linter that checks ATCUD and QR data) and `@descodify/mcp`. I found no popular dedicated "decode AT QR" npm package. — [npm search](https://registry.npmjs.org/-/v1/search?text=atcud)
- **AT's e-fatura app** reads the QR on invoices so the invoice can be registered in the Finance portal. — [Zappy help](https://help.pt.zappysoftware.com/portal/pt/kb/articles/tudo-sobre-o-qr-code-nas-faturas) (search snippet). A web decoder also exists at [fqrdecoder.pt](https://fqrdecoder.pt/) (not opened).

### Gaps
- I did not review the licenses or test coverage of the smaller ERP snippets.

---

## 6. PDF invoices (e.g. IKEA e-invoice): the free path

### Takeaway
With a digital PDF invoice you often don't need to decode the QR image. Extract the PDF text with **`unpdf`** (a serverless PDF.js build that officially supports Deno and edge runtimes) and regex the `ATCUD:` line, NIFs, total and date. Line items are also in the text, which the QR never gives you. If the text doesn't contain the QR payload, use `unpdf`'s `extractImages` or render the page, then run the QR image through zxing-wasm.

### Cited Findings
- **unpdf** 1.8.1 (2026-08-13, MIT, zero deps) provides "PDF extraction and rendering across all JavaScript runtimes – Node.js, Deno, Bun, the browser, and serverless environments like Cloudflare Workers". It ships "a serverless build of Mozilla's PDF.js". Its API includes `getDocumentProxy(new Uint8Array(buf))`, `extractText(pdf, { mergePages: true })` and `extractImages`. — [npm registry: unpdf](https://registry.npmjs.org/unpdf), [GitHub unjs/unpdf](https://github.com/unjs/unpdf)
- The Portaria requires the printed `ATCUD:Código-Número` on **every page** of a multi-page document, immediately above the QR. So the ATCUD is always available as text in a digital PDF. — [Portaria 195/2020 art. 4.º(3)](https://github.com/joaomfrebelo/at_qrcode/tree/master/documentation)
- Observed in the user's own previously extracted receipt text (local files, not public). An IKEA Loures receipt's text contains `ATCUD: J6F3H449-0012584`, "IKEA PORTUGAL, Móveis e Decoração, Lda", `Total 109,37` and the item lines. A LIDL receipt's text contains the header `NIF:503340855`, the line items, `Total 153,80` and the line `ATCUD: J6KWPHDZ-…` followed by the time. — local text dumps in the project scratchpad (user data; **not a public source**)

### Inferences
- **The PDF text path is better than the QR for line items.** For IKEA-style PDFs, parse the item lines from text (regex per merchant template) and use the ATCUD as the dedupe key.
- For PDFs, check whether the text layer contains an `A:\d{9}\*B:` string. If it does, use `parseATQR` on it. Otherwise pull the page images, find the QR image and decode it with zxing-wasm. **Unverified**: whether IKEA's PDF embeds the QR as an image or as vector paths. Vector paths would need page rendering, which is heavier; unpdf can render via a canvas polyfill, but that may exceed Edge CPU limits.
- Portuguese number format in printed text ("153,80") differs from the QR format ("153.80"). Normalise the comma when parsing text.

### Gaps
- I did not test unpdf in Deno/Supabase, nor measure its CPU cost on a multi-page invoice.
- I could not inspect a real IKEA PDF to confirm how its QR is embedded.
