/**
 * Personal Expense Tracker — Apps Script API (TOTP auth)
 * Bind to: personal_expense_app_record
 * Deploy as: Web App · Execute as Me · Anyone
 *
 * SETUP
 *   1. Generate a TOTP secret (base32, ~16+ chars, A–Z and 2–7 only).
 *      Easy way: run in a browser console:
 *        Array.from(crypto.getRandomValues(new Uint8Array(20)))
 *          .map(b => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[b%32]).join('')
 *   2. Paste it into TOTP_SECRET below.
 *   3. Generate a SESSION_SECRET (any long random string, used to sign session tokens).
 *   4. Add the TOTP secret to Google Authenticator / Authy:
 *        Account name: Expense Tracker
 *        Key:          <your TOTP_SECRET>
 *        Type:         Time based
 *   5. Deploy → New deployment → Web app → copy /exec URL.
 *   6. In the app: Settings → Login → enter the 6-digit code from Authenticator.
 */

const MASTER_ID         = '1DWuY4hruGdDze3RLykhXFeahLfrICVUrnGTGbdalDzk';
const TOTP_SECRET       = 'CHANGEME234567ABCDEFGHIJKLMNOPQR';   // base32, A–Z 2–7
const SESSION_SECRET    = 'CHANGE-ME-TO-A-LONG-RANDOM-STRING'; // any string
const SESSION_TTL_HOURS = 8;
const TEMPLATE_SHEET_NAME = 'template';

// ===== Entry =====
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;

    if (action === 'login') {
      if (!verifyTOTP(body.code)) return json({ ok:false, error:'invalid code' });
      const exp = Math.floor(Date.now()/1000) + SESSION_TTL_HOURS*3600;
      return json({ ok:true, data:{ session: signSession(exp), exp } });
    }
    if (action === 'ping' && !body.session) {
      return json({ ok:true, data:{ time: now(), auth:'required' } });
    }

    // All other actions require a valid session
    if (!verifySession(body.session)) return json({ ok:false, error:'session expired' });

    let result;
    switch (action) {
      case 'ping':         result = { ok:true, time: now() }; break;
      case 'loadMaster':   result = loadMaster(); break;
      case 'saveMaster':   result = saveMaster(body); break;
      case 'loadMonth':    result = loadMonth(body.ym); break;
      case 'loadMonths':   result = loadMonths(body.yms || []); break;
      case 'appendRecord': result = appendRecord(body.record); break;
      case 'updateRecord': result = updateRecord(body.id, body.patch); break;
      case 'deleteRecord': result = deleteRecord(body.id); break;
      default: return json({ ok:false, error:'unknown action: '+action });
    }
    return json({ ok:true, data: result });
  } catch (err) {
    return json({ ok:false, error: String(err && err.message || err) });
  }
}

function doGet() {
  return json({ ok:true, service:'expense-tracker-api', time: now() });
}

// ===== TOTP (RFC 6238, SHA1, 30s, 6 digits, ±1 window) =====
function verifyTOTP(code) {
  if (!code || !/^\d{6}$/.test(String(code))) return false;
  const key = base32Decode(TOTP_SECRET);
  const step = Math.floor(Date.now() / 1000 / 30);
  for (let w = -1; w <= 1; w++) {
    if (totpAt(key, step + w) === String(code)) return true;
  }
  return false;
}

function totpAt(keyBytes, counter) {
  const buf = new Array(8).fill(0);
  for (let i = 7; i >= 0 && counter > 0; i--) {
    buf[i] = counter & 0xff;
    counter = Math.floor(counter / 256);
  }
  const hmac = Utilities.computeHmacSignature(
    Utilities.MacAlgorithm.HMAC_SHA_1,
    buf.map(b => b > 127 ? b-256 : b),     // signed bytes
    keyBytes.map(b => b > 127 ? b-256 : b)
  );
  const h = hmac.map(b => b < 0 ? b+256 : b);
  const off = h[h.length-1] & 0xf;
  const bin = ((h[off] & 0x7f) << 24) | ((h[off+1] & 0xff) << 16) | ((h[off+2] & 0xff) << 8) | (h[off+3] & 0xff);
  return String(bin % 1000000).padStart(6, '0');
}

function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(str).toUpperCase().replace(/=+$/,'').replace(/\s+/g,'');
  let bits = '', out = [];
  for (const c of clean) {
    const v = alphabet.indexOf(c);
    if (v < 0) throw new Error('TOTP_SECRET has invalid base32 char: '+c);
    bits += v.toString(2).padStart(5, '0');
  }
  for (let i = 0; i+8 <= bits.length; i += 8) out.push(parseInt(bits.substr(i, 8), 2));
  return out;
}

