// nmplotter-routes — Cloudflare Worker: a tiny cloud library for NM Plotter.
// ---------------------------------------------------------------------------
// Stores planned ROUTES and recorded FLIGHTS as opaque JSON blobs so you can
// PUSH from one device and PULL on another. The Worker never interprets the
// content — it's opaque JSON either way.
//
// HARD RULE this design serves: there is NO automatic sync. The app only ever
// calls this at explicit push/pull moments. Pull copies data into the device's
// LOCAL working copy; nothing here can change anything already in use.
//
// COLLECTIONS: the first path segment selects a collection. Each lives under
// its own KV prefix, so routes and flights never collide:
//     /routes            /routes/:id      -> ns:route:<id>
//     /flights           /flights/:id     -> ns:flight:<id>
// (The routes prefix is unchanged from v1, so routes pushed earlier still list.)
//
// Auth model (v1, deliberately light): the client sends a header
//     X-Library-Key: <passphrase>
// Everything under one passphrase is one private library, namespaced by a
// SHA-256 of the key (the raw passphrase is never used as a storage key).
// A WRONG key is therefore not refused — it simply addresses a library that
// does not exist and gets an empty list back. The passphrase is the only thing
// protecting the data, so it should be long.
//
// ---------------------------------------------------------------------------
// SETUP is unchanged: one KV namespace bound as ROUTES, ALLOWED_ORIGINS below,
// then deploy. (The binding is still named ROUTES; it now holds flights too.)
//
// TEST (replace HOST + KEY):
//   PUT:   curl -X PUT "https://HOST/flights/123" -H "X-Library-Key: KEY" \
//            -H "Content-Type: application/json" -d '{"name":"Test","points":[]}'
//   LIST:  curl "https://HOST/flights"     -H "X-Library-Key: KEY"
//   GET:   curl "https://HOST/flights/123" -H "X-Library-Key: KEY"
//   DELETE:curl -X DELETE "https://HOST/flights/123" -H "X-Library-Key: KEY"
//
// ---------------------------------------------------------------------------
// 2026-08-09 — LIST NAMES COME FROM THE RECORD, NOT FROM ITS METADATA.
// The plain list used to read each name from the KV list metadata written at
// PUT time. Tested against this Worker live, that metadata came back carrying
// ANOTHER record's name, while ?full=1 — which reads the stored body — was
// always right. Since the plain list is what the Saved Routes cloud list shows
// and what the waypoint uploader checks against, wrong names there are the
// names you see. It now opens each record and reads the name out of the record
// itself, and falls back to the metadata name only if the body cannot be read.
// Cost: one KV read per record, which is what ?full=1 already did.
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = [
  'https://danielfuchsnuernberg.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];

// Allowed collections -> { KV key prefix, max body bytes }.
// routes keep the original 'route' prefix so nothing pushed earlier is orphaned.
const COLLECTIONS = {
  routes:  { prefix: 'route',  max: 256 * 1024 },
  flights: { prefix: 'flight', max: 4 * 1024 * 1024 }, // GPS tracks are bigger
  waypoints: { prefix: 'waypoint', max: 256 * 1024 },
  times:   { prefix: 'time',   max: 256 * 1024 },   // engine/skids records
};

// ---------------------------------------------------------------------------
// OCR: read the Name + Latitude + Longitude off a PHOTOGRAPHED Google Earth
// "Edit Placemark" dialog (a picture of a screen). Uses a Cloudflare-HOSTED
// vision model, so it bills in Neurons and the free 10,000/day allowance
// applies — light daily use is effectively free. The model only READS the
// characters; the arithmetic (DMS -> decimal) is done here, deterministically.
const OCR_MODEL = '@cf/mistralai/mistral-small-3.1-24b-instruct';
const OCR_MAX_BYTES = 6 * 1024 * 1024; // reject oversized uploads

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Library-Key',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

async function libHash(key) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Pull the first {...} object out of a model reply that may wrap it in prose
// or ```code fences```. Returns the parsed object, or null if none/!valid.
// Workers AI returns model output in different shapes depending on the model:
// a plain { response: "text" }, a nested { response: {...} }, or an OpenAI-style
// { choices: [{ message: { content } }] }. Normalise any of them to a STRING so
// we can both parse the JSON out of it and show something readable if we can't.
function pickText(out) {
  if (out == null) return '';
  if (typeof out === 'string') return out;
  const r = out.response;
  if (typeof r === 'string') return r;
  if (Array.isArray(out.choices) && out.choices[0]) {
    const m = out.choices[0].message || out.choices[0];
    if (m && typeof m.content === 'string') return m.content;
    if (m && Array.isArray(m.content)) {
      return m.content.map((p) => (p && typeof p.text === 'string' ? p.text : '')).join(' ');
    }
  }
  if (r && typeof r === 'object') {
    if (typeof r.content === 'string') return r.content;
    try { return JSON.stringify(r); } catch (_) { return ''; }
  }
  if (typeof out.text === 'string') return out.text;
  if (typeof out.description === 'string') return out.description;
  try { return JSON.stringify(out); } catch (_) { return ''; }
}

function extractJson(text) {
  if (!text) return null;
  const t = String(text).replace(/```json/gi, '').replace(/```/g, '');
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (_) { return null; }
}

// Parse ONE coordinate component to signed decimal degrees. Accepts decimal
// (-7.83 / 7.83 S) or DMS (7°49'50.65"S, "7 49 50.65 S", "S7 49 50"). This
// mirrors the app's own parser so the Worker and the app agree on the number.
function parseComponent(str) {
  if (!str) return NaN;
  let s = String(str).trim()
    .replace(/[\u2033"\u201d]/g, '"')   // ″ " ” -> "
    .replace(/[\u2032'\u2019]/g, "'")   // ′ ' ’ -> '
    .replace(/\s+/g, ' ')
    .trim();
  let sign = 1;
  const hemi = s.match(/([NSEWnsew])\s*$/) || s.match(/^\s*([NSEWnsew])/);
  if (hemi) {
    const h = hemi[1].toUpperCase();
    if (h === 'S' || h === 'W') sign = -1;
    s = s.replace(/[NSEWnsew]/g, ' ').trim();
  }
  if (s.startsWith('-')) { sign *= -1; s = s.slice(1).trim(); }
  if (s.startsWith('+')) { s = s.slice(1).trim(); }
  const nums = s.match(/\d+(?:\.\d+)?/g);
  if (!nums) return NaN;
  const deg = parseFloat(nums[0]) || 0;
  // A lone number is decimal degrees; two or three are D M [S].
  if (nums.length === 1) return sign * deg;
  const min = parseFloat(nums[1]) || 0;
  const sec = nums.length > 2 ? (parseFloat(nums[2]) || 0) : 0;
  return sign * (deg + min / 60 + sec / 3600);
}

// Encode raw bytes to a base64 string (chunked, to avoid call-stack limits on
// larger images). Used to build the data: URI the vision model expects.
function bytesToBase64(u8) {
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) {
    bin += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
  }
  return btoa(bin);
}

// POST /ocr  — body = raw image bytes (Content-Type image/jpeg|png).
// Header  X-Library-Key: <same passphrase as the rest of the library>.
// Returns { ok, name, lat_raw, lon_raw, lat, lon } for the app's confirm card.
async function handleOcr(request, env, origin) {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, origin);

  const key = request.headers.get('X-Library-Key');
  if (!key || key.length < 6) return json({ error: 'missing or too-short X-Library-Key' }, 401, origin);

  if (!env.AI) return json({ error: 'Workers AI binding "AI" not configured on this Worker' }, 500, origin);

  const buf = await request.arrayBuffer();
  if (!buf || buf.byteLength === 0) return json({ error: 'empty image body' }, 400, origin);
  if (buf.byteLength > OCR_MAX_BYTES) return json({ error: 'image too large' }, 413, origin);
  const u8 = new Uint8Array(buf);
  const contentType = (request.headers.get('Content-Type') || 'image/jpeg').split(';')[0].trim() || 'image/jpeg';
  const dataUri = `data:${contentType};base64,${bytesToBase64(u8)}`;

  const prompt =
    'This image is a screenshot of a Google Earth "Edit Placemark" dialog, ' +
    'often photographed off a screen so it may be blurry or angled. ' +
    'Read exactly three fields: the placemark Name, the Latitude, and the Longitude. ' +
    'Respond with ONLY a compact JSON object and nothing else, no prose, no code fences, ' +
    'in this exact shape: {"name":"<name>","lat":"<latitude>","lon":"<longitude>"}. ' +
    'Copy the latitude and longitude verbatim, including the degree/minute/second symbols ' +
    'and the trailing N, S, E or W letter. Do not convert, round, or reformat them. ' +
    'If a field is unreadable, use an empty string for that field.';

  let out;
  try {
    out = await env.AI.run(OCR_MODEL, {
      messages: [
        { role: 'system', content: 'You read text out of images and reply with only the requested JSON, no prose.' },
        { role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUri } },
        ] },
      ],
      max_tokens: 512,
      temperature: 0.1,
    });
  } catch (e) {
    return json({ error: 'model call failed', detail: String(e) }, 502, origin);
  }

  const text = pickText(out);
  const parsed = extractJson(text);
  if (!parsed) return json({ ok: false, error: 'could not parse model output', raw: String(text).slice(0, 800) }, 200, origin);

  const name   = typeof parsed.name === 'string' ? parsed.name.trim().slice(0, 120) : '';
  const latRaw = typeof parsed.lat  === 'string' ? parsed.lat.trim()  : '';
  const lonRaw = typeof parsed.lon  === 'string' ? parsed.lon.trim()  : '';

  const lat = parseComponent(latRaw);
  const lon = parseComponent(lonRaw);
  const ok = Number.isFinite(lat) && Number.isFinite(lon) &&
             lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;

  return json({
    ok,
    name,
    lat_raw: latRaw,
    lon_raw: lonRaw,
    lat: ok ? +lat.toFixed(6) : null,
    lon: ok ? +lon.toFixed(6) : null,
    raw: ok ? undefined : String(text).slice(0, 800),   // surfaced only on failure, to help you debug
  }, 200, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean); // ["<collection>", ":id"?]
    const collection = parts[0];

    // OCR endpoint — POST /ocr with the raw image bytes as the request body.
    if (collection === 'ocr') return handleOcr(request, env, origin);

    const spec = COLLECTIONS[collection];
    if (!spec) return json({ error: 'not found' }, 404, origin);

    const key = request.headers.get('X-Library-Key');
    if (!key || key.length < 6) return json({ error: 'missing or too-short X-Library-Key' }, 401, origin);

    const ns = await libHash(key);
    const prefix = ns + ':' + spec.prefix + ':';
    const id = parts[1] ? decodeURIComponent(parts[1]).slice(0, 80) : null;

    try {
      // LIST — GET /<collection>            (?full=1 returns complete bodies)
      if (request.method === 'GET' && !id) {
        const list = await env.ROUTES.list({ prefix });
        let items;
        if (url.searchParams.get('full')) {
          items = await Promise.all(list.keys.map(async (k) => {
            const raw = await env.ROUTES.get(k.name);
            let body = null;
            if (raw) { try { body = JSON.parse(raw); } catch (_) {} }
            const idv = k.name.slice(prefix.length);
            if (body && typeof body === 'object') { if (body.id == null) body.id = idv; return body; }
            return { id: idv, name: (k.metadata && k.metadata.name) || idv, updated: (k.metadata && k.metadata.updated) || null };
          }));
        } else {
          // The NAME comes from the record itself, not from the list metadata.
          // The metadata name was observed carrying another record's name while
          // the stored body was always right; this is the only difference
          // between the two list paths, so the body is the one to trust. The
          // metadata name remains as a fallback if the body cannot be read.
          items = await Promise.all(list.keys.map(async (k) => {
            const idv = k.name.slice(prefix.length);
            let name = null;
            try {
              const raw = await env.ROUTES.get(k.name);
              if (raw) {
                const body = JSON.parse(raw);
                if (body && typeof body.name === 'string' && body.name) name = body.name;
              }
            } catch (_) { /* fall through to the metadata name */ }
            return {
              id: idv,
              name: name || (k.metadata && k.metadata.name) || idv,
              updated: (k.metadata && k.metadata.updated) || null,
            };
          }));
        }
        items.sort((a, b) => String((b && b.updated) || '').localeCompare(String((a && a.updated) || '')));
        // `items` is the new field; `routes` kept as an alias so any older
        // cached client keeps working until it reloads.
        const payload = { items };
        if (collection === 'routes') payload.routes = items;
        return json(payload, 200, origin);
      }

      // PULL one — GET /<collection>/:id
      if (request.method === 'GET' && id) {
        const val = await env.ROUTES.get(prefix + id);
        if (val === null) return json({ error: 'not found' }, 404, origin);
        return new Response(val, { status: 200, headers: { 'Content-Type': 'application/json', ...cors(origin) } });
      }

      // PUSH / save — PUT /<collection>/:id  (body = the JSON blob)
      if (request.method === 'PUT' && id) {
        const body = await request.text();
        if (body.length > spec.max) return json({ error: collection.slice(0, -1) + ' too large' }, 413, origin);
        let parsed;
        try { parsed = JSON.parse(body); } catch (_) { return json({ error: 'body must be JSON' }, 400, origin); }
        const name = parsed && typeof parsed.name === 'string' ? parsed.name.slice(0, 120) : id;
        const updated = new Date().toISOString();
        await env.ROUTES.put(prefix + id, body, { metadata: { name, updated } });
        return json({ ok: true, id, name, updated }, 200, origin);
      }

      // DELETE — DELETE /<collection>/:id
      if (request.method === 'DELETE' && id) {
        await env.ROUTES.delete(prefix + id);
        return json({ ok: true, id }, 200, origin);
      }

      return json({ error: 'method not allowed' }, 405, origin);
    } catch (e) {
      return json({ error: 'server error', detail: String(e) }, 500, origin);
    }
  },
};
