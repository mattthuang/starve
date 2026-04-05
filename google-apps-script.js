/**
 * STARVE; GET RICH — Google Sheets Backend
 * 
 * SETUP:
 * 1. Open your Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Delete any code already there
 * 4. Paste this entire file
 * 5. Click "Deploy" → "New deployment"
 * 6. Type = "Web app"
 * 7. Execute as = "Me"
 * 8. Who has access = "Anyone"
 * 9. Click "Deploy" and authorize when prompted
 * 10. Copy the Web App URL — paste it into the app's Settings
 */

// Sheet names
const TX_SHEET = 'Transactions';
const CAT_SHEET = 'Categories';
const SET_SHEET = 'Settings';

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const params = e.parameter || {};
    const action = params.action || '';

    // If POST, parse body
    let body = {};
    if (e.postData) {
      try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
    }

    let result;

    switch (action) {
      case 'getTransactions':
        result = getTransactions();
        break;
      case 'addTransaction':
        result = addTransaction(body);
        break;
      case 'deleteTransaction':
        result = deleteTransaction(params.id || body.id);
        break;
      case 'getCategories':
        result = getCategories();
        break;
      case 'saveCategories':
        result = saveCategories(body);
        break;
      case 'getSetting':
        result = getSetting(params.key || body.key);
        break;
      case 'saveSetting':
        result = saveSetting(body.key, body.value);
        break;
      case 'parseLLM':
        result = parseLLM(body.text, body.key, body.provider);
        break;
      case 'ping':
        result = { success: true, message: 'Connected to Starve: Get Rich backend!', sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl() };
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ========== LLM PROXY ==========

function parseLLM(text, key, provider) {
  if (!key) return { success: false, error: 'No API key provided' };

  const cats = getCategories();
  const c = cats.categories || { expense: [], income: [], savings: [] };
  const catList = [
    ...(c.expense || []).map(x => x.name),
    ...(c.income || []).map(x => x.name),
    ...(c.savings || []).map(x => x.name)
  ].join(', ');

  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'EEEE, MMMM d, yyyy');
  const prompt = `Parse this transaction into JSON. Today is ${today}.\nInput: "${text}"\nCategories: ${catList}\nReturn ONLY JSON: {"type":"expense|income|savings","amount":number,"category":"from list","description":"brief","date":"YYYY-MM-DD"}`;

  try {
    let content = '';
    if (!provider || provider === 'gemini') {
      const res = UrlFetchApp.fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
        { method: 'POST', contentType: 'application/json', muteHttpExceptions: true,
          payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
      );
      const data = JSON.parse(res.getContentText());
      if (data.error) return { success: false, error: data.error.message };
      content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', muteHttpExceptions: true,
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        payload: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 200, messages: [{ role: 'user', content: prompt }] })
      });
      const data = JSON.parse(res.getContentText());
      if (data.error) return { success: false, error: data.error.message || JSON.stringify(data.error) };
      content = data?.content?.[0]?.text || '';
    }

    const jm = content.match(/\{[\s\S]*?\}/);
    if (!jm) return { success: false, error: 'No JSON in LLM response: ' + content.substring(0, 100) };
    const p = JSON.parse(jm[0]);
    return { success: true, result: {
      type: p.type || 'expense',
      amount: parseFloat(p.amount) || 0,
      category: p.category || '',
      description: p.description || '',
      date: p.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
    }};
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ========== TRANSACTIONS ==========

function getTransactions() {
  const sheet = getOrCreateSheet(TX_SHEET, ['ID', 'Date', 'Type', 'Category', 'Amount', 'Description', 'Created']);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return { success: true, transactions: [] };
  
  const transactions = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    transactions.push({
      id: row[0].toString(),
      date: formatDate(row[1]),
      type: row[2].toString(),
      category: row[3].toString(),
      amount: parseFloat(row[4]) || 0,
      description: row[5] ? row[5].toString() : '',
      created: row[6] ? row[6].toString() : ''
    });
  }
  
  // Sort newest first
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  
  return { success: true, transactions: transactions };
}

