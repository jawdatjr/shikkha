# Ashik Shikkha — Offline Salesman POS + Auto GitHub Backup (v2)

## কী কী কাজ করে
- Android ও iPhone-এ HTTPS GitHub Pages থেকে প্রথমবার লোড/ইনস্টল করার পর PWA-এর অ্যাপ শেল অফলাইনে ক্যাশ হয় (`sw.js`)। রিসিপ্ট/খরচের হিসাব **আগে সেই ফোনে** সেভ হয়। অফলাইন অবস্থায়ও create/edit/delete/history/dashboard চলে।
- রিসিপ্ট ও খরচ ডিলিটে কারণ + নিশ্চিতকরণ নেয়; `History → Deleted History / Audit Log`-এ নাম, রিসিপ্ট, ফোনের সময়, কারণ ও সিঙ্কের তথ্য থাকে। হিসাবের active total থেকে ডিলিট রেকর্ড বাদ যায়।
- আলাদা মোবাইলের নতুন রিসিপ্ট নম্বর ডিফল্টভাবে `AS-DEVICEID-00001` ফরম্যাটে তৈরি হয়; একই নম্বর হওয়ার ঝুঁকি কমায়। গ্রাহকের নাম এবং মোট বিল ছাড়া রিসিপ্ট সেভ হয় না।
- সেলসম্যান-নির্দিষ্ট private key দিয়ে Cloudflare Worker-এ login/config করলে অ্যাপ খোলা অবস্থায় ও ইন্টারনেট ফিরে এলে পরিবর্তনগুলো private GitHub **data** repository-তে স্বয়ংক্রিয়ভাবে commit হয়। অন্য ফোন সেটআপ করলে একই ledger sync হয়।
- একই রেকর্ড দুটি ফোনে স্বাধীনভাবে পরিবর্তিত হলে server-এর ভিত্তি সংস্করণ পরীক্ষা হয়। Conflict থাকলে নিজে সিদ্ধান্ত না নেওয়া পর্যন্ত তা GitHub-এ override করে না। Settings-এ 'আমার পরিবর্তন রাখুন' বা 'ক্লাউডের পরিবর্তন রাখুন' বেছে নিতে হয়।
- JSON backup/export এবং restore আগের মতো আছে; audit history-ও JSON export-এ যুক্ত হয়েছে।

## অত্যন্ত গুরুত্বপূর্ণ
- **শুধু GitHub Pages-এ HTML আপলোড করলে Auto Sync চালু হয় না।** নিচের private GitHub data repository ও Cloudflare Worker আলাদা করে setup করতে হবে। বর্তমানে কোনো GitHub repo বা Worker-এ এটি deploy করা হয়নি।
- **গ্রাহকের ফোন নম্বরসহ সংবেদনশীল হিসাব কখনো public GitHub repo-তে রাখবেন না।** GitHub Pages app repo হতে পারে public; GitHub **data** repo অবশ্যই private রাখবেন।
- GitHub private repository-তে event log ও commit history রাখা হচ্ছে; এটি ছোট ব্যবসার **কম সংখ্যক সেলসম্যান/লেনদেনের MVP**, উচ্চ-লেনদেনের transactional database নয়। অনেক এন্ট্রি হলে Supabase/Postgres-এর মতো DB ব্যবহার করুন।
- ফোন/ব্রাউজারের site data মুছলে অসিঙ্ক হওয়া data হারাতে পারে। নিয়মিত JSON backup নিন। Incognito-তে ব্যবহার করবেন না।
- নেট ফিরলেও অ্যাপ সম্পূর্ণ বন্ধ থাকলে iOS/Android background sync নিশ্চিত নয়; ফোনে অ্যাপ **খুলে** রাখলে স্বয়ংক্রিয়ভাবে সিঙ্ক করে; Settings-এর “এখনই Sync” দিয়ে নিশ্চিত করা যায়।
- Offline-এ ফোনের ঘড়ি ভুল হলে deletedAt (ফোন সময়) ভুল হতে পারে। ক্লাউড ব্যাকআপে serverAt (কখন গ্রহণ করেছে) আলাদাভাবে থাকে।
- Worker key ফোনের localStorage-এ সংরক্ষিত হয় (স্বয়ংক্রিয় সিঙ্কের জন্য); ফোন হারালে ওই ব্যক্তির key অবিলম্বে Worker secrets থেকে বাতিল করুন।
- Single-tenant/team-wide ledger: প্রতিটি বৈধ key-র অ্যাক্সেসে একই data আসে। আলাদা admin/limited salesman role এই MVP-তে নেই। App-এর receipt “verification code” tamper-proof সার্ভার সিগনেচার নয়।

