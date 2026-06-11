/**
 * Personal Expense Tracker — Apps Script API
 * Bind this script to: personal_expense_app_record
 * Deploy as: Web App, Execute as Me, Anyone (token-protected)
 *
 * Setup:
 *   1. Paste MASTER_ID below (from personal_expense_app_master URL)
 *   2. Generate a long random SHARED_TOKEN and paste it into the app Settings
 *   3. Deploy → New deployment → Web app → copy /exec URL → paste into Settings
 */

const MASTER_ID    = '1DWuY4hruGdDze3RLykhXFeahLfrICVUrnGTGbdalDzk';
const SHARED_TOKEN = 'CHANGE-ME-TO-A-LONG-RANDOM-STRING';
const TEMPLATE_SHEET_NAME = 'template';

// ===== Entry =====
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.token !== SHARED_TOKEN) return json({ ok:false, error:'unauthorized' }, 401);

    const action = body.action;
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
      default: return json({ ok:false, error:'unknown action: '+action }, 400);
    }
    return json({ ok:true, data: result });
  } catch (err) {
    return json({ ok:false, error: String(err && err.message || err) }, 500);
  }
}

function doGet() {
  return json({ ok:true, service:'expense-tracker-api', time: now() });
}

// ===== Master (categories / subcategories / paid methods / settings) =====
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
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(String(ym));
  if (!sh) return { ym, rows: [] };
  return { ym, rows: sheetToObjects(sh).filter(r => String(r.active) !== 'false') };
}

function loadMonths(yms) {
  return yms.map(ym => loadMonth(ym));
}

function appendRecord(rec) {
  if (!rec || !rec.date) throw new Error('record.date required');
  const ym = ymFromDate(rec.date);
  const sh = ensureMonthSheet(ym);
  const t = now();
  rec.id          = rec.id || genId('rec_');
  rec.created_at  = rec.created_at || t;
  rec.updated_at  = t;
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

function deleteRecord(id) {
  // Soft delete
  return updateRecord(id, { active: false });
}

// ===== Helpers =====
function findRecordRow(id) {
  const ss = SpreadsheetApp.getActive();
  const sheets = ss.getSheets();
  for (const sh of sheets) {
    const name = sh.getName();
    if (!/^\d{6}$/.test(name)) continue;
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
  if (!tpl) throw new Error('Missing "'+TEMPLATE_SHEET_NAME+'" sheet to clone from');
  sh = tpl.copyTo(ss);
  sh.setName(String(ym));
  // Remove any sample rows below header
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last-1, sh.getLastColumn()).clearContent();
  return sh;
}

function getHeaders(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function sheetToObjects(sh) {
  if (!sh) return [];
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(String);
  const out = [];
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

function ymFromDate(dateStr) {
  // 'YYYY-MM-DD' → 'YYYYMM'
  const s = String(dateStr);
  return s.slice(0,4) + s.slice(5,7);
}

function now() {
  return Utilities.formatDate(new Date(), 'Asia/Bangkok', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function genId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function json(obj, status) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
