<div align="center">

# 📊 TGJU Price API on Cloudflare Workers
### وب‌سرویس نرخ لحظه‌ای ارز، طلا، سکه و رمزارز بر بستر کلودفلر

[![Platform](https://img.shields.io/badge/Platform-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Runtime](https://img.shields.io/badge/Runtime-ES%20Modules-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)]()

**[🇬🇧 English Documentation](#-english-documentation) | [🇮🇷 مستندات فارسی](#-مستندات-فارسی)**

</div>

---

<a id="-english-documentation"></a>

## 🇬🇧 English Documentation

A lightweight, fast, and serverless REST API built on **Cloudflare Workers** that fetches, normalizes, and caches real-time prices for currencies (IRR), gold, coins, cryptocurrencies, and global commodities from **TGJU** (`tgju.org`).

### ✨ Key Features
* **⚡ Edge Caching:** Built-in caching (default `30s` TTL) ensures ultra-low latency and protects the upstream server regardless of your traffic volume.
* **🧹 Data Normalization:**
  * Automatically calculates `price_toman` (`IRR ÷ 10`) for Iranian Rial items.
  * Fixes unsigned change values (`d` and `dp`) from upstream into signed `change` and `change_percent` based on market direction (`up` / `down` / `flat`).
  * Converts Tehran local timestamps (`+03:30`) to standard **ISO 8601 UTC** (`updated_at`).
* **🕒 Stale Data Detection:** Calculates item age (`age_seconds`) and flags outdated keys (`stale: true`) based on a configurable threshold (default 24 hours).
* **🔄 Multi-Upstream Failover:** Supports multiple upstream endpoints separated by commas.
* **🔐 Optional API Key Auth:** Easily lock your worker using `API_KEYS` secret via header or query string.
* **🔍 1,050+ Symbols:** Built-in aliases for popular items, 3-letter ISO currency codes, and full search across all ~1,050 raw upstream keys.

---

### 🌐 Live Demo & Quick Test

A public demo instance is deployed for **testing and evaluation**:

* **Base URL:** `https://noisy-tooth-7596.wfm4x8ckcs.workers.dev`
* 🔗 [Default Prices (`/v1/prices`)](https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/prices)
* 🔗 [Single Symbol - USD (`/v1/price/usd`)](https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/price/usd)
* 🔗 [Built-in Symbols List (`/v1/symbols`)](https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/symbols)
* 🔗 [Search Keys (`/v1/search?q=tether`)](https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/search?q=tether)

> ### ⚠️ Important Warning (Rate Limits & Fair Use)
> **Cloudflare Workers Free Tier has a strict limit of 100,000 requests per day.**
> * **DO NOT use the demo URL (`noisy-tooth-7596.wfm4x8ckcs.workers.dev`) in production, bots, or live applications.**
> * Exceeding the daily quota will bring down the demo for everyone, and API key restrictions may be enabled on the demo URL at any time without notice.
> * **Solution:** Deploy your own instance on your own Cloudflare account in under 2 minutes (instructions below) and manage your own `API_KEYS`.

---

### 🚀 Installation & Deployment

#### Method 1: Using Wrangler CLI (Recommended)
**Prerequisites:** Node.js (v18+) and a free Cloudflare account.

```bash
# 1. Install dependencies
npm install

# 2. Authenticate with your Cloudflare account
npx wrangler login

# 3. Run locally for development & testing (http://localhost:8787)
npm run dev

# 4. Deploy to Cloudflare global network
npm run deploy
```

#### Method 2: Without Node.js (Cloudflare Dashboard)
1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **Create**.
2. Paste the contents of `src/index.js` into the worker editor and click **Deploy**.
3. Go to **Settings** → **Variables and Secrets** and add the variables from `wrangler.toml` (`UPSTREAMS`, `CACHE_TTL`, `STALE_SECONDS`).

---

### ⚙️ Configuration & Authentication

Environment variables are configured in `wrangler.toml`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `UPSTREAMS` | `https://call5.tgju.org/ajax.json,https://call.tgju.org/ajax.json` | Comma-separated upstream URLs tried in order. |
| `CACHE_TTL` | `"30"` | Cache duration in seconds (Do not set below `10`). |
| `STALE_SECONDS` | `"86400"` | Threshold in seconds (default 24h) to mark data as `stale: true`. |
| `API_KEYS` | *(Empty / Public)* | Comma-separated secret keys for authentication. |

#### Locking the API with Secret Keys (Optional)
To protect your worker quota from unauthorized access:

```bash
npx wrangler secret put API_KEYS
# Enter your comma-separated keys when prompted, e.g.: key1,key2
```

Clients can authenticate using either:
* **HTTP Header:** `x-api-key: key1`
* **Query Parameter:** `?key=key1`

---

### 📡 API Endpoints

| Endpoint | Description |
| :--- | :--- |
| `GET /v1/prices?symbols=usd,eur,usdt` | Fetch multiple symbols (Default: `usd,eur,usdt,gold18,coin`) |
| `GET /v1/price/{symbol}` | Fetch a single symbol (Returns `404` with `suggestions` if not found) |
| `GET /v1/symbols` | List all built-in symbol aliases and their mapped keys |
| `GET /v1/search?q=tether` | Search across all ~1,050 raw upstream keys |
| `GET /v1/raw` & `GET /v1/raw?item=KEY` | List all raw keys or inspect a specific raw item (for debugging) |

#### What can `{symbol}` be?
1. **Built-in Aliases:**
   * **Currencies:** `usd`, `eur`, `gbp`, `aed`, `try`, `usdt`, `usd_ice_sell`, `usd_ice_buy`
   * **Gold & Coins:** `gold18`, `gold24`, `mesghal`, `coin`, `coin_bahar`, `coin_half`, `coin_quarter`, `coin_gerami`
   * **Crypto:** `btc`, `btc_irr`, `eth`, `eth_irr`
   * **Global & Market:** `ounce`, `silver`, `brent`, `eurusd`, `tedpix`
2. **Any 3-Letter Currency Code:** `cad`, `aud`, `chf`, `cny`, `jpy`, `rub`, `sar`, `iqd`, `kwd`, etc. (maps to `price_<code>`).
3. **Raw Upstream Key:** Any key found via `/v1/search` (e.g., `price_dollar_rl`).

---

### 📦 Sample Response

```json
{
  "ok": true,
  "source": "https://call5.tgju.org/ajax.json",
  "cached": false,
  "data": {
    "usd": {
      "symbol": "usd",
      "key": "price_dollar_rl",
      "name": "دلار آمریکا (بازار آزاد)",
      "unit": "IRR",
      "price": 2599000,
      "price_toman": 259900,
      "high": 2639000,
      "low": 2598600,
      "change": -40000,
      "change_percent": -1.54,
      "direction": "down",
      "updated_at": "2026-11-10T16:29:55.000Z",
      "updated_at_local": "2026-11-10 19:59:55",
      "age_seconds": 120,
      "stale": false
    }
  },
  "missing": []
}
```

---

### 💻 Code Examples

> **Note:** Replace `https://noisy-tooth-7596.wfm4x8ckcs.workers.dev` with your own deployed Worker URL in production!

#### cURL
```bash
curl -X GET "https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/prices?symbols=usd,usdt,btc" \
     -H "x-api-key: YOUR_API_KEY"
```

#### JavaScript / TypeScript (Fetch)
```javascript
const WORKER_URL = "https://noisy-tooth-7596.wfm4x8ckcs.workers.dev";
const API_KEY = ""; // Optional: your secret key

async function fetchPrices(symbols = ["usd", "usdt", "gold18", "coin"]) {
  const url = `${WORKER_URL}/v1/prices?symbols=${symbols.join(",")}`;
  const headers = API_KEY ? { "x-api-key": API_KEY } : {};

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const { data } = await res.json();
  console.log(`USD: ${data.usd.price_toman.toLocaleString()} Toman (${data.usd.change_percent}%)`);
  return data;
}

fetchPrices();
```

#### Python (`requests`)
```python
import requests

WORKER_URL = "https://noisy-tooth-7596.wfm4x8ckcs.workers.dev"
API_KEY = ""  # Optional: your secret key

headers = {"x-api-key": API_KEY} if API_KEY else {}
resp = requests.get(f"{WORKER_URL}/v1/prices?symbols=usd,gold18,coin", headers=headers, timeout=10)
resp.raise_for_status()

data = resp.json()["data"]
print(f"USD: {data['usd']['price_toman']:,} Toman | Change: {data['usd']['change_percent']}%")
```

---

### 🛠️ Troubleshooting & Important Data Notes

* **Units:** `unit: "IRR"` means Iranian Rial (`price_toman = price / 10`). `unit: "USD"` is used for global crypto/commodities. Unmapped raw keys use heuristic unit detection.
* **Stale Keys:** Some raw keys in TGJU have not been updated in years (e.g., `usdt-irr` since 2020). Always check `stale: false` or stick to built-in `/v1/symbols`.
* **`upstream_failed` / HTTP 403:** If TGJU blocks Cloudflare Worker IPs, set up a lightweight reverse proxy on your own VPS that mirrors `https://call5.tgju.org/ajax.json` and add its URL to `UPSTREAMS`.
* **Terms of Use:** Review TGJU's terms of service before public or commercial usage, and secure your worker with `API_KEYS`.

---
---

<div dir="rtl">

<a id="-مستندات-فارسی"></a>

## 🇮🇷 مستندات فارسی

یک وب‌سرویس **Serverless API** سریع، سبک و پایدار بر بستر **Cloudflare Workers** برای دریافت لحظه‌ای قیمت دلار، یورو، تتر، طلا، سکه، رمزارزها، نفت و بیش از ۱۰۰۰ شاخص دیگر از منبع **TGJU (شبکه اطلاع‌رسانی طلا، سکه و ارز)** به همراه کش داخلی و نرمال‌سازی هوشمند داده‌ها.

### ✨ ویژگی‌های کلیدی
* **⚡ کش داخلی در لبه شبکه (Edge Caching):** ذخیره موقت پاسخ‌ها (پیش‌فرض ۳۰ ثانیه) که باعث می‌شود تعداد درخواست به سرور منبع مستقل از تعداد کاربران شما ثابت بماند و سرعت پاسخ‌دهی در حد میلی‌ثانیه باشد.
* **🧹 نرمال‌سازی و استانداردسازی داده‌ها:**
  * محاسبه خودکار قیمت به **تومان** (`price_toman`) برای آیتم‌های ریالی.
  * اصلاح علامت تغییرات قیمت (`change` و `change_percent`) به مقادیر علامت‌دار مثبت/منفی بر اساس جهت بازار (`up`، `down`، `flat`).
  * تبدیل زمان سرور منبع (به وقت تهران `+03:30`) به فرمت استاندارد جهانی **ISO 8601 UTC** (`updated_at`).
* **🕒 تشخیص داده‌های قدیمی (Stale Detection):** محاسبه سن داده (`age_seconds`) و علامت‌گذاری کلیدهای قدیمی و متروکه با `stale: true` (پیش‌فرض: قدیمی‌تر از ۲۴ ساعت).
* **🔄 پشتیبانی از چند منبع (Failover):** امکان تعریف چند آدرس در `UPSTREAMS` تا در صورت قطعی یکی، دیگری جایگزین شود.
* **🔐 احراز هویت با کلید API (اختیاری):** امکان قفل کردن دسترسی به API با تعریف `API_KEYS`.

---

### 🌐 پیش‌نمایش زنده (Live Demo) و تست سریع

یک نسخه از این پروژه جهت **تست و بررسی عملکرد** توسط توسعه‌دهندگان روی کلودفلر مستقر شده است:

* **آدرس پایه (Base URL):** `https://noisy-tooth-7596.wfm4x8ckcs.workers.dev`
* 🔗 [تست دریافت چند نماد اصلی (`/v1/prices`)](https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/prices)
* 🔗 [تست دریافت قیمت دلار (`/v1/price/usd`)](https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/price/usd)
* 🔗 [مشاهده لیست نمادهای آماده (`/v1/symbols`)](https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/symbols)
* 🔗 [جستجوی کلید تتر (`/v1/search?q=tether`)](https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/search?q=tether)

> ### ⚠️ هشدار بسیار مهم (محدودیت استفاده از آدرس دمو)
> پلن رایگان **Cloudflare Workers دارای محدودیت روزانه (۱۰۰,۰۰۰ درخواست در روز)** است.
> * آدرس `https://noisy-tooth-7596.wfm4x8ckcs.workers.dev` **صرفاً جهت تست و آشنایی با ساختار خروجی** قرار داده شده است.
> * **اکیداً از قرار دادن این آدرس در پروژه‌های واقعی، ربات‌ها یا محیط Production خودداری کنید**؛ زیرا با تکمیل سقف روزانه، سرویس متوقف شده و همچنین ممکن است هر لحظه روی آن قفل کلید (`API_KEYS`) فعال شود.
> * **راه‌حل:** طبق راهنمای زیر، در کمتر از ۲ دقیقه نسخه اختصاصی خودتان را روی اکانت کلودفلر خودتان دیپلوی کنید و کلید اختصاصی خود را مدیریت نمایید.

---

### 🚀 نصب و راه‌اندازی (Deployment)

#### روش اول: با استفاده از Wrangler CLI (پیشنهادی)
**پیش‌نیاز:** نصب بودن Node.js (نسخه ۱۸ به بالا) و یک اکانت رایگان کلودفلر.

</div>

```bash
# ۱. نصب وابستگی‌ها
npm install

# ۲. ورود به حساب کلودفلر
npx wrangler login

# ۳. تست محلی روی سیستم (http://localhost:8787)
npx wrangler dev

# ۴. انتشار روی شبکه کلودفلر
npx wrangler deploy
```

<div dir="rtl">

#### روش دوم: بدون نیاز به Node.js (از طریق داشبورد کلودفلر)
1. وارد داشبورد Cloudflare شوید و به مسیر **Workers & Pages** → **Create** بروید.
2. کد فایل `src/index.js` را در ویرایشگر Paste کرده و **Deploy** کنید.
3. در بخش **Settings** → **Variables and Secrets** متغیرهای داخل `wrangler.toml` را اضافه کنید.

---

### ⚙️ تنظیمات و قفل کردن با کلید API

متغیرهای پروژه در فایل `wrangler.toml` قابل تنظیم هستند:

| متغیر | مقدار پیش‌فرض | توضیح |
| :--- | :--- | :--- |
| `UPSTREAMS` | `https://call5.tgju.org/ajax.json,https://call.tgju.org/ajax.json` | آدرس‌های منبع (با کاما جدا شوند). به ترتیب امتحان می‌شوند. |
| `CACHE_TTL` | `"30"` | مدت زمان کش به ثانیه (کمتر از ۱۰ ثانیه نگذارید). |
| `STALE_SECONDS` | `"86400"` | آستانه قدیمی شدن داده به ثانیه (پیش‌فرض ۲۴ ساعت). |
| `API_KEYS` | *(خالی / عمومی)* | کلیدهای مجاز دسترسی به API (با کاما جدا شوند). |

#### فعال‌سازی کلید امنیتی (اختیاری ولی به شدت توصیه شده):
برای اینکه سایرین نتوانند سهمیه درخواست روزانه ورکر شما را مصرف کنند:

</div>

```bash
npx wrangler secret put API_KEYS
# کلیدهای مورد نظر را با کاما وارد کنید؛ مثلاً: key1,key2
```

<div dir="rtl">

**نحوه ارسال کلید توسط کلاینت:**
* **در هدر درخواست:** `x-api-key: key1`
* **در آدرس (Query String):** `?key=key1`

---

### 📡 جدول Endpointها

| مسیر | توضیح | لینک تست زنده |
| :--- | :--- | :--- |
| `/v1/prices?symbols=usd,eur,usdt` | دریافت چند نماد همزمان (پیش‌فرض: `usd,eur,usdt,gold18,coin`) | [تست](https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/prices?symbols=usd,eur,usdt) |
| `/v1/price/{symbol}` | دریافت یک نماد خاص | [تست](https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/price/usd) |
| `/v1/symbols` | فهرست نمادهای آماده (Aliases) | [تست](https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/symbols) |
| `/v1/search?q=tether` | جستجو بین همهٔ ~۱۰۵۰ کلید منبع | [تست](https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/search?q=tether) |
| `/v1/raw` و `/v1/raw?item=KEY` | فهرست کلیدها / مشاهده آیتم خام منبع (جهت عیب‌یابی) | [تست](https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/raw?item=price_dollar_rl) |

#### مقدار `{symbol}` چه چیزی می‌تواند باشد؟
1. **نمادهای آماده (Aliases):**
   * **ارزها:** `usd` `eur` `gbp` `aed` `try` `usdt` `usd_ice_sell` `usd_ice_buy`
   * **طلا و سکه:** `gold18` `gold24` `mesghal` `coin` `coin_bahar` `coin_half` `coin_quarter` `coin_gerami`
   * **رمزارز:** `btc` `btc_irr` `eth` `eth_irr`
   * **بازار جهانی و بورس:** `ounce` `silver` `brent` `eurusd` `tedpix`
2. **هر کد ارز سه حرفی:** مانند `cad` `aud` `chf` `cny` `jpy` `rub` `sar` `iqd` (معادل کلید `price_<code>`).
3. **کلید خام منبع:** هر کلیدی که از `/v1/search` پیدا کنید. (در صورت پیدا نشدن نماد، کد `404` به همراه `suggestions` برمی‌گردد).

---

### 💻 مثال‌های کاربردی در زبان‌های مختلف

> 💡 **تذکر:** در محیط واقعی، حتماً آدرس ورکر اختصاصی خودتان را جایگزین آدرس دمو کنید.

#### ۱. خط فرمان (cURL)
</div>

```bash
curl "https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/prices?symbols=usd,usdt,coin" \
     -H "x-api-key: YOUR_API_KEY"
```

<div dir="rtl">

#### ۲. جاوااسکریپت (Node.js / Browser Fetch)
</div>

```javascript
const WORKER_URL = "https://noisy-tooth-7596.wfm4x8ckcs.workers.dev";
const API_KEY = ""; // در صورت فعال بودن قفل، کلید خود را وارد کنید

async function getPrices(symbols = ["usd", "usdt", "gold18", "coin"]) {
  const url = `${WORKER_URL}/v1/prices?symbols=${symbols.join(",")}`;
  const headers = API_KEY ? { "x-api-key": API_KEY } : {};

  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

  const result = await response.json();
  const usd = result.data.usd;
  console.log(`💵 ${usd.name}: ${usd.price_toman.toLocaleString("fa-IR")} تومان`);
  console.log(`📊 تغییرات: ${usd.change_percent}% (${usd.direction})`);
}

getPrices();
```

<div dir="rtl">

#### ۳. پایتون (Python)
</div>

```python
import requests

WORKER_URL = "https://noisy-tooth-7596.wfm4x8ckcs.workers.dev"
API_KEY = ""  # کلید اختصاصی شما

def fetch_symbol(symbol: str):
    headers = {"x-api-key": API_KEY} if API_KEY else {}
    r = requests.get(f"{WORKER_URL}/v1/price/{symbol}", headers=headers, timeout=10)
    if r.status_code == 404:
        print("نماد پیدا نشد! پیشنهادها:", r.json().get("suggestions"))
        return None
    r.raise_for_status()
    return r.json()["data"]

coin = fetch_symbol("coin")
if coin:
    print(f"{coin['name']}: {coin['price_toman']:,} تومان")
```

<div dir="rtl">

#### ۴. پی‌اچ‌پی (PHP)
</div>

```php
<?php
$url = "https://noisy-tooth-7596.wfm4x8ckcs.workers.dev/v1/prices?symbols=usd,usdt,gold18";
$apiKey = ""; // کلید اختصاصی شما

$ch = curl_init($url);
$headers = ["Accept: application/json"];
if ($apiKey) $headers[] = "x-api-key: $apiKey";

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => $headers
]);

$res = curl_exec($ch);
curl_close($ch);

$data = json_decode($res, true);
if (!empty($data['ok'])) {
    echo "دلار آزاد: " . number_format($data['data']['usd']['price_toman']) . " تومان";
}
```

<div dir="rtl">

---

### 🛠️ نکات مهم دادهٔ منبع و عیب‌یابی

* **واحد پول (`unit`):** مقدار `IRR` یعنی ریال (`price_toman` = ریال ÷ ۱۰). مقدار `USD` برای کریپتو و کالاهای جهانی است. برای کلیدهای خامی که در لیست نمادهای آماده نیستند، واحد به صورت حدسی (Heuristic) تشخیص داده می‌شود.
* **علامت تغییرات:** منبع اصلی مقادیر `d` و `dp` را همیشه مثبت می‌دهد و جهت را در `dt` می‌گذارد (`low` = کاهش). این API آن را به `change` و `change_percent` علامت‌دار تبدیل می‌کند.
* **داده‌های قدیمی (`stale`):** برخی کلیدهای منبع سال‌هاست به‌روز نشده‌اند (مثلاً `usdt-irr` از سال ۲۰۲۰). فلگ `stale: true` یعنی داده قدیمی‌تر از `STALE_SECONDS` (پیش‌فرض ۲۴ ساعت) است. نمادهای آماده (`/v1/symbols`) همگی به کلیدهای زنده اشاره می‌کنند.
* **خطای `upstream_failed` / `403`:** ممکن است فایروال TGJU آی‌پی کلودفلر را مسدود کند. در این حالت یک پروکسی ساده روی سرور شخصی (VPS) بگذارید که همان فایل JSON را برگرداند و آدرس آن را در ابتدای `UPSTREAMS` قرار دهید.
* **مسئولیت استفاده:** پیش از ارائهٔ عمومی یا تجاری، شرایط استفادهٔ وب‌سایت TGJU را بررسی کنید و ترجیحاً API خود را با `API_KEYS` محدود نمایید.

</div>