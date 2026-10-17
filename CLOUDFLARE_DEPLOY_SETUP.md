# Shikkha Cloudflare Worker — create-only isolated deployment

This GitHub Actions workflow is intentionally **manual** (Actions → Deploy Shikkha Sync Worker (isolated) → Run workflow); it does NOT run when application code changes.

Target Worker script: **`shikkha-jawdatjr-offline-sync-2026`**. The preflight step checks Cloudflare. If a Worker with this name already exists, or Cloudflare cannot confirm the name is unused, the workflow **stops without touching it**. It does not configure custom domains, routes, DNS, zones, environments, KV namespaces, databases, or any other Workers. In particular, it is not intended to interact with your existing accounting software.

## One-time prerequisites (do not post any keys in chat)

1. Your Cloudflare Dashboard → **Account ID**: copy from Cloudflare UI, not zone ID.
2. Make a Cloudflare **API Token** scoped to **only the selected account**, granting Workers Scripts **Read and Edit** (plus any account read permissions Wrangler needs). Do NOT use the Global API Key.
3. GitHub fine-grained token owned by `jawdatjr` restricted to the **private** `shikkha_backup` repository, Contents: **Read and write**. Do NOT include the public `shikkha` repo in its access.
4. Create two or more cryptographically random, distinct, secret keys (32+ characters). Assign them to labels such as Owner and Salesman02 in a JSON object. For example, generate keys with Python: `python -c "import secrets; print(secrets.token_urlsafe(32))"` **twice**, then prepare the JSON in a private editor.

Add these four **Repository Secrets** in `jawdatjr/shikkha` → Settings → Secrets and variables → Actions → New repository secret:

| Secret name | Secret value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Narrowly scoped Workers API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `SHIKKHA_GH_BACKUP_TOKEN` | Fine-grained GitHub PAT, *private backup repo only* |
| `SHIKKHA_SALESMAN_KEYS` | JSON object containing Owner and Salesman02 keys |

Never commit any of these values into either repository. Do not give the GitHub PAT or Worker API Token to salesmen. The app requires only its own individual salesman sync key.

Once all four secrets are saved:

1. Open [Shikkha GitHub Actions](https://github.com/jawdatjr/shikkha/actions/workflows/deploy-shikkha-sync.yml).
2. Select **Run workflow**. Watch the checks. A failure does not authorize changing an existing Cloudflare script.
3. Record the new `*.workers.dev` URL from the Wrangler deployment output; keep the origin as `https://jawdatjr.github.io` already set in `cloudflare-worker/wrangler.toml`.
4. On each mobile phone, open the installed [Shikkha app](https://jawdatjr.github.io/shikkha/) → More → Settings → Auto GitHub Backup. Set **Worker URL without `/sync`**, own Salesman Name, and corresponding Sync Key.
5. Save and press **Sync Now** while online. Check that `shikkha_backup/data/ledger.json` now has non-empty `events` and an updated `updatedAt`.
6. Sync the other phone. Then test Airplane Mode: save a test receipt, go online, open the app, Sync Now, and verify that the other device receives it.

## Important limitations

- Offline data lives locally until confirmed synced. Back up JSON separately on each phone before starting. Never clear site storage or uninstall while queued records might exist.
- GitHub contents is **not a transactional multiuser database**. This Worker is a small-business pilot solution; if transaction volume rises, migrate to a proper database with authentication and server-side audit logs.
- Cloudflare Workers and GitHub have their own limits; unexpected deployment errors should be investigated rather than bypassed.
- The workflow is create-only on purpose. Future Worker updates need a separately reviewed procedure to avoid accidental interference with other cloud software.
