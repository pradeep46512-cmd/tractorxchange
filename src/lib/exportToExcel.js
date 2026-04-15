// exportToExcel.js — uses SheetJS (loaded via CDN in index.html)

export function exportTractorsToExcel(tractors) {
  const XLSX = window.XLSX;
  if (!XLSX) { alert('Excel library not loaded yet. Please wait a moment and try again.'); return; }

  const rows = tractors.map(t => ({
    'Make': t.make || '',
    'Model': t.model || '',
    'Year': t.year || '',
    'Hours Used': t.hours_used || '',
    'Engine (HP)': t.engine_hp || '',
    'Condition': t.condition || '',
    'Status': t.status || '',
    'Expected Price (₹)': t.expected_price || '',
    'Location': t.location_text || '',
    'Description': t.description || '',
    'Share Link': t.share_token ? `${window.location.origin}/market/${t.share_token}` : '',
    'Added On': t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 32 },
    { wch: 40 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tractors');

  const fileName = `TractorXchange_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportEnquiriesToExcel(enquiries) {
  const XLSX = window.XLSX;
  if (!XLSX) { alert('Excel library not loaded yet. Please wait a moment and try again.'); return; }

  const rows = enquiries.map(eq => ({
    'Buyer Name': eq.buyer_name || '',
    'Phone': eq.buyer_phone || '',
    'WhatsApp': eq.buyer_whatsapp || '',
    'Location': eq.buyer_location || '',
    'Source': eq.source || '',
    'Tractor': eq.tractors ? `${eq.tractors.make} ${eq.tractors.model} (${eq.tractors.year})` : '',
    'Asking Price (₹)': eq.tractors?.expected_price || '',
    'Offered Price (₹)': eq.offered_price || '',
    'Status': eq.status || '',
    'Notes': eq.notes || '',
    'Enquiry Date': eq.created_at ? new Date(eq.created_at).toLocaleDateString('en-IN') : '',
    'Sold Date': eq.sold_at ? new Date(eq.sold_at).toLocaleDateString('en-IN') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 },
    { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 30 },
    { wch: 14 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Enquiries');

  const fileName = `TractorXchange_Enquiries_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportBrokersToExcel(brokers) {
  const XLSX = window.XLSX;
  if (!XLSX) { alert('Excel library not loaded yet. Please wait a moment and try again.'); return; }

  const rows = brokers.map(b => ({
    'Name': b.name || '',
    'Phone': b.phone || '',
    'WhatsApp': b.whatsapp || '',
    'Email': b.email || '',
    'Location': b.location || '',
    'Speciality': b.speciality || '',
    'Status': b.is_active ? 'Active' : 'Inactive',
    'Notes': b.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 24 },
    { wch: 18 }, { wch: 20 }, { wch: 10 }, { wch: 32 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Brokers');

  const fileName = `TractorXchange_Brokers_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportDealersToExcel(dealers) {
  const XLSX = window.XLSX;
  if (!XLSX) { alert('Excel library not loaded yet. Please wait a moment and try again.'); return; }

  const rows = dealers.map(d => ({
    'Dealership Name': d.name || '',
    'Contact Person': d.contact_person || '',
    'Phone': d.phone || '',
    'WhatsApp': d.whatsapp || '',
    'Email': d.email || '',
    'City': d.city || '',
    'Area Office': d.state || '',
    'Brands': d.brands || '',
    'Status': d.is_active ? 'Active' : 'Inactive',
    'Notes': d.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
    { wch: 24 }, { wch: 16 }, { wch: 22 }, { wch: 20 },
    { wch: 10 }, { wch: 32 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dealers');

  const fileName = `TractorXchange_Dealers_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

