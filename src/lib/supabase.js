import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Tractors ──────────────────────────────────────────────
export async function getTractors() {
  const { data, error } = await supabase
    .from('tractors')
    .select(`*, tractor_brokers(broker_id, brokers(id, name, phone, location))`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getTractorById(id) {
  const { data, error } = await supabase
    .from('tractors')
    .select(`*, tractor_brokers(broker_id, brokers(id, name, phone, location, speciality))`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createTractor(tractor, brokerIds) {
  const { data, error } = await supabase
    .from('tractors')
    .insert([tractor])
    .select()
    .single();
  if (error) throw error;

  if (brokerIds && brokerIds.length > 0) {
    const joins = brokerIds.map(bid => ({ tractor_id: data.id, broker_id: bid }));
    await supabase.from('tractor_brokers').insert(joins);
  }
  return data;
}

export async function updateTractor(id, updates) {
  const { data, error } = await supabase
    .from('tractors')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTractor(id) {
  await supabase.from('tractor_brokers').delete().eq('tractor_id', id);
  await supabase.from('tractor_documents').delete().eq('tractor_id', id);
  const { error } = await supabase.from('tractors').delete().eq('id', id);
  if (error) throw error;
}

// ── Documents ─────────────────────────────────────────────
export async function getTractorDocuments(tractorId) {
  const { data, error } = await supabase
    .from('tractor_documents')
    .select('*')
    .eq('tractor_id', tractorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function uploadDocument(tractorId, file) {
  const ext = file.name.split('.').pop();
  const path = `docs/${tractorId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('tractor-files').upload(path, file);
  if (upErr) throw upErr;

  const { data: { publicUrl } } = supabase.storage.from('tractor-files').getPublicUrl(path);

  const { data, error } = await supabase.from('tractor_documents').insert([{
    tractor_id: tractorId,
    name: file.name,
    file_url: publicUrl,
    file_type: ext.toUpperCase(),
    file_size: file.size,
  }]).select().single();
  if (error) throw error;
  return data;
}

export async function uploadPhoto(tractorId, file) {
  const ext = file.name.split('.').pop();
  const path = `photos/${tractorId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('tractor-files').upload(path, file);
  if (upErr) throw upErr;
  const { data: { publicUrl } } = supabase.storage.from('tractor-files').getPublicUrl(path);
  return publicUrl;
}

// ── Brokers ───────────────────────────────────────────────
export async function getBrokers() {
  const { data, error } = await supabase
    .from('brokers')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

export async function createBroker(broker) {
  const { data, error } = await supabase.from('brokers').insert([broker]).select().single();
  if (error) throw error;
  return data;
}

export async function updateBroker(id, updates) {
  const { data, error } = await supabase.from('brokers').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBroker(id) {
  await supabase.from('tractor_brokers').delete().eq('broker_id', id);
  const { error } = await supabase.from('brokers').delete().eq('id', id);
  if (error) throw error;
}

// ── Dealers ───────────────────────────────────────────────
export async function getDealers() {
  const { data, error } = await supabase.from('dealers').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createDealer(dealer) {
  const { data, error } = await supabase.from('dealers').insert([dealer]).select().single();
  if (error) throw error;
  return data;
}

export async function updateDealer(id, updates) {
  const { data, error } = await supabase.from('dealers').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteDealer(id) {
  const { error } = await supabase.from('dealers').delete().eq('id', id);
  if (error) throw error;
}

// ── Enquiries ─────────────────────────────────────────────
export async function getEnquiries() {
  const { data, error } = await supabase
    .from('enquiries')
    .select(`*, tractors(id, make, model, year, expected_price, cover_photo, status)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createEnquiry(enquiry) {
  const { data, error } = await supabase
    .from('enquiries')
    .insert([enquiry])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEnquiry(id, updates) {
  const { data, error } = await supabase
    .from('enquiries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEnquiry(id) {
  const { error } = await supabase.from('enquiries').delete().eq('id', id);
  if (error) throw error;
}

export async function markTractorSoldToEnquiry(tractorId, enquiryId) {
  await updateTractor(tractorId, { status: 'Sold' });
  const { data, error } = await supabase
    .from('enquiries')
    .update({ status: 'Sold', sold_at: new Date().toISOString() })
    .eq('id', enquiryId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