// ===== Session tokens =====
function signSession(exp) {
  const payload = String(exp);
  const sig = hmacSha256B64(SESSION_SECRET, payload);
  return payload + '.' + sig;
}
function verifySession(tok) {
  if (!tok || typeof tok !== 'string' || tok.indexOf('.') < 0) return false;
  const [payload, sig] = tok.split('.');
  const expected = hmacSha256B64(SESSION_SECRET, payload);
  if (sig !== expected) return false;
  const exp = parseInt(payload, 10);
  if (!exp || Math.floor(Date.now()/1000) > exp) return false;
  return true;
}
function hmacSha256B64(key, msg) {
  const bytes = Utilities.computeHmacSha256Signature(msg, key);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/,'');
}

// ===== Master =====
function loadMaster() {
  const ss = SpreadsheetApp.openById(MASTER_ID);
  return {
    categories:    sheetToObjects(ss.getSheetByName('_categories')),
    subcategories: sheetToObjects(ss.getSheetByName('_subcategories')),
    paid_methods:  sheetToObjects(ss.getSheetByName('_paid_methods')),
    settings:      sheetToObjects(ss.getSheetByName('_settings')),
  };
}
function saveMaster(body) {
  const ss = SpreadsheetApp.openById(MASTER_ID);
  const t = now();
  if (Array.isArray(body.categories))    replaceSheet(ss.getSheetByName('_categories'),    body.categories,    t);
  if (Array.isArray(body.subcategories)) replaceSheet(ss.getSheetByName('_subcategories'), body.subcategories, t);
  if (Array.isArray(body.paid_methods))  replaceSheet(ss.getSheetByName('_paid_methods'),  body.paid_methods,  t);
  if (Array.isArray(body.settings))      replaceSheet(ss.getSheetByName('_settings'),      body.settings,      t);
  return { saved:true, at:t };
}

// ===== Records =====
function loadMonth(ym) {
  if (!ym) throw new Error('ym required (YYYYMM)');
  const sh = SpreadsheetApp.getActive().getSheetByName(String(ym));
  if (!sh) return { ym, rows: [] };
  return { ym, rows: sheetToObjects(sh).filter(r => String(r.active) !== 'false') };
}
function loadMonths(yms) { return yms.map(ym => loadMonth(ym)); }

function appendRecord(rec) {
  if (!rec || !rec.date) throw new Error('record.date required');
  const sh = ensureMonthSheet(ymFromDate(rec.date));
  const t = now();
  rec.id         = rec.id || genId('rec_');
  rec.created_at = rec.created_at || t;
  rec.updated_at = t;
  if (rec.active == null) rec.active = true;
  const headers = getHeaders(sh);
  sh.appendRow(headers.map(h => rec[h] != null ? rec[h] : ''));
  return rec;
}
function updateRecord(id, patch) {
  if (!id) throw new Error('id required');
  const found = findRecordRow(id);
  if (!found) throw new Error('record not found: '+id);
  const { sheet, rowIndex, headers, current } = found;
  const merged = Object.assign({}, current, patch, { id, updated_at: now() });
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([headers.map(h => merged[h] != null ? merged[h] : '')]);
  return merged;
}
function deleteRecord(id) { return updateRecord(id, { active: false }); }

// ===== Helpers =====
function findRecordRow(id) {
  const sheets = SpreadsheetApp.getActive().getSheets();
  for (const sh of sheets) {
    if (!/^\d{6}$/.test(sh.getName())) continue;
    const data = sh.getDataRange().getValues();
    if (data.length < 2) continue;
    const headers = data[0].map(String);
    const idCol = headers.indexOf('id');
    if (idCol < 0) continue;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(id)) {
        const current = {};
        headers.forEach((h, j) => current[h] = data[i][j]);
        return { sheet: sh, rowIndex: i+1, headers, current };
      }
    }
  }
  return null;
}
function ensureMonthSheet(ym) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(String(ym));
  if (sh) return sh;
  const tpl = ss.getSheetByName(TEMPLATE_SHEET_NAME);
  if (!tpl) throw new Error('Missing "'+TEMPLATE_SHEET_NAME+'" sheet');
  sh = tpl.copyTo(ss); sh.setName(String(ym));
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last-1, sh.getLastColumn()).clearContent();
  return sh;
}
function getHeaders(sh) { return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String); }
function sheetToObjects(sh) {
  if (!sh) return [];
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(String), out = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row.every(v => v === '' || v == null)) continue;
    const obj = {};
    headers.forEach((h, j) => obj[h] = row[j] === '' ? null : row[j]);
    out.push(obj);
  }
  return out;
}
function replaceSheet(sh, rows, t) {
  if (!sh) return;
  const headers = getHeaders(sh);
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last-1, headers.length).clearContent();
  if (!rows.length) return;
  const values = rows.map(r => {
    if (!r.created_at) r.created_at = t;
    r.updated_at = t;
    return headers.map(h => r[h] != null ? r[h] : '');
  });
  sh.getRange(2, 1, values.length, headers.length).setValues(values);
}
function ymFromDate(d) { const s = String(d); return s.slice(0,4) + s.slice(5,7); }
function now() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', "yyyy-MM-dd'T'HH:mm:ssXXX"); }
function genId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
