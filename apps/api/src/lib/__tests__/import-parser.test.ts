import { describe, it, expect } from 'vitest';
import { parseImportBuffer } from '../import-parser';

const validCsvContent = `Symbol,Quantity,Buy Price,Buy Date,Notes
RELIANCE,10,2456.75,15/06/2024,Long term
TCS,5,3890.00,2024-01-10,
INFY,20,1567.50,10-03-2024,`;

const malformedCsvContent = `Symbol,Quantity,Buy Price,Buy Date
RELIANCE,abc,2456.75,15/06/2024
,10,2456.75,15/06/2024
TCS,5,-100,15/06/2024
WIPRO,8,450.00,not-a-date`;

describe('parseImportBuffer', () => {
  it('parses a valid CSV correctly', () => {
    const buf = Buffer.from(validCsvContent, 'utf-8');
    const { rows, errors } = parseImportBuffer(buf, 'text/csv');
    expect(rows).toHaveLength(3);
    expect(errors).toHaveLength(0);
    expect(rows[0].symbol).toBe('RELIANCE');
    expect(rows[0].quantity).toBe(10);
    expect(rows[0].buyPrice).toBe(2456.75);
    expect(rows[0].buyDate).toBe('2024-06-15');
    expect(rows[0].notes).toBe('Long term');
  });

  it('reports per-row errors for malformed data', () => {
    const buf = Buffer.from(malformedCsvContent, 'utf-8');
    const { rows, errors } = parseImportBuffer(buf, 'text/csv');
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(4);
    // Row 2: invalid quantity
    expect(errors[0].error).toContain('Quantity');
    // Row 3: missing symbol
    expect(errors[1].error).toContain('Symbol');
    // Row 4: negative price
    expect(errors[2].error).toContain('price');
  });

  it('skips completely empty rows silently', () => {
    const csvWithEmptyRow = `Symbol,Quantity,Buy Price,Buy Date\nRELIANCE,10,2000,2024-01-01\n,,\n`;
    const buf = Buffer.from(csvWithEmptyRow, 'utf-8');
    const { rows, errors } = parseImportBuffer(buf, 'text/csv');
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });
});
