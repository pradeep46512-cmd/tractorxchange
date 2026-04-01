import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

// ── Column mappings ───────────────────────────────────────
const BROKER_MAP = {
  'name *': 'name', 'name': 'name',
  'phone *': 'phone', 'phone': 'phone',
  'whatsapp number': 'whatsapp', 'whatsapp': 'whatsapp',
  'email': 'email',
  'location (city, state)': 'location', 'location': 'location',
  'speciality (brands)': 'speciality', 'speciality': 'speciality',
  'active (yes/no)': 'is_active', 'active': 'is_active',
  'notes': 'notes',
};

const DEALER_MAP = {
  'dealership name *': 'name', 'dealership name': 'name', 'name': 'name',
  'contact person': 'contact_person',
  'phone *': 'phone', 'phone': 'phone',
  'whatsapp number': 'whatsapp', 'whatsapp': 'whatsapp',
  'email': 'email',
  'city *': 'city', 'city': 'city',
  'state': 'state',
  'brands handled': 'brands', 'brands': 'brands',
  'active (yes/no)': 'is_active', 'active': 'is_active',
  'notes': 'notes',
};

// ── Parse CSV text into array of row arrays ───────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  return lines.map(line => {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cells.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    cells.push(current.trim());
    return cells;
  });
}

// ── Map raw rows to DB objects ────────────────────────────
function rowsToRecords(rows, colMap) {
  if (rows.length < 2) return [];

  // Find the real header row (first row that has a recognised column)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const norm = rows[i].map(c => c.toString().toLowerCase().trim());
    if (norm.some(c => colMap[c])) { headerRowIdx = i; break; }
  }

  const headers = rows[headerRowIdx].map(c => c.toString().toLowerCase().trim());
  const dataRows = rows.slice(headerRowIdx + 1);

  const records = [];
  for (const row of dataRows) {
    if (row.every(c => !c || c.toString().trim() === '')) continue; // skip blank rows

    const obj = {};
    headers.forEach((h, i) => {
      const key = colMap[h];
      if (!key) return;
      let val = (row[i] || '').toString().trim();
      if (key === 'is_active') {
        val = val.toLowerCase() !== 'no' && val.toLowerCase() !== 'false' && val !== '0';
      }
      obj[key] = val;
    });

    if (!obj.name) continue; // must have a name
    records.push(obj);
  }
  return records;
}