## ধাপ ১: Public GitHub Pages App Repository
1. GitHub-এ নতুন `shikkha` নামে **public** repo খুলুন। (অন্য নাম হলেও হবে।)
2. এই ZIP-এর repo root-এর ৬টি app ফাইল upload করুন: `index.html`, `sw.js`, `manifest.webmanifest`, `tailwind-offline.css`, `icon-192.png`, `icon-512.png`। **শুধু `index.html` নয়।**
3. Repository → Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save। URL সাধারণত `https://jawdatjr.github.io/shikkha/`।
4. মোবাইলে URL প্রথমবার ইন্টারনেট থাকা অবস্থায় খুলুন। Android Chrome → Install app/Add to Home Screen; iPhone Safari → Share → Add to Home Screen। পৃষ্ঠা একবার লোড হয়ে ইনস্টল/ক্যাশ হওয়ার পর Airplane Mode-এ পরীক্ষা করুন।

## ধাপ ২: Private GitHub Data Repository
1. আলাদা **private** repo তৈরি করুন: `shikkha_backup`। এই repo-তে customer data থাকবে; public করবেন না।
2. GitHub Settings → Developer settings → Personal access tokens → Fine-grained token; কেবল এই private data repo-র জন্য `Contents: Read and write` অনুমতি দিন। Expiration ও revocation policy ঠিক করুন। এই token কোনো HTML/JS/README/GitHub public code repo-তে দেবেন না।

## ধাপ ৩: Cloudflare Worker Gateway
1. Cloudflare account তৈরি/লগইন করুন। কম্পিউটারে Node.js থাকলে `cloudflare-worker` ডিরেক্টরিতে যান। `npx wrangler login` চালান।
2. `cloudflare-worker/wrangler.toml`-এর `[vars]`-এ আপনার `GH_OWNER`, `GH_REPO`, `ALLOWED_ORIGIN` (যেমন `https://jawdatjr.github.io`; **পথ `/repo/` নয়**) এবং `GH_BRANCH` সেট করুন। একাধিক subdomain নয়—একটি নির্দিষ্ট origin অনুমোদিত।
3. ওই directory থেকে এই দুটি secret যোগ করুন:

```sh
npx wrangler secret put GH_TOKEN
npx wrangler secret put SALESMAN_KEYS
```

`GH_TOKEN`-এ আপনার private repo fine-grained token দিন। `SALESMAN_KEYS`-এর input একটি JSON object হবে, যেমন **বাস্তবে নতুন শক্তিশালী ও আলাদা key তৈরি করবেন**:

```json
{"Salesman 01":"REPLACE_WITH_RANDOM_SECRET_OF_32_PLUS_CHARACTERS","Salesman 02":"REPLACE_WITH_ANOTHER_RANDOM_SECRET_OF_32_PLUS_CHARACTERS"}
```

Python দিয়ে key তৈরি করতে পারেন: `python -c "import secrets; print(secrets.token_urlsafe(32))"`। JSONটি কেবল Worker secret-এ পেস্ট করবেন; GitHub-এ commit করবেন না।
4. চালান `npx wrangler deploy`। deployed Worker URL (উদাহরণ `https://ashik-shikkha-sync.<YOURSUBDOMAIN>.workers.dev`) লিখে রাখুন।
5. প্রত্যেক সেলসম্যান তার ফোনের অ্যাপে **Settings → Auto GitHub Backup**-এ Worker URL, নিজের Salesman নাম ও নিজের Sync Key দিয়ে “সংযোগ সেভ” করবে। তারপর **এখনই Sync** দিয়ে status দেখবে।
6. Private data repo-তে `data/ledger.json` নতুন commit হয়েছে কি না নিশ্চিত করুন। অন্য ফোনে একই PWA install করে অন্য Salesman Key দিয়ে data পড়া যাচ্ছে কি না যাচাই করুন।

