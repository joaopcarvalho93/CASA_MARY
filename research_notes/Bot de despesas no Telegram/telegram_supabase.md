# Telegram bot webhook on Supabase Edge Functions (Deno), incl. Lovable Cloud

Research date: 2026-09-30. Access notes: core.telegram.org, supabase.com, grammy.dev and docs.lovable.dev were all blocked by the network proxy from this session. What I used instead:
- **Telegram:** the machine-readable Bot API spec mirror `PaulSonOfLars/telegram-bot-api-spec` (api.json scraped from core.telegram.org; it reports **"Bot API 10.3, August 24, 2026"**). Quotes below are verbatim from it. Links point to the official anchors.
- **Supabase:** the docs source in the `supabase/supabase` GitHub repo (master branch, last commit 2026-09-30). The `.mdx` files are the source of supabase.com/docs.
- **grammY:** the docs source in `grammyjs/website` plus the published npm package `grammy@1.46.0`.
- **Lovable:** web search snippets and third-party pages only. I could not read primary docs, so treat Lovable findings as lower confidence.

## 1. Telegram Bot API essentials (verified against Bot API 10.3 spec text)

### Takeaway
You need these parts of the API:
- `setWebhook` with `url`, `secret_token`, `allowed_updates=["message","callback_query"]`, and optionally `drop_pending_updates` / `max_connections`.
- Read `message.text`, `message.photo` (take the last/largest PhotoSize), `message.document` (check `mime_type === "application/pdf"`) and `message.caption`.
- Download files with `getFile` → `https://api.telegram.org/file/bot<token>/<file_path>` (20 MB limit).
- Reply with `sendMessage` + `reply_markup.inline_keyboard`, where each button's `callback_data` is at most 64 bytes.
- Handle `callback_query` with `answerCallbackQuery` + `editMessageText` / `editMessageReplyMarkup`.

### Cited Findings

