// TGJU Price API — Cloudflare Worker
// ساختار منبع (تأیید شده با /v1/raw): { current: { "<key>": { p, h, l, d, dp, dt, t, ts } } }
//  p=قیمت  h=بیشترین  l=کمترین  d=مقدار تغییر (همیشه مثبت)  dp=درصد تغییر (مثبت)
//  dt="high"|"low"|"" یعنی افزایش|کاهش|بدون تغییر   ts=زمان به وقت تهران (+03:30)

const TEHRAN = "+03:30";

// نمادهای آماده. unit: IRR=ریال، USD=دلار
const ALIASES = {
  usd:   { key: "price_dollar_rl", name: "دلار آمریکا (بازار آزاد)", unit: "IRR" },
  eur:   { key: "price_eur", name: "یورو", unit: "IRR" },
  gbp:   { key: "price_gbp", name: "پوند انگلیس", unit: "IRR" },
  aed:   { key: "price_aed", name: "درهم امارات", unit: "IRR" },
  try:   { key: "price_try", name: "لیر ترکیه", unit: "IRR" },
  usdt:  { key: "crypto-tether-irr", name: "تتر (ریال)", unit: "IRR" },
  btc:   { key: "crypto-bitcoin", name: "بیت‌کوین (دلار)", unit: "USD" },
  btc_irr: { key: "crypto-bitcoin-irr", name: "بیت‌کوین (ریال)", unit: "IRR" },
  eth:   { key: "crypto-ethereum", name: "اتریوم (دلار)", unit: "USD" },
  eth_irr: { key: "crypto-ethereum-irr", name: "اتریوم (ریال)", unit: "IRR" },
  gold18: { key: "geram18", name: "طلای ۱۸ عیار (گرم)", unit: "IRR" },
  gold24: { key: "geram24", name: "طلای ۲۴ عیار (گرم)", unit: "IRR" },
  mesghal: { key: "mesghal", name: "مثقال طلا", unit: "IRR" },
  coin:  { key: "sekee", name: "سکه امامی", unit: "IRR" },
  coin_bahar: { key: "sekeb", name: "سکه بهار آزادی", unit: "IRR" },
  coin_half:  { key: "nim", name: "نیم سکه", unit: "IRR" },
  coin_quarter: { key: "rob", name: "ربع سکه", unit: "IRR" },
  coin_gerami: { key: "gerami", name: "سکه گرمی", unit: "IRR" },
  ounce: { key: "ons", name: "اونس طلا", unit: "USD" },
  silver: { key: "silver", name: "اونس نقره", unit: "USD" },
  brent: { key: "oil_brent", name: "نفت برنت", unit: "USD" },
  usd_ice_sell: { key: "ice_transfer_usd_sell", name: "دلار حواله مرکز مبادله (فروش)", unit: "IRR" },
  usd_ice_buy:  { key: "ice_transfer_usd_buy", name: "دلار حواله مرکز مبادله (خرید)", unit: "IRR" },
  eurusd: { key: "eur-usd-ask", name: "یورو/دلار", unit: "USD" },
  tedpix: { key: "bourse", name: "شاخص کل بورس", unit: "points" },
};
const DEFAULT_SYMBOLS = ["usd", "eur", "usdt", "gold18", "coin"];

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "x-api-key, content-type",
  "access-control-allow-methods": "GET, OPTIONS",
};
const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS, ...extra },
  });

const toNum = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/[,٬\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

// ---------- دریافت و کش منبع ----------
async function fetchUpstream(env, ctx) {
  const ttl = Number(env.CACHE_TTL || 30);
  const cache = caches.default;
  const cacheKey = new Request("https://cache.internal/tgju-upstream");
  const hit = await cache.match(cacheKey);
  if (hit) return { ...(await hit.json()), cached: true };

  const urls = (env.UPSTREAMS || "").split(",").map((s) => s.trim()).filter(Boolean);
  let lastErr = "no upstream configured";
  for (const url of urls) {
    try {
      const r = await fetch(`${url}?_=${Date.now()}`, {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; PriceAPI/1.0)",
          referer: "https://www.tgju.org/",
          accept: "application/json",
        },
      });
      if (!r.ok) { lastErr = `${url} -> HTTP ${r.status}`; continue; }
      const data = await r.json();
      const current = data.current;
      if (!current || typeof current !== "object") { lastErr = `${url} -> unexpected shape`; continue; }
      const payload = { source: url, fetched_at: new Date().toISOString(), current };
      ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json", "cache-control": `max-age=${ttl}` },
      })));
      return { ...payload, cached: false };
    } catch (e) { lastErr = `${url} -> ${e.message}`; }
  }
  throw new Error(lastErr);
}

// ---------- پیدا کردن آیتم ----------
// عمداً فازی نیست: قیمت اشتباه بدتر از 404 است.
function resolve(symbol, current) {
  const s = symbol.toLowerCase();
  const alias = ALIASES[s];
  let key = alias?.key;
  if (!key && current[symbol]) key = symbol;                          // کلید خام
  if (!key && current[s]) key = s;
  if (!key && /^[a-z]{3}$/.test(s) && current[`price_${s}`]) key = `price_${s}`; // هر ارز سه‌حرفی
  if (!key || !current[key]) return null;
  return { key, item: current[key], alias };
}