// ── Generate & download template xlsx ────────────────────
function downloadTemplate(type) {
  const XLSX = window.XLSX;
  if (!XLSX) { alert('Excel library not loaded yet, please wait a moment and try again.'); return; }

  const brokerHeaders = [
    ['name *', 'phone *', 'whatsapp number', 'email', 'location (city, state)', 'speciality (brands)', 'active (yes/no)', 'notes'],
    ['Ramesh Yadav', '+91 98765 43210', '919876543210', 'ramesh@email.com', 'Jaipur, Rajasthan', 'Mahindra, Swaraj', 'yes', 'Sample row'],
  ];

  const dealerHeaders = [
    ['dealership name *', 'contact person', 'phone *', 'whatsapp number', 'email', 'city *', 'state', 'brands handled', 'active (yes/no)', 'notes'],
    ['Agro Mitra Tractors', 'Vijay Sharma', '+91 99887 76655', '919998877665', 'agro@email.com', 'Jaipur', 'Rajasthan', 'Mahindra, Swaraj', 'yes', 'Sample row'],
  ];

  const data = type === 'brokers' ? brokerHeaders : dealerHeaders;
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Bold header row styling
  const headerLen = data[0].length;
  for (let col = 0; col < headerLen; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellRef]) continue;
    ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E1F5EE' } } };
  }

  // Auto column widths
  ws['!cols'] = data[0].map((h, i) => ({ wch: Math.max(h.length + 4, (data[1]?.[i] || '').length + 2) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, type === 'brokers' ? 'Brokers' : 'Dealers');
  XLSX.writeFile(wb, `${type}_import_template.xlsx`);
}

// ── Main component ────────────────────────────────────────
export default function BulkImportModal({ type, onClose, onDone }) {
  // type = 'brokers' | 'dealers'
  const [step, setStep] = useState('upload'); // upload | preview | done
  const [records, setRecords] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [fileName, setFileName] = useState('');

  const colMap = type === 'brokers' ? BROKER_MAP : DEALER_MAP;
  const table  = type === 'brokers' ? 'brokers' : 'dealers';
  const previewCols = type === 'brokers'
    ? ['name', 'phone', 'location', 'speciality', 'is_active']
    : ['name', 'contact_person', 'phone', 'city', 'state', 'brands', 'is_active'];

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setErrors([]);

    try {
      let rows = [];

      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        rows = parseCSV(text);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Use SheetJS loaded via CDN script tag
        const XLSX = window.XLSX;
        if (!XLSX) { setErrors(['SheetJS not loaded yet. Please wait a moment and try again.']); return; }
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      } else {
        setErrors(['Please upload a .xlsx or .csv file.']);
        return;
      }

      const parsed = rowsToRecords(rows, colMap);
      if (parsed.length === 0) {
        setErrors(['No valid rows found. Make sure your column headers match the template.']);
        return;
      }

      setRecords(parsed);
      setStep('preview');
    } catch (e) {
      setErrors(['Error reading file: ' + e.message]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    setImporting(true);
    setErrors([]);
    const errs = [];
    let count = 0;

    // Batch insert in chunks of 50
    const CHUNK = 50;
    for (let i = 0; i < records.length; i += CHUNK) {
      const chunk = records.slice(i, i + CHUNK);
      const { error } = await supabase.from(table).insert(chunk);
      if (error) { errs.push(`Rows ${i+1}–${i+chunk.length}: ${error.message}`); }
      else { count += chunk.length; }
    }

    setImportedCount(count);
    if (errs.length) setErrors(errs);
    setImporting(false);
    setStep('done');
  };

  const colLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <>
      {/* Load SheetJS for Excel parsing */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" />

      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 680 }}>
          <div className="modal-header">
            <h3>Bulk Import {type === 'brokers' ? 'Brokers' : 'Dealers'}</h3>
            <button className="btn btn-sm btn-icon" onClick={onClose}>✕</button>
          </div>

          {/* ── STEP 1: Upload ── */}
          {step === 'upload' && (
            <div className="modal-body">
              <div style={{ background: 'var(--green-light)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--green-dark)' }}>
                <strong>Use the template</strong> — download it below, fill in your contacts, then upload here. Both .xlsx and .csv are supported.
              </div>

              {/* Template download */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => downloadTemplate(type)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download {type === 'brokers' ? 'Broker' : 'Dealer'} Template (.xlsx)
                </button>
              </div>

              {/* Drop zone */}
              <div
                className="upload-zone"
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => document.getElementById('bulk-file-input').click()}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Drop your file here or click to browse</div>
                <div style={{ fontSize: 12 }}>Supports .xlsx and .csv • Max 1000 rows</div>
                <input
                  id="bulk-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])}
                />
              </div>

              {errors.length > 0 && (
                <div style={{ marginTop: 12, background: 'var(--red-light)', color: 'var(--red-text)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                  {errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
                </div>
              )}

              {/* Column guide */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Required Columns</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.values(colMap).filter((v, i, a) => a.indexOf(v) === i).map(col => (
                    <span key={col} className={`tag ${col === 'name' || col === 'phone' ? 'tag-green' : 'tag-gray'}`}>
                      {colLabel(col)}{(col === 'name' || col === 'phone') ? ' *' : ''}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 6 }}>* Required fields</div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Preview ── */}
          {step === 'preview' && (
            <>
              <div className="modal-body" style={{ paddingBottom: 0 }}>
                <div style={{ background: 'var(--green-light)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--green-dark)' }}>
                  ✅ Found <strong>{records.length} valid rows</strong> in <strong>{fileName}</strong>. Review below, then click Import.
                </div>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: 340, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '8px 10px' }}>#</th>
                      {previewCols.map(col => <th key={col} style={{ padding: '8px 10px' }}>{colLabel(col)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '7px 10px', color: 'var(--gray-400)', fontSize: 11 }}>{i + 1}</td>
                        {previewCols.map(col => (
                          <td key={col} style={{ padding: '7px 10px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {col === 'is_active'
                              ? <span className={`tag ${r[col] ? 'tag-green' : 'tag-gray'}`}>{r[col] ? 'Active' : 'Inactive'}</span>
                              : r[col] || <span style={{ color: 'var(--gray-200)' }}>—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {errors.length > 0 && (
                <div style={{ margin: '12px 20px 0', background: 'var(--red-light)', color: 'var(--red-text)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                  {errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
                </div>
              )}

              <div className="modal-footer">
                <button className="btn" onClick={() => { setStep('upload'); setRecords([]); }}>← Back</button>
                <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                  {importing ? `Importing…` : `Import ${records.length} ${type === 'brokers' ? 'Brokers' : 'Dealers'}`}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Done ── */}
          {step === 'done' && (
            <div className="modal-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{errors.length ? '⚠️' : '🎉'}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                {errors.length ? 'Imported with some errors' : 'Import Complete!'}
              </div>
              <div style={{ fontSize: 14, color: 'var(--gray-400)', marginBottom: 20 }}>
                <strong style={{ color: 'var(--green-dark)' }}>{importedCount}</strong> {type} imported successfully
                {errors.length > 0 && <>, <strong style={{ color: 'var(--red-text)' }}>{errors.length}</strong> chunk(s) failed</>}.
              </div>
              {errors.length > 0 && (
                <div style={{ background: 'var(--red-light)', color: 'var(--red-text)', padding: '10px 14px', borderRadius: 8, fontSize: 12, textAlign: 'left', marginBottom: 16 }}>
                  {errors.map((e, i) => <div key={i}>• {e}</div>)}
                </div>
              )}
              <button className="btn btn-primary" onClick={() => { onDone(); onClose(); }}>
                View {type === 'brokers' ? 'Brokers' : 'Dealers'} →
              </button>
            </div>
          )}

          {step !== 'preview' && step !== 'done' && (
            <div className="modal-footer">
              <button className="btn" onClick={onClose}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
