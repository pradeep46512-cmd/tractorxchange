# 🚜 TractorXchange — Exchange Tractor Management App

A full-stack web application for managing exchange tractors with an internal dashboard and a public marketplace. Built with React + Supabase.

---

## Features

### Internal Dashboard (login required)
- **Tractor management** — Add, edit, delete exchange tractors with full details
- **Photo uploads** — Multiple photos per tractor, set cover photo
- **Document uploads** — RC Book, Insurance, Service Records, etc. (stored in Supabase Storage)
- **Status tracking** — Available / Pending / Sold
- **Broker assignment** — Assign which brokers can buy/bring buyers for each tractor
- **WhatsApp sharing** — One-click share with formatted message + link
- **Shareable links** — Unique public URL per tractor (auto-generated)

### Public Marketplace
- Browse all available tractors (no login needed)
- Filter by condition, search by model/location
- Individual tractor pages with photo gallery, specs, documents list
- WhatsApp enquiry button on every listing
- Shareable URL for each tractor listing

### Broker Management
- Full broker directory with phone, WhatsApp, location, speciality
- Active/Inactive status
- Direct WhatsApp button per broker
- Assign brokers to specific tractors

### Dealer Management
- Dealer directory with contact persons
- Phone, WhatsApp, email per dealer
- City/State, brands handled

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + React Router v6 |
| Backend / DB | Supabase (PostgreSQL) |
| File Storage | Supabase Storage |
| Auth | Supabase Auth (email/password) |
| Hosting | Vercel or Netlify (free) |
| Styling | Plain CSS (no UI library needed) |

---

## Setup Guide

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New Project**, give it a name like `tractorxchange`
3. Choose a region close to India (e.g. Singapore)
4. Wait ~2 minutes for the project to provision

### Step 2 — Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open the file `supabase_schema.sql` from this project
4. Paste the entire contents and click **Run**
5. You should see "Success" — all tables are now created

### Step 3 — Create Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click **New Bucket**
3. Name it exactly: `tractor-files`
4. Check **Public bucket** (so photos/docs are publicly accessible)
5. Click **Save**

### Step 4 — Create Your Login User

1. In Supabase dashboard, go to **Authentication → Users**
2. Click **Add User → Create New User**
3. Enter your email and a strong password
4. This is the account your internal team will use to log in

### Step 5 — Get Your API Keys

1. In Supabase dashboard, go to **Project Settings → API**
2. Copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon / public key** (long string starting with `eyJ...`)

### Step 6 — Configure the App

1. In the project folder, copy the environment file:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and paste your values:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOi...your-key-here
   ```

### Step 7 — Install & Run Locally

Make sure you have Node.js 18+ installed, then:

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The app opens at `http://localhost:3000`

- `/` → Internal dashboard (requires login)
- `/marketplace` → Public marketplace (no login)
- `/market/:token` → Individual tractor public page

---

## Deploy to Vercel (Recommended, Free)

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **New Project** → import your repo
4. Under **Environment Variables**, add:
   - `REACT_APP_SUPABASE_URL` → your Supabase URL
   - `REACT_APP_SUPABASE_ANON_KEY` → your Supabase anon key
5. Click **Deploy**

Your app will be live at `https://your-app-name.vercel.app`

---

## Deploy to Netlify (Alternative, Free)

1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
3. Set build command: `npm run build`
4. Set publish directory: `build`
5. Add environment variables (same as above)
6. Deploy

---

## How Sharing Works

Every tractor gets a unique `share_token` (auto-generated in the database, e.g. `a3f9b2c1d0`).

The public URL is: `https://your-app.vercel.app/market/a3f9b2c1d0`

When you click **Share on WhatsApp**, it opens WhatsApp with a pre-filled message:
```
🚜 Mahindra 475 DI (2019)
📍 Sikar, Rajasthan
⏱ 1,200 hrs
💰 ₹3,80,000

🔗 https://your-app.vercel.app/market/a3f9b2c1d0
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `tractors` | All tractor details, price, location, status |
| `tractor_photos` | Multiple photos per tractor |
| `tractor_documents` | RC Book, Insurance, etc. |
| `tractor_brokers` | Which brokers are eligible per tractor |
| `brokers` | Broker directory |
| `dealers` | Dealer directory |

---

## Security

- Internal dashboard is protected by Supabase Auth (email/password login)
- Public marketplace only shows Available and Pending tractors (Sold are hidden)
- Document files are stored in Supabase Storage — public read, authenticated write
- Row Level Security (RLS) is enabled on all tables
- The `share_token` is unguessable (random 10-character string)

---

## Folder Structure

```
tractorxchange/
├── public/
│   └── index.html
├── src/
│   ├── lib/
│   │   └── supabase.js          # All DB calls
│   ├── components/
│   │   ├── Layout.js            # Sidebar + nav
│   │   └── TractorModal.js      # Add tractor form
│   ├── pages/
│   │   ├── TractorsPage.js      # Tractor grid
│   │   ├── TractorDetailPage.js # Photos, docs, brokers, share
│   │   ├── BrokersPage.js       # Broker management
│   │   ├── DealersPage.js       # Dealer management
│   │   ├── MarketplacePage.js   # Public marketplace
│   │   ├── PublicTractorPage.js # Single tractor public view
│   │   └── LoginPage.js         # Login
│   ├── App.js                   # Routing
│   ├── App.css                  # All styles
│   └── index.js                 # Entry point
├── supabase_schema.sql          # Run this in Supabase SQL Editor
├── .env.example                 # Copy to .env.local
└── package.json
```

---

## Future Enhancements (easy to add)

- **Enquiry tracking** — Log who contacted about which tractor
- **Price negotiation history** — Track offers per tractor
- **SMS notifications** — Notify brokers when a new tractor is listed
- **Multiple users/roles** — Admin vs viewer access
- **Google Maps integration** — Show tractor location on map
- **PDF export** — Generate a tractor spec sheet PDF
- **Mobile app** — React Native version using the same Supabase backend