function addTransaction(tx) {
  if (!tx || !tx.amount || !tx.type || !tx.category || !tx.date) {
    return { success: false, error: 'Missing required fields' };
  }

  const sheet = getOrCreateSheet(TX_SHEET, ['ID', 'Date', 'Type', 'Category', 'Amount', 'Description', 'Created']);
  
  const id = tx.id || Utilities.getUuid();
  const created = new Date().toISOString();
  
  sheet.appendRow([
    id,
    tx.date,
    tx.type,
    tx.category,
    parseFloat(tx.amount),
    tx.description || '',
    created
  ]);

  return { success: true, id: id };
}

function deleteTransaction(id) {
  if (!id) return { success: false, error: 'No ID provided' };

  const sheet = getOrCreateSheet(TX_SHEET, ['ID', 'Date', 'Type', 'Category', 'Amount', 'Description', 'Created']);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === id.toString()) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  
  return { success: false, error: 'Transaction not found' };
}

// ========== CATEGORIES ==========

function getCategories() {
  const sheet = getOrCreateSheet(CAT_SHEET, ['Type', 'Name', 'Icon']);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    // Initialize with defaults
    const defaults = initDefaultCategories();
    return { success: true, categories: defaults };
  }
  
  const categories = { expense: [], income: [], savings: [] };
  for (let i = 1; i < data.length; i++) {
    const type = data[i][0].toString();
    if (categories[type]) {
      categories[type].push({
        name: data[i][1].toString(),
        icon: data[i][2] ? data[i][2].toString() : '📝'
      });
    }
  }
  
  return { success: true, categories: categories };
}

function saveCategories(cats) {
  if (!cats) return { success: false, error: 'No categories provided' };

  const sheet = getOrCreateSheet(CAT_SHEET, ['Type', 'Name', 'Icon']);
  
  // Clear existing (keep header)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  
  // Write all categories
  const rows = [];
  ['expense', 'income', 'savings'].forEach(type => {
    if (cats[type]) {
      cats[type].forEach(c => {
        rows.push([type, c.name, c.icon || '📝']);
      });
    }
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }
  
  return { success: true };
}

// ========== SETTINGS (key/value store) ==========

function getSetting(key) {
  if (!key) return { success: false, error: 'No key provided' };
  const sheet = getOrCreateSheet(SET_SHEET, ['Key', 'Value']);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      try { return { success: true, value: JSON.parse(data[i][1]) }; }
      catch { return { success: true, value: data[i][1] }; }
    }
  }
  return { success: true, value: null };
}

function saveSetting(key, value) {
  if (!key) return { success: false, error: 'No key provided' };
  const sheet = getOrCreateSheet(SET_SHEET, ['Key', 'Value']);
  const json = JSON.stringify(value);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(json);
      return { success: true };
    }
  }
  sheet.appendRow([key, json]);
  return { success: true };
}

// ========== HELPERS ==========

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // If already YYYY-MM-DD (stored as text), return as-is
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    return val.substring(0, 10);
  }
  // Fallback: try to parse, convert to UTC-based YYYY-MM-DD
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch(e) {}
  return val.toString();
}

function initDefaultCategories() {
  const defaults = {
    expense: [
      { name: 'Rent/Mortgage', icon: '🏠' },
      { name: 'Groceries', icon: '🛒' },
      { name: 'Dining out', icon: '🍽️' },
      { name: 'Transport/Gas', icon: '⛽' },
      { name: 'Subscriptions', icon: '📱' },
      { name: 'Utilities', icon: '💡' },
      { name: 'Shopping', icon: '🛍️' },
      { name: 'Entertainment', icon: '🎬' },
      { name: 'Health/Fitness', icon: '💪' },
      { name: 'Investment', icon: '📈' }
    ],
    income: [
      { name: 'Salary', icon: '💰' },
      { name: 'Freelance', icon: '💻' },
      { name: 'Other income', icon: '💵' }
    ],
    savings: [
      { name: 'Savings', icon: '🏦' },
      { name: 'Emergency fund', icon: '🆘' },
      { name: 'TFSA', icon: '🇨🇦' },
      { name: 'RRSP', icon: '📊' }
    ]
  };

  // Write to sheet
  saveCategories(defaults);
  return defaults;
}
