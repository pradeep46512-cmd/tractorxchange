/**
 * Bulk create Supabase Auth users from a CSV file.
 *
 * CSV format (users.csv):
 *   email,password,role
 *   dealer1@example.com,Pass@1234,field_agent
 *   dealer2@example.com,Pass@5678,field_agent
 *
 * Usage:
 *   node scripts/bulk-create-users.js
 *
 * Requirements:
 *   npm install @supabase/supabase-js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CONFIG — fill these in ────────────────────────────────
const SUPABASE_URL = 'https://ssewclkfbsorxnkeyhlb.supabase.co';         // e.g. https://xxxx.supabase.co
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzZXdjbGtmYnNvcnhua2V5aGxiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTAyOTk1MSwiZXhwIjoyMDkwNjA1OTUxfQ.OyYROvv19HJ_1ZceKEs5TLe7u55cAMFl6P3lEnuCS2w'; // from Supabase → Settings → API
const CSV_FILE = path.join(__dirname, 'users.csv');
// ─────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  if (!fs.existsSync(CSV_FILE)) {
    console.error('❌  users.csv not found at', CSV_FILE);
    process.exit(1);
  }

  const lines = fs.readFileSync(CSV_FILE, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  // Skip header row
  const rows = lines[0].toLowerCase().startsWith('email') ? lines.slice(1) : lines;

  console.log(`\nCreating ${rows.length} user(s)...\n`);

  for (const row of rows) {
    const [email, password, role = 'field_agent'] = row.split(',').map(s => s.trim());

    if (!email || !password) {
      console.warn(`⚠️  Skipping invalid row: "${row}"`);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,           // mark email as confirmed — no verification email sent
      user_metadata: {
        app_role: role,              // 'field_agent' or 'admin'
      },
    });

    if (error) {
      console.error(`❌  ${email} — ${error.message}`);
    } else {
      console.log(`✅  ${email} — created (role: ${role}, id: ${data.user.id})`);
    }
  }

  console.log('\nDone.');
}

run();