function guessUnit(key) {
  if (/^crypto[-_]/.test(key)) return key.endsWith("-irr") ? "IRR" : "USD";
  if (/^price_|^geram|^sekee|^sekeb|^rob|^nim|^mesghal|^gerami|^retail_|^ice_|_sell$|_buy$/.test(key)) return "IRR";
  return null;
}

function normalize(symbol, found, staleSec) {
  const { key, item, alias } = found;
  const unit = alias?.unit ?? guessUnit(key);
  const price = toNum(item.p);
  const d = toNum(item.d), dp = toNum(item.dp);
  const sign = item.dt === "low" ? -1 : item.dt === "high" ? 1 : 0;
  let iso = null, age = null;
  if (item.ts) {
    const ms = Date.parse(`${String(item.ts).replace(" ", "T")}${TEHRAN}`);
    if (!Number.isNaN(ms)) { iso = new Date(ms).toISOString(); age = Math.max(0, Math.round((Date.now() - ms) / 1000)); }
  }
  return {
    symbol, key,
    name: alias?.name ?? null,
    unit,
    price,
    price_toman: unit === "IRR" && price !== null ? price / 10 : null,
    high: toNum(item.h),
    low: toNum(item.l),
    change: d === null ? null : sign * d,
    change_percent: dp === null ? null : sign * dp,
    direction: sign > 0 ? "up" : sign < 0 ? "down" : "flat",
    updated_at: iso,
    updated_at_local: item.ts ?? null,
    age_seconds: age,
    stale: age === null ? null : age > staleSec,
  };
}

function authorized(req, env) {
  if (!env.API_KEYS) return true;
  const url = new URL(req.url);
  const key = req.headers.get("x-api-key") || url.searchParams.get("key");
  return !!key && env.API_KEYS.split(",").map((s) => s.trim()).includes(key);
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (req.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405);

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/") {
      return json({
        ok: true,
        service: "tgju-price-api",
        endpoints: {
          "GET /v1/prices?symbols=usd,eur,usdt": "قیمت چند نماد",
          "GET /v1/price/{symbol}": "قیمت یک نماد (نماد آماده، ارز سه‌حرفی مثل cad، یا کلید خام)",
          "GET /v1/symbols": "نمادهای آماده",
          "GET /v1/search?q=tether": "جستجو بین همهٔ کلیدهای منبع",
          "GET /v1/raw[?item=KEY]": "فهرست کلیدها یا آیتم خام (عیب‌یابی)",
        },
        auth: env.API_KEYS ? "x-api-key header or ?key=" : "none",
        notes: "unit=IRR یعنی ریال (price_toman = ریال÷۱۰). change و change_percent علامت‌دارند. stale=true یعنی داده قدیمی است.",
      });
    }

    if (!authorized(req, env)) return json({ ok: false, error: "unauthorized" }, 401);

    if (path === "/v1/symbols") {
      return json({ ok: true, symbols: Object.fromEntries(Object.entries(ALIASES).map(([k, v]) => [k, { name: v.name, unit: v.unit, key: v.key }])), also: "هر کد ارز سه‌حرفی (cad, aud, chf, cny, jpy, rub, sar ...) و هر کلید خام منبع" });
    }

    let up;
    try { up = await fetchUpstream(env, ctx); }
    catch (e) { return json({ ok: false, error: "upstream_failed", detail: e.message }, 502); }

    const staleSec = Number(env.STALE_SECONDS || 86400);
    const meta = { source: up.source, fetched_at: up.fetched_at, cached: up.cached };
    const cacheHdr = { "cache-control": `public, max-age=${Number(env.CACHE_TTL || 30)}` };
    const keys = Object.keys(up.current);

    if (path === "/v1/raw") {
      const item = url.searchParams.get("item");
      if (item) return json({ ok: true, ...meta, key: item, raw: up.current[item] ?? null });
      return json({ ok: true, ...meta, total_keys: keys.length, keys });
    }

    if (path === "/v1/search") {
      const q = (url.searchParams.get("q") || "").toLowerCase();
      if (!q) return json({ ok: false, error: "missing_q" }, 400);
      const hits = keys.filter((k) => k.toLowerCase().includes(q)).sort((a, b) => a.length - b.length).slice(0, 50);
      return json({ ok: true, ...meta, count: hits.length, results: hits.map((k) => normalize(k, { key: k, item: up.current[k] }, staleSec)) }, 200, cacheHdr);
    }

    if (path.startsWith("/v1/price/")) {
      const sym = decodeURIComponent(path.slice("/v1/price/".length));
      const found = resolve(sym, up.current);
      if (!found) {
        const s = sym.toLowerCase();
        return json({ ok: false, error: "symbol_not_found", symbol: sym, suggestions: keys.filter((k) => k.toLowerCase().includes(s)).slice(0, 8) }, 404);
      }
      return json({ ok: true, ...meta, data: normalize(sym.toLowerCase(), found, staleSec) }, 200, cacheHdr);
    }

    if (path === "/v1/prices") {
      const list = (url.searchParams.get("symbols") || DEFAULT_SYMBOLS.join(","))
        .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);
      const data = {}, missing = [];
      for (const s of list) {
        const f = resolve(s, up.current);
        if (f) data[s.toLowerCase()] = normalize(s.toLowerCase(), f, staleSec); else missing.push(s);
      }
      return json({ ok: true, ...meta, data, missing }, 200, cacheHdr);
    }

    return json({ ok: false, error: "not_found" }, 404);
  },
};
