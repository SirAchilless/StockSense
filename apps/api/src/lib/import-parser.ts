import * as XLSX from 'xlsx';

export interface ParsedRow {
  rowIndex: number;
  symbol: string;
  quantity: number;
  buyPrice: number;
  buyDate: string; // ISO date string
  notes?: string;
}

export interface RowError {
  rowIndex: number;
  error: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: RowError[];
}

const SYMBOL_KEYS = ['symbol', 'stock', 'ticker', 'scrip', 'isin'];
const QTY_KEYS = ['quantity', 'qty', 'shares', 'units'];
const PRICE_KEYS = ['buy_price', 'buyprice', 'avg_price', 'avgprice', 'price', 'rate', 'buy price', 'avg price'];
const DATE_KEYS = ['buy_date', 'buydate', 'date', 'trade_date', 'tradedate', 'purchase_date', 'buy date', 'trade date'];

function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, '_');
}

function findValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    for (const rowKey of Object.keys(row)) {
      if (normalizeKey(rowKey) === key) return row[rowKey];
    }
  }
  return undefined;
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  // Excel serial date number
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  // Try common Indian date formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const ddmm = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmm) return `${ddmm[3]}-${ddmm[2].padStart(2, '0')}-${ddmm[1].padStart(2, '0')}`;
  const iso = str.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // Try native Date parse as fallback
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

export function parseImportBuffer(buffer: Buffer, mimetype: string): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];

  rawRows.forEach((raw, idx) => {
    const rowIndex = idx + 2; // 1-based, +1 for header
    const symbolRaw = findValue(raw, SYMBOL_KEYS);
    const qtyRaw = findValue(raw, QTY_KEYS);
    const priceRaw = findValue(raw, PRICE_KEYS);
    const dateRaw = findValue(raw, DATE_KEYS);
    const notesRaw = findValue(raw, ['notes', 'remarks', 'comment']);

    // Skip entirely empty rows
    if (!symbolRaw && !qtyRaw && !priceRaw) return;

    const rowErrors: string[] = [];

    const symbol = symbolRaw ? String(symbolRaw).trim().toUpperCase() : '';
    if (!symbol) rowErrors.push('Symbol is required');

    const quantity = parseFloat(String(qtyRaw ?? ''));
    if (isNaN(quantity) || quantity <= 0) rowErrors.push('Quantity must be a positive number');

    const buyPrice = parseFloat(String(priceRaw ?? '').replace(/[₹,]/g, ''));
    if (isNaN(buyPrice) || buyPrice <= 0) rowErrors.push('Buy price must be a positive number');

    const buyDate = parseDate(dateRaw);
    if (!buyDate) rowErrors.push('Buy date is required and must be a valid date (DD/MM/YYYY or YYYY-MM-DD)');

    if (rowErrors.length > 0) {
      errors.push({ rowIndex, error: rowErrors.join('; ') });
      return;
    }

    rows.push({
      rowIndex,
      symbol,
      quantity,
      buyPrice,
      buyDate: buyDate!,
      notes: notesRaw ? String(notesRaw).trim() : undefined,
    });
  });

  return { rows, errors };
}