**Spec version**
- The current Bot API is **10.3, released August 24, 2026** — [Telegram Bot API spec mirror (api.json)](https://github.com/PaulSonOfLars/telegram-bot-api-spec); changelog anchor [core.telegram.org/bots/api#august-24-2026](https://core.telegram.org/bots/api#august-24-2026)

**setWebhook**
- On each update Telegram sends "an HTTPS POST request to the specified URL, containing a JSON-serialized Update. In case of an unsuccessful request (a request with response HTTP status code different from 2XY), we will repeat the request and give up after a reasonable amount of attempts." — [Bot API: setWebhook](https://core.telegram.org/bots/api#setwebhook) (via [spec mirror](https://github.com/PaulSonOfLars/telegram-bot-api-spec))
- setWebhook parameters (exact wording) — [Bot API: setWebhook](https://core.telegram.org/bots/api#setwebhook):
  - `url` (String, required): "HTTPS URL to send updates to. Use an empty string to remove webhook integration."
  - `certificate` (InputFile, optional). Only needed for self-signed certificates, so not needed for Supabase.
  - `ip_address` (String, optional).
  - `max_connections` (Integer, optional): "The maximum allowed number of simultaneous HTTPS connections to the webhook for update delivery, 1-100. Defaults to 40."
  - `allowed_updates` (Array of String, optional): e.g. `["message", "edited_channel_post", "callback_query"]`. "Specify an empty list to receive all update types except chat_member, message_reaction, and message_reaction_count (default). If not specified, the previous setting will be used." The parameter doesn't affect updates created before the call.
  - `drop_pending_updates` (Boolean, optional): "Pass True to drop all pending updates".
  - `secret_token` (String, optional): "A secret token to be sent in a header 'X-Telegram-Bot-Api-Secret-Token' in every webhook request, 1-256 characters. Only characters A-Z, a-z, 0-9, _ and - are allowed. The header is useful to ensure that the request comes from a webhook set by you."
- `deleteWebhook` takes only `drop_pending_updates` — [Bot API: deleteWebhook](https://core.telegram.org/bots/api#deletewebhook)
- `getWebhookInfo` returns a WebhookInfo object — [Bot API: WebhookInfo](https://core.telegram.org/bots/api#webhookinfo). Fields:
  - `url`
  - `has_custom_certificate`
  - `pending_update_count` ("Number of updates awaiting delivery")
  - `ip_address`
  - `last_error_date`
  - `last_error_message`
  - `last_synchronization_error_date`
  - `max_connections`
  - `allowed_updates`

**Update**
- `update_id`: "The update's unique identifier. Update identifiers start from a certain positive number and increase sequentially. This identifier becomes especially handy if you're using webhooks, since it allows you to ignore repeated updates or to restore the correct update sequence, should they get out of order" — [Bot API: Update](https://core.telegram.org/bots/api#update)
- "At most one of the optional fields can be present in any given update." Relevant fields are `message`, `edited_message`, `callback_query` and `my_chat_member` — [Bot API: Update](https://core.telegram.org/bots/api#update)

**Message, PhotoSize, Document**
- Relevant Message fields — [Bot API: Message](https://core.telegram.org/bots/api#message):
  - `message_id`
  - `from` (User; "may be empty for messages sent to channels")
  - `chat`
  - `date` (Unix time)
  - `text` ("For text messages, the actual UTF-8 text")
  - `photo` ("Array of PhotoSize … available sizes of the photo")
  - `document` (Document)
  - `caption` ("Caption for the animation, audio, document, paid media, photo, video or voice")
  - `media_group_id` ("unique identifier … of a media message group this message belongs to")
- PhotoSize fields: `file_id`, `file_unique_id` ("supposed to be the same over time and for different bots. Can't be used to download or reuse the file"), `width`, `height`, optional `file_size` — [Bot API: PhotoSize](https://core.telegram.org/bots/api#photosize)
- Document fields — [Bot API: Document](https://core.telegram.org/bots/api#document):
  - `file_id`
  - `file_unique_id`
  - `thumbnail`
  - `file_name` ("Original filename as defined by the sender")
  - `mime_type` ("MIME type of the file as defined by the sender")
  - `file_size` (can exceed 2^31 but has at most 52 significant bits, so it is safe in a double/int64)

**getFile and File**
- getFile: "For the moment, bots can download files of up to 20MB in size. On success, a File object is returned. The file can then be downloaded via the link `https://api.telegram.org/file/bot<token>/<file_path>`, where <file_path> is taken from the response. It is guaranteed that the link will be valid for at least 1 hour. When the link expires, a new one can be requested by calling getFile again." — [Bot API: getFile](https://core.telegram.org/bots/api#getfile)
- getFile also notes: "This function may not preserve the original file name and MIME type. You should save the file's MIME type and name (if available) when the File object is received." — [Bot API: getFile](https://core.telegram.org/bots/api#getfile)
- The File object has fields `file_id`, `file_unique_id`, `file_size` and `file_path` — [Bot API: File](https://core.telegram.org/bots/api#file)

**sendMessage and inline keyboards**
- sendMessage requires `chat_id` (Integer or String) and `text` ("1-4096 characters after entities parsing"). Optional parameters include `parse_mode`, `reply_parameters` and `reply_markup` (InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply), plus `message_thread_id`, `disable_notification`, etc. — [Bot API: sendMessage](https://core.telegram.org/bots/api#sendmessage)
- InlineKeyboardMarkup: `inline_keyboard` is an "Array of Array of InlineKeyboardButton" (rows of buttons) — [Bot API: InlineKeyboardMarkup](https://core.telegram.org/bots/api#inlinekeyboardmarkup)
- InlineKeyboardButton: `text` is required; `callback_data` is "Data to be sent in a callback query to the bot when the button is pressed, **1-64 bytes**" — [Bot API: InlineKeyboardButton](https://core.telegram.org/bots/api#inlinekeyboardbutton)
- New in 10.x: an optional `style` of `"danger"` (red), `"success"` (green) or `"primary"` (blue), and an optional `disabled` field — [Bot API: InlineKeyboardButton](https://core.telegram.org/bots/api#inlinekeyboardbutton). Useful for "Apagar" = danger and "Aprovar" = success.

**CallbackQuery, answerCallbackQuery, editing messages**
- CallbackQuery fields — [Bot API: CallbackQuery](https://core.telegram.org/bots/api#callbackquery):
  - `id` (String)
  - `from` (User, required)
  - `message` (MaybeInaccessibleMessage; present if the button was on a message sent by the bot)
  - `inline_message_id`
  - `chat_instance`
  - `data`: "Be aware that the message originated the query can contain no callback buttons with this data."
- answerCallbackQuery takes `callback_query_id` (required), `text` (0-200 characters), `show_alert` (default false), `url` and `cache_time` (default 0) — [Bot API: answerCallbackQuery](https://core.telegram.org/bots/api#answercallbackquery)
- editMessageText: `chat_id` + `message_id` (or `inline_message_id`), `text` (1-4096), `parse_mode`, and `reply_markup` (InlineKeyboardMarkup) — [Bot API: editMessageText](https://core.telegram.org/bots/api#editmessagetext)
- editMessageReplyMarkup edits only the keyboard, and passing no keyboard removes it — [Bot API: editMessageReplyMarkup](https://core.telegram.org/bots/api#editmessagereplymarkup)

**Webhook reply**
- A webhook response can carry one API method call in its body, but you then get no result and no error handling — [grammY docs: Webhook Reply](https://github.com/grammyjs/website/blob/main/site/docs/guide/deployment-types.md) ([grammy.dev](https://grammy.dev/guide/deployment-types))

### Inferences
- **Photos:** `message.photo` lists the sizes in ascending order, so take `photo[photo.length - 1]` (or the max by `width*height` / `file_size` to be safe). Record `file_unique_id` to detect the same receipt being sent twice.
- **PDFs:** accept only if `document.mime_type === "application/pdf"` (optionally also a `.pdf` `file_name`). Reject in advance if `document.file_size > 20*1024*1024`, because getFile cannot serve it.
- **Text:** the amount or description can arrive as `text` (text message) or as `caption` (photo/PDF). Parse both.
- **Albums:** several photos sent at once arrive as separate updates that share a `media_group_id`. Decide whether to group them.
- **callback_data format:** use a compact format such as `a:<uuid>` (approve), `c:<uuid>` (Casa), `m:<uuid>` (Metade), `d:<uuid>` (Apagar). A 36-char UUID plus a 2-char prefix is 38 bytes, which fits the 64-byte limit. Never put amounts or free text in `callback_data`.
- **Bot token hygiene:** never log the download URL `https://api.telegram.org/file/bot<token>/…` because it contains the token. Stream the download into Supabase Storage and store only the storage path.

### Gaps
- I could not open the "Getting updates" prose on core.telegram.org (blocked). That section documents supported webhook ports 443/80/88/8443, the 24-hour retention of pending updates, and the answerCallbackQuery "progress bar" note. The spec mirror only contains method and type descriptions.
  - From memory of the official docs (unverified this session): updates "will not be kept longer than 24 hours", and clients show a loading indicator until answerCallbackQuery is called.
  - Supabase URLs use 443, so the port requirement is satisfied either way.

## 2. Webhook retry behaviour, and background processing with EdgeRuntime.waitUntil (limits)

### Takeaway
Telegram re-sends an update whenever it gets a non-2xx response or times out. Slow handlers therefore produce duplicate, even repeated, deliveries. Telegram also delivers updates from one chat sequentially and holds later updates behind a failing one.

On Supabase:
- Validate the request.
- Record `update_id`.
- Return 200 immediately.
- Do the slow work (getFile, Storage upload, OCR/AI, DB writes, replies) in `EdgeRuntime.waitUntil(promise)`.

The work in `waitUntil` is bounded by these limits:
- 256 MB memory
- 2 s CPU per request (async I/O excluded)
- 150 s wall clock on the Free plan / 400 s on paid plans

### Cited Findings
- Official wording: non-2xx responses are repeated and Telegram will "give up after a reasonable amount of attempts". No exact schedule or number is published — [Bot API: setWebhook](https://core.telegram.org/bots/api#setwebhook)
- Updates from the same chat are delivered in sequence, while updates from different chats are sent concurrently. "if an update delivery fails for a chat, the subsequent updates will be queued until the first update succeeds." grammY sources this to [tdlib/telegram-bot-api#75](https://github.com/tdlib/telegram-bot-api/issues/75#issuecomment-755436496) — [grammY: Ending Webhook Requests in Time](https://github.com/grammyjs/website/blob/main/site/docs/guide/deployment-types.md)
- "Telegram has a timeout for each update that it sends to your webhook endpoint. If you don't end a webhook request fast enough, Telegram will re-send the update … your bot will not just see the update two times, but a few dozen times, until Telegram stops retrying." — [grammY: deployment types](https://grammy.dev/guide/deployment-types)
- grammY's `webhookCallback` has its own internal timeout, default **10 seconds** (`timeoutMilliseconds: 10000`, `onTimeout: "throw"`). The alternative `"return"` ends the request early, which grammY warns can cause race conditions because Telegram then sends the next update of the same chat — [grammY: deployment types](https://grammy.dev/guide/deployment-types); confirmed in the source of [grammy@1.46.0 out/convenience/webhook.js](https://www.npmjs.com/package/grammy)
- A third-party write-up of an ack-late bug reports ~10 s response times causing Telegram delivery timeouts and retry storms. It recommends "ack 200 immediately, process the body asynchronously" but quotes no official timeout number — [openclaw/openclaw#71392](https://github.com/openclaw/openclaw/issues/71392)
- A secondary source claims exponential backoff "up to several hours" and ~24 h buffering. This is not stated in the Bot API spec text I could access — [search summary citing BotHero/openclaw](https://github.com/openclaw/openclaw/issues/16763)

**EdgeRuntime.waitUntil (Supabase docs)**
- "You can use `EdgeRuntime.waitUntil(promise)` to explicitly mark background tasks. The Function instance continues to run until the promise provided to `waitUntil` completes." Calling it inside the handler "will not block the request". — [Supabase: Background Tasks](https://supabase.com/docs/guides/functions/background-tasks) ([source mdx](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/background-tasks.mdx))
- The docs example calls `EdgeRuntime.waitUntil(asyncLongRunningTask())` without `await`, then `return Response.json({ ok: true })` — [Supabase: Background Tasks](https://supabase.com/docs/guides/functions/background-tasks)
- The docs show two event listeners — [Supabase: Background Tasks](https://supabase.com/docs/guides/functions/background-tasks):
  - `addEventListener('beforeunload', (ev) => console.log('Function will be shutdown due to', ev.detail?.reason))`
  - `addEventListener('unhandledrejection', …)`
  - The docs also recommend try/catch inside background tasks.
- "The maximum duration is capped based on the wall-clock, CPU, and memory limits. The function will shut down when it reaches one of these limits." — [Supabase: Background Tasks](https://supabase.com/docs/guides/functions/background-tasks)
- Locally, the CLI kills instances after the response, so to test background tasks you need this in `supabase/config.toml` — [Supabase: Background Tasks](https://supabase.com/docs/guides/functions/background-tasks):
  ```toml
  [edge_runtime]
  policy = "per_worker"
  ```

**Supabase Edge Function limits** — [Supabase: Limits](https://supabase.com/docs/guides/functions/limits) ([source mdx](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/limits.mdx))
- Runtime limits:
  - Maximum Memory: 256MB.
  - Maximum Duration (wall clock; a worker may serve several requests or background tasks in this window): Free 150s, Paid 400s.
  - Maximum CPU Time: 2s per request ("does not include async I/O").
  - Request idle timeout: 150s (after which the gateway returns 504).
- Other limits:
  - Maximum function size: 20MB (CLI bundled) / 5MB (bundled server-side via Dashboard/API).
  - Functions per project: Free 100, Pro 1000.
  - Log message maximum: 10,000 characters.
  - Log event threshold: 100 events per 10 s.
  - Outgoing ports 25 and 587 are blocked.
  - No Web Workers.
  - No multithreaded Node libraries (e.g. sharp).
- Secrets limits: at most 100 per project, 48 KiB each, and names must not start with `SUPABASE_` — [Supabase: Limits](https://supabase.com/docs/guides/functions/limits)

### Inferences
- **Pattern:**
  1. Check the secret header (reject with 401/403 otherwise).
  2. Parse the JSON.
  3. `INSERT … ON CONFLICT DO NOTHING` into `telegram_updates(update_id)`. If the row already existed, return 200 immediately.
  4. Call `EdgeRuntime.waitUntil(processUpdate(update))`.
  5. `return new Response("ok")`.
  - The insert takes a few ms, and doing it before the 200 guarantees that a re-delivery is dropped even if the background task crashes midway. Also keep a `status` column (received/processed/failed) so failures can be found and retried.
- **Why ack-then-process fits here:** processing an expense does not depend on the order of the previous update in the same chat, except the callback flow, which is guarded by DB state. So ending the request early is acceptable, unlike grammY's session-plugin scenario.
- **CPU budget:** 2 s of CPU is plenty for JSON, fetch and DB I/O. Heavy image processing (resizing, local OCR) inside the function is a risk. Send images to an external OCR/AI API instead, since that is I/O rather than CPU.
- **Wall clock:** with 150 s on Free, a getFile + 20 MB download + Storage upload + AI call should fit, but add timeouts (e.g. `AbortSignal.timeout(20000)`) on each external fetch.
- **Fallback:** for longer or retryable work, persist a job row and let a pg_cron-triggered worker function process it.

### Gaps
- Telegram's exact webhook response timeout, retry intervals and maximum attempts are not documented officially (the docs only say "reasonable amount of attempts"). The frequently quoted "~60 s timeout" and "24 h" figures come from secondary sources or memory and were not verified this session.
- Supabase docs do not say whether `waitUntil` work counts against the same 2 s CPU budget as the request. The limit is phrased "per request", and the background-tasks page says duration is capped by wall-clock, CPU and memory limits, which implies it does.

## 3. Idempotency (duplicate updates, double-taps on buttons)

### Takeaway
Use a unique key on `update_id`, which Telegram documents as the way to "ignore repeated updates". Also make every button action a conditional, state-checked UPDATE, so a double-tap (two distinct callback_query updates with different `update_id`s) cannot apply twice. Optionally add a unique key on the Telegram message and file identity to avoid creating two expenses from the same message.

### Cited Findings
- `update_id` values are unique and sequential and are meant to let webhook bots "ignore repeated updates or to restore the correct update sequence" — [Bot API: Update](https://core.telegram.org/bots/api#update)
- `file_unique_id` "is supposed to be the same over time and for different bots" (usable as a dedupe key for the same file), whereas `file_id` is not stable in that way — [Bot API: PhotoSize/Document](https://core.telegram.org/bots/api#photosize)
- Each button press produces a new CallbackQuery with its own `id`, and `answerCallbackQuery` must reference that `callback_query_id` — [Bot API: CallbackQuery / answerCallbackQuery](https://core.telegram.org/bots/api#answercallbackquery)
- The message a button belonged to may no longer contain a button with this data ("Be aware that the message originated the query can contain no callback buttons with this data"), i.e. stale keyboards can still send callbacks — [Bot API: CallbackQuery](https://core.telegram.org/bots/api#callbackquery)

### Inferences
- **Suggested SQL:**
  ```sql
  create table telegram_updates (
    update_id bigint primary key,
    received_at timestamptz default now(),
    status text default 'received',
    error text
  );
  -- in expenses:
  --   source_chat_id bigint,
  --   source_message_id bigint,
  --   unique (source_chat_id, source_message_id)
  ```
  Telegram `message_id` is unique only within a chat, so the key must include `chat_id`.
- **Receipt file dedupe:** optionally add `unique(receipt_file_unique_id)` to catch the same receipt forwarded twice. Better as a soft warning ("parece duplicada") than a hard block.
- **Button actions:** use conditional updates, then edit the message to show the final state and remove or disable the keyboard:
  - `update expenses set status='approved', split='casa' where id=$1 and status='pending' returning *`
  - If 0 rows are returned, answer the callback with "Já tratado" and don't re-apply.
- **Always call `answerCallbackQuery`**, even on no-op, so the client stops the loading spinner (official note not re-verified this session; see Gap in section 1).
- **Deleting ("Apagar"):** prefer a soft delete (`deleted_at`) so a stray double-tap or a mistaken tap can be undone.

### Gaps
- No official statement on how quickly Telegram clients let a user tap a button twice. I treat double-taps as normal and rely on DB conditions.

## 4. Security: secret_token header, allowlist, secrets, service role vs RLS, verify_jwt=false

### Takeaway
- **Secret header:** set `secret_token` in setWebhook and compare the `X-Telegram-Bot-Api-Secret-Token` header, ideally in constant time. Don't use a `?secret=` query parameter, and never put the bot token in the URL.
- **verify_jwt:** Telegram sends no Supabase JWT, so the function must have `verify_jwt = false` in `supabase/config.toml` under `[functions.<name>]` (or be deployed with `--no-verify-jwt`).
- **Allowlist:** after authenticating the request, authorise the human by mapping `from.id` to a row in a `people`/`members` table and ignore everyone else.
- **Database access:** use the service-role / secret key only server-side inside the function (it bypasses RLS). Keep RLS enabled on the tables so the browser app cannot read them without auth.

### Cited Findings
- The `secret_token` is sent as the header `X-Telegram-Bot-Api-Secret-Token`, 1-256 chars, `[A-Za-z0-9_-]` — [Bot API: setWebhook](https://core.telegram.org/bots/api#setwebhook)
- Exact config syntax from Supabase docs — [Supabase: Function Configuration](https://supabase.com/docs/guides/functions/function-configuration) ([source mdx](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/function-configuration.mdx)):
  ```toml
  # Disables authentication for the Stripe webhook.
  [functions.stripe-webhook]
  verify_jwt = false
  ```
  The equivalent CLI flag is `supabase functions serve hello-world --no-verify-jwt`. The docs caution: "it will allow anyone to invoke your Edge Function without a valid JWT."
- Supabase auth guidance for external providers — [Supabase: Securing Edge Functions (auth.mdx)](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/auth.mdx):
  - Quote: "External providers like Stripe or GitHub don't send Supabase credentials. They sign the request body with their own shared secret. Use `auth: 'none'` to skip the SDK's credential check, then verify the provider's signature inside the handler. Keep `verify_jwt = false`."
  - For cron/pg_net callers: "Disable `verify_jwt` and use `auth: 'secret'` to validate the key".
- Supabase's own Telegram example (current master) — [supabase/examples/edge-functions/telegram-bot/index.ts](https://github.com/supabase/supabase/blob/master/examples/edge-functions/supabase/functions/telegram-bot/index.ts):
  - Imports `npm:grammy@^1` and `npm:@supabase/server@^1`.
  - Wraps the handler in `withSupabase({ auth: 'none' }, …)`.
  - Checks `url.searchParams.get('secret') !== Deno.env.get('FUNCTION_SECRET')`, returning 405.
  - Comment: "Telegram is verified via the secret query param, so deploy with verify_jwt = false."
- grammY's Supabase hosting guide is older: it uses `Deno.serve` and compares `?secret=` against **the bot token itself**, with `setWebhook?url=…/functions/v1/telegram-bot?secret=<BOT_TOKEN>` — [grammY: Hosting on Supabase](https://grammy.dev/hosting/supabase) ([source](https://github.com/grammyjs/website/blob/main/site/docs/hosting/supabase.md))
- grammY natively supports the header: `webhookCallback(bot, "std/http", { secretToken })`. It reads `X-Telegram-Bot-Api-Secret-Token` and compares it in constant time ("to prevent timing attacks"); on mismatch it calls `handler.unauthorized()` — [grammy@1.46.0 out/convenience/webhook.js](https://www.npmjs.com/package/grammy)
- Default env vars in Supabase functions — [Supabase: Environment variables](https://supabase.com/docs/guides/functions/secrets) ([source mdx](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/secrets.mdx)):
  - `SUPABASE_URL`
  - `SUPABASE_DB_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` ("safe to use in Edge Functions, but **never** use it in a browser. This key bypasses Row Level Security")
  - The newer JSON-encoded `SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_SECRET_KEYS` (used as `JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!)['default']`)
- Supabase secrets handling — [Supabase: Environment variables](https://supabase.com/docs/guides/functions/secrets):
  - Production secrets are set in Dashboard → Edge Function Secrets or via `supabase secrets set NAME=value`.
  - Local secrets go in `supabase/functions/.env`, which must be gitignored.
  - Names cannot start with `SUPABASE_`.
  - The docs advise returning `Boolean(secret)` rather than the value when testing.
- `@supabase/server` (npm latest **1.8.1**, "v1.X — Public Beta") provides `withSupabase({ auth: 'none' | 'user' | 'publishable' | 'secret' | [...] }, handler)`. Its `ctx` includes `supabaseAdmin`, which "bypasses RLS (service role)" — [npm: @supabase/server](https://www.npmjs.com/package/@supabase/server)
- Lovable Cloud (search-result summary of Lovable's Secrets doc): "Supabase-related secrets like SUPABASE_SERVICE_ROLE_KEY already exist in your Edge Function environment" and can be read with `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` — [Lovable docs: Secrets](https://docs.lovable.dev/features/secrets) (via search snippet; page itself not readable here)

### Inferences
- **Prefer the header over a query string:** the `secret_token` header keeps the secret out of URLs, which appear in logs and in `getWebhookInfo.url`. Generate it with e.g. `openssl rand -hex 32` (64 chars, allowed charset) and store it as the secret `TELEGRAM_WEBHOOK_SECRET`.
- **Two-layer auth:**
  - Layer 1: the secret header proves the request came from Telegram for your webhook.
  - Layer 2: an allowlist of `from.id`. Store `telegram_user_id bigint unique` on the `people` table (Mary and partner). For callbacks use `callback_query.from.id`, and optionally restrict `chat.id` to known chats.
  - Silently ignore (return 200) unknown users, so Telegram doesn't retry.
- **Status codes:** on a wrong secret return 401/403. Those are non-2xx, so Telegram will retry — but only an attacker would get them, not Telegram with the correct header.
- **Logging:** never `console.log(req.url)` for file URLs, the full update, or env. Log `update_id` and type only (the log limit is 10k chars per message anyway).
- **Service role:** using `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEYS.default`) inside this function is the standard pattern for webhooks, since there is no end-user JWT. Enforce the allowlist in code. Keep RLS enabled with no anon policies on `telegram_updates`.

### Gaps
- I could not confirm whether Lovable Cloud projects expose the newer `SUPABASE_SECRET_KEYS` or only the legacy `SUPABASE_SERVICE_ROLE_KEY`. Code defensively and check both.

## 5. Group chats vs private chat (privacy mode)

### Takeaway
Privacy mode is on by default. In a group, the bot then sees only commands, replies to its own messages and mentions, so plain photos and texts from the couple would be missed. To receive all group messages, either:
- `/setprivacy` → Disable in @BotFather, then remove and re-add the bot to the group; or
- make the bot a group admin (admins always receive all messages).

Private chats always deliver everything. A private chat with each partner is simplest. A shared group gives shared visibility, including the buttons, to both partners.

### Cited Findings
- "Privacy mode is enabled by default for all bots, except bots that were added to a group as admins (bot admins always receive all messages)." — [Telegram Bot Features: privacy mode](https://core.telegram.org/bots/features#privacy-mode) (via search summary; page blocked here)
- After disabling privacy mode via @BotFather `/setprivacy`, group messages are still not received until the bot is removed from the group and re-added — [NVIDIA/NemoClaw#4068](https://github.com/NVIDIA/NemoClaw/issues/4068); [TeleMe: group privacy mode](https://www.teleme.io/articles/group_privacy_mode_of_telegram_bots?hl=en)
- grammY docs mention that replies/mentions are received "even when running in privacy mode in group chats" — [grammY: basics](https://github.com/grammyjs/website/blob/main/site/docs/guide/basics.md)
- `my_chat_member` updates tell the bot when it is added to or removed from chats — [Bot API: Update](https://core.telegram.org/bots/api#update)

### Inferences
- **For a couple:** a small private group "Casa – despesas" with both partners plus the bot, with the bot made admin, is the most robust. Both see every expense card and either can tap "Aprovar/Casa/Metade". Alternatively, disable privacy and re-add the bot.
- **In groups:** `message.from.id` identifies who posted and `callback_query.from.id` who tapped. Apply the allowlist to both, and allowlist the group `chat.id` too.
- **Private-chat design** (each partner DMs the bot): the bot must `sendMessage` to the other partner's `chat_id` (their user id) to notify them. This works only after that partner has started the bot.

### Gaps
- I could not read the official "features#privacy-mode" text directly. The remove/re-add requirement comes from secondary sources (consistent across several).

## 6. grammY vs plain fetch on Supabase (2026)

### Takeaway
Both work on Supabase Edge Functions:
- **grammY** (`npm:grammy@^1`, latest 1.46.0) with `webhookCallback(bot, "std/http", { secretToken })` is the officially documented path in both Supabase's and grammY's docs.
- **Plain `fetch`** against `https://api.telegram.org/bot<token>/<method>` is lighter for a bot that uses ~5 methods. It also makes the "ack immediately + `EdgeRuntime.waitUntil`" pattern straightforward, because grammY's `webhookCallback` by design awaits your middleware before responding.

### Cited Findings
- Supabase's example uses `import { Bot, webhookCallback } from 'npm:grammy@^1'`, `webhookCallback(bot, 'std/http')` and `export default { fetch: withSupabase({ auth: 'none' }, …) }` — [supabase example telegram-bot](https://github.com/supabase/supabase/blob/master/examples/edge-functions/supabase/functions/telegram-bot/index.ts); [Supabase docs: Building a Telegram Bot](https://supabase.com/docs/guides/functions/examples/telegram-bot)
- grammY's own Supabase guide uses `import { Bot, webhookCallback } from "npm:grammy"` with `Deno.serve`, deploying via `supabase functions deploy --no-verify-jwt telegram-bot` and setting the token with `supabase secrets set BOT_TOKEN=…` — [grammY: Hosting on Supabase](https://grammy.dev/hosting/supabase)
- The `"std/http"` adapter is for `Deno.serve`, `std/http`, Fresh and others — [grammY: Web Framework Adapters](https://grammy.dev/guide/deployment-types)
- `grammy` latest on npm is **1.46.0** (checked 2026-09-30) — [npm: grammy](https://www.npmjs.com/package/grammy)
- `webhookCallback(bot, adapter, { onTimeout = "throw", timeoutMilliseconds = 10000, secretToken })` behaviour — [grammy@1.46.0 source](https://www.npmjs.com/package/grammy):
  - On the first request it `await bot.init()`, which calls getMe, adding a Telegram round-trip on cold start unless `botInfo` is passed to the Bot constructor.
  - It then `await`s `bot.handleUpdate(...)` before responding.
- grammY warns that responding before middleware finishes (`onTimeout: "return"`) can cause race conditions, and recommends a queue for long work — [grammY: deployment types](https://grammy.dev/guide/deployment-types)

### Inferences
- **Plain-fetch outline** (Deno, no framework):
  ```ts
  const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
  const SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
  const tg = (method: string, body: unknown) =>
    fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());

  Deno.serve(async (req) => {
    if (req.method !== "POST") return new Response("ok");
    if (req.headers.get("x-telegram-bot-api-secret-token") !== SECRET)
      return new Response("forbidden", { status: 401 }); // prefer constant-time compare
    const update = await req.json();
    const { error } = await supabase
      .from("telegram_updates")
      .insert({ update_id: update.update_id });
    if (error?.code === "23505") return new Response("dup"); // unique_violation → already seen
    EdgeRuntime.waitUntil(handle(update).catch((e) => console.error("update", update.update_id, e?.message)));
    return new Response("ok");
  });
  ```
  Notes on the outline:
  - The header name is case-insensitive in `Headers.get`.
  - `export default { fetch }` is the style used in current Supabase docs; `Deno.serve` still appears in grammY's guide. Either should work — see Gaps.
  - Inline keyboard:
    ```ts
    reply_markup: { inline_keyboard: [
      [{ text: "Aprovar", callback_data: `a:${id}`, style: "success" }],
      [{ text: "Casa", callback_data: `c:${id}` }, { text: "Metade", callback_data: `m:${id}` }],
      [{ text: "Apagar", callback_data: `d:${id}`, style: "danger" }],
    ] }
    ```
  - Callback handling: `answerCallbackQuery({ callback_query_id })` first, then the conditional DB update, then `editMessageText({ chat_id, message_id, text, reply_markup })`.
  - File download:
    ```ts
    const f = await tg("getFile", { file_id });
    const bin = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${f.result.file_path}`);
    await supabase.storage.from("receipts").upload(path, bin.body!, { contentType });
    ```
- **grammY with the same pattern:** you would skip `webhookCallback` and call `bot.handleUpdate(update)` inside `EdgeRuntime.waitUntil`, giving `botInfo` up front to avoid `init()`. That's possible, but it removes most of grammY's convenience, so for this scope plain fetch is simpler and has zero dependencies.
- **Typing without grammY:** you can import only the types, e.g. `npm:@grammyjs/types`.

### Gaps
- I did not benchmark cold-start time for `npm:grammy` vs no dependency on Supabase. It is unverified which is faster, though fewer imports generally means faster boot.
- Supabase docs now show `export default { fetch }` instead of `Deno.serve`. I did not find a statement that `Deno.serve` is deprecated.

## 7. Lovable Cloud specifics (creating/deploying functions, secrets, URL, logs)

### Takeaway
Lovable Cloud is Lovable's built-in backend running on Supabase:
- Edge functions live in `supabase/functions/<name>/index.ts` and are written and deployed by Lovable's agent ("describe what you need in chat, and Lovable writes, deploys, and maintains the function").
- Secrets are added in Lovable's Cloud → Secrets UI, and the Supabase built-ins such as `SUPABASE_SERVICE_ROLE_KEY` are pre-populated.
- Functions, logs and invocation stats are under More → Cloud → Edge functions / Logs.

Whether a raw GitHub push alone redeploys a function could not be confirmed from primary docs. A third-party Lovable workflow tool explicitly pushes code and then prompts Lovable to "Deploy the [function-name] edge function".

### Cited Findings
- "You don't create edge functions by hand. Instead, you describe what you need in chat, and Lovable writes, deploys, and maintains the function for you." Edge functions "run on Lovable's servers … no servers for you to set up, and they scale automatically." — [Lovable docs: Edge functions](https://docs.lovable.dev/features/edge-functions) (search snippet)
- "go to More → Cloud → Edge functions to see every function in your project, with its status, invocation count, success rate, and when it was last updated … view logs to open Logs pre-filtered to this function's output" — [Lovable docs: Edge functions](https://docs.lovable.dev/features/edge-functions) (search snippet)
- Built-in Supabase secrets such as `SUPABASE_SERVICE_ROLE_KEY` already exist in the Edge Function environment. With an external Supabase connection, the "Manage secrets" button opens the Supabase dashboard instead — [Lovable docs: Secrets](https://docs.lovable.dev/features/secrets) (search snippet)
- Lovable Cloud is built on Supabase's stack (Postgres, Auth, Storage, Edge Functions, Realtime) — [RapidDev: Lovable Cloud integration guide](https://www.rapidevelopers.com/lovable-integration/lovable-cloud); [Lovable→Supabase migration blog](https://www.lovablemigration.com/blog/supabase-edge-functions-for-lovable-developers) (secondary)
- A third-party Claude-Code-for-Lovable plugin workflow (secondary evidence) — [10K-Digital/lovable-claude-code deploy-edge.md](https://github.com/10K-Digital/lovable-claude-code/blob/main/plugins/lovable/commands/deploy-edge.md):
  1. Check `supabase/functions/` for changes.
  2. Verify the code is pushed to `main`.
  3. Add any new secret in "Cloud → Secrets".
  4. Send the Lovable prompt "Deploy the [function-name] edge function" (or "Deploy all edge functions").
  5. Verify via Cloud logs.
- A community article titled "Fix Your Vanishing Lovable Cloud Supabase Edge Functions: The config.toml Guide" suggests that `supabase/config.toml` function entries (e.g. `verify_jwt = false`) matter in Lovable Cloud projects. I did not read its content — [flowdevs.io](https://www.flowdevs.io/post/fix-your-vanishing-supabase-edge-functions-the-configtoml-guide)
- The standard Supabase function URL format is `https://<PROJECT_REF>.supabase.co/functions/v1/<function-name>` — [grammY: Hosting on Supabase](https://grammy.dev/hosting/supabase); [Supabase: Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)

### Inferences
- **Practical Lovable workflow:**
  1. Commit `supabase/functions/telegram-webhook/index.ts` and a `[functions.telegram-webhook] verify_jwt = false` entry in `supabase/config.toml` (via GitHub or by asking Lovable).
  2. Add the secrets `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` in Lovable Cloud → Secrets (Lovable's agent may also prompt for them).
  3. Ask Lovable in chat to "deploy the telegram-webhook edge function".
  4. Confirm it appears in Cloud → Edge functions.
  5. Get the project ref from `VITE_SUPABASE_URL` / `VITE_SUPABASE_PROJECT_ID` in the repo's `.env` or `src/integrations/supabase/client.ts` (typical Lovable scaffolding — unverified this session). The URL is `https://<ref>.supabase.co/functions/v1/telegram-webhook`.
  6. Call setWebhook once (from a terminal or a one-off admin function), never from the frontend.
- **Test:** send a message and watch Cloud → Logs. Use `getWebhookInfo` (`last_error_message`, `pending_update_count`) to debug 401/404/500s.
- **Uncertainty:** because the GitHub-push-only auto-deploy is unconfirmed, the implementation guide should include "ask Lovable to deploy" as an explicit step.

### Gaps
- docs.lovable.dev was blocked, so all Lovable statements rely on search snippets and third-party sources. Not confirmed:
  - whether a GitHub push alone auto-deploys edge functions;
  - whether Lovable honours `verify_jwt` from `config.toml` (or has its own UI toggle);
  - whether users get direct Supabase dashboard access in Lovable Cloud projects;
  - whether the SQL editor / pg_cron are exposed.

## 8. Scheduled weekly summary: pg_cron + pg_net → Edge Function

### Takeaway
Supabase-hosted Postgres supports `pg_cron` plus `pg_net` for calling an Edge Function on a schedule. The documented pattern:
- Store the project URL and a key in Vault.
- `cron.schedule('name', '<cron expr>', $$ select net.http_post(url:=…, headers:=jsonb_build_object(...), body:=...) $$)`.

For the Telegram weekly summary, protect the target function with its own secret (e.g. an `x-cron-secret` header or `auth: 'secret'`), since it will also run with `verify_jwt = false`.

### Cited Findings
- "The hosted Supabase Platform supports the `pg_cron` extension … In combination with the `pg_net` extension, this allows us to invoke Edge Functions periodically on a set schedule." The docs recommend storing the auth token in Supabase Vault — [Supabase: Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) ([source mdx](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/schedule-functions.mdx))
- Exact documented SQL — [Supabase: Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions):
  ```sql
  select vault.create_secret('https://project-ref.supabase.co', 'project_url');
  select vault.create_secret('YOUR_SUPABASE_PUBLISHABLE_KEY', 'publishable_key');
  select cron.schedule('invoke-function-every-minute', '* * * * *', $$
    select net.http_post(
      url:=(select decrypted_secret from vault.decrypted_secrets where name='project_url') || '/functions/v1/function-name',
      headers:=jsonb_build_object('Content-type','application/json',
        'apikey',(select decrypted_secret from vault.decrypted_secrets where name='publishable_key')),
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$);
  ```
- `net.http_post` has a `timeout_milliseconds int default 2000` parameter — [Supabase: pg_net](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/extensions/pg_net.mdx)
- For callers like cron/pg_net: "Disable `verify_jwt` and use `auth: 'secret'` to validate the key" — [Supabase: auth.mdx](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/functions/auth.mdx)

### Inferences
- **Schedule:** a weekly job, e.g. `'0 19 * * 0'` (Sunday 19:00). pg_cron schedules are generally interpreted in UTC on Supabase (not verified this session). Lisbon is UTC+0 in winter and UTC+1 in summer, so pick the UTC hour accordingly or accept the one-hour drift.
- **pg_net timeout:** the 2 s default only affects how long pg_net waits to record the response; the function still runs. Raise `timeout_milliseconds` (e.g. 10000) if you want to log success.
- **Summary function:** it queries the week's expenses with the service-role client and `sendMessage`s to the group chat id (or to each partner).
- **Idempotency:** guard against double-sends with a `weekly_summaries(week_start date primary key)` row.

### Gaps
- Not confirmed that Lovable Cloud exposes `pg_cron`, `pg_net` and Vault, or lets you run the `cron.schedule` SQL (e.g. via a migration Lovable applies, or by asking the Lovable agent). Since Lovable Cloud runs on hosted Supabase they are likely available, but I found no Lovable primary source.
- I did not verify the pg_cron time zone (UTC) on the current Supabase docs page.
