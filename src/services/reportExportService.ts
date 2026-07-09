export type ReportExportRow = Record<string, string | number | boolean | null | undefined>;

const escapeCsvValue = (value: ReportExportRow[string]) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const buildCsv = (rows: ReportExportRow[]) => {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvValue).join(';'),
    ...rows.map(row => headers.map(header => escapeCsvValue(row[header])).join(';'))
  ];

  return lines.join('\n');
};

export const downloadCsv = (rows: ReportExportRow[], fileName: string) => {
  const csv = buildCsv(rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