## Daily Work & Safety
- Create/edit receipt → ফোনে আগে save → internet ফিরে/অ্যাপ খোলা থাকলে auto GitHub commit → অন্য ফোনে sync।
- Delete receipt/expense → কারণ দিন → confirm → History-তে Deleted History → GitHub event `action=delete` ও actor/serverAt।
- Settings-এ conflict দেখালে **আগে JSON backup** নিয়ে তারপর কোন ফোনের পরিবর্তন রাখবেন ঠিক করুন। অন্যের সংশোধন নীরবে overwrite হয় না।
- **Previous version migration:** পুরনো অ্যাপ থেকে JSON backup নিন; নতুন GitHub Pages অ্যাপে JSON restore করুন। আগের ব্রাউজারে demo records থাকলে ক্লাউড সংযোগের **আগে** পরীক্ষা করুন, কারণ migration বিদ্যমান local data-ও queue করবে।
- Audit deletion log এই সংস্করণ থেকে শুরু হয়। আগের সংস্করণে ডিলিট হয়ে যাওয়া রিসিপ্ট/কারণ পরে পুনর্গঠন করা যায় না।
- Worker backend-এ যে account key মেলে সেটিই verified actor name। Remote sync-এ হারানো local data recovery সীমিত হলে private GitHub repo-র ইতিহাস থেকে ledger restore করতে হবে।

## টেকনিক্যাল সীমাবদ্ধতা ও নিরাপত্তা
- App data localStorage-এ; browser/site-data সাফ হলে হারাতে পারে। খুব বেশি entry হলে localStorage quota সীমায় পৌঁছাতে পারে। বহু বছরের হিসাব/বড় দল হলে IndexedDB + proper transactional cloud DB উপযুক্ত।
- Worker-এর Github Contents API write concurrent update-এ optimistic SHA version ও retry ব্যবহার করে; প্রতিটি record-এর event base ID দিয়ে conflict শনাক্ত করে; একই event আবার পাঠালেও duplicate save হয় না।
- Github snapshot-এর প্রতিটি change commit হয়; অতি ঘন sync-এ GitHub API rate limit, latency, এবং private repo file size limitation দেখা দিতে পারে।
- Worker credentials চুরি হলে বৈধ সেলসম্যানের মতো কাজ করা সম্ভব। Worker key mobile localStorage-এ থাকে; device unlock, HTTPS, GitHub token scope ও periodic key rotation জরুরি।
- গ্রাহক পরিচিতি/মোবাইল ডেটা সুরক্ষার জন্য private repo settings, GitHub/Cloudflare access review এবং প্রয়োজনে authenticated enterprise backend বিবেচনা করুন।
- Full end-to-end deployment/private GitHub account ও real Android/iPhone testing setup-এর পরে করতে হবে। অন্তর্ভুক্ত পরীক্ষায় JavaScript syntax, Worker mock API, Playwright-simulated UI & two-phone event exchange যাচাই করা হয়েছে।

## Current deployment
- Source: https://github.com/jawdatjr/shikkha
- Target Pages URL: https://jawdatjr.github.io/shikkha/ (only after Pages deployment succeeds)
- Data repo: `jawdatjr/shikkha_backup` (private)
- Cloud sync needs Cloudflare Worker deployment plus GH_TOKEN and SALESMAN_KEYS configured privately. No real cloud backup until then.


## Mobile-first UI (2026-10-17)

The app is designed for phone use (Android Chrome or iPhone Safari) and adapts its layout based on screen width. Changes include a compact mobile header, five-item navigation with a More menu, a touch-friendly receipt save/preview bar, collapsible design options, receipt/deletion history tabs, mobile-friendly balances and payment ledger cards, and narrower receipt previews.

**Open this URL on your phone:** https://jawdatjr.github.io/shikkha/

**Install:** Android Chrome → menu → Add to Home Screen / Install app. iPhone Safari → Share → Add to Home Screen.

**Offline:** Complete the first online load, then test Airplane Mode. Use the same installed app on that device so that browser local data persists. Never clear the site's storage without making a JSON backup.

**Cloud backup status:** NOT CONNECTED yet. Two connected GitHub repositories alone do not activate online data sync. The Cloudflare Worker must be securely deployed with scoped credentials and configured inside the app. Each phone must complete its first sync online. Offline changes are local until confirmed synced.
