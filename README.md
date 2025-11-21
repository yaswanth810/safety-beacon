# Women's safety portal

A web application for women's safety that provides SOS alerts, incident reporting, community support, and legal resources – all backed by Supabase.

Built with **Vite + React + TypeScript**, **Tailwind CSS**, **shadcn-ui**, and **Supabase**.

---

## Core features

- **Authentication & Profiles**
  - Email/password sign up & login (Supabase Auth).
  - User profile with name, phone, and emergency contact details.

- **Dashboard & SOS alerts**
  - Large **SOS button** that captures the user's location using the browser Geolocation API.
  - Reverse‑geocoded address via OpenStreetMap Nominatim.
  - Creates `sos_alerts` records and tracks active alerts.

- **Incident reporting**
  - Submit detailed incident reports with type, description, location, and optional coordinates.
  - Attach **evidence URLs** (stored in `evidence_urls` array).
  - View a personal history of submitted incidents and their statuses.

- **Community forum + comments**
  - Create posts and upvote existing ones.
  - **Per‑post comments** using the `forum_comments` table.
  - Realtime updates for new/updated posts via Supabase Realtime.

- **Legal resources**
  - Browse categorized legal information from the `legal_resources` table (seeded via migrations).
  - Search and filter by category.

- **Admin dashboard (role‑based)**
  - Uses `user_roles` and `app_role` enum for RBAC.
  - View stats: total users, total incidents, active SOS alerts.
  - Manage incident statuses (new → under_review → resolved).

---

## Tech stack

- **Frontend**: Vite, React, TypeScript
- **Styling**: Tailwind CSS, shadcn-ui
- **Routing**: React Router
- **State / data**: TanStack Query (React Query)
- **Backend**: Supabase (Auth, Postgres, Realtime, RLS)

---

## Getting started

### 1. Prerequisites

- Node.js (v18+ recommended)
- npm (comes with Node)
- A Supabase project

### 2. Clone and install

```sh
git clone <YOUR_GIT_URL>
cd safety-beacon

npm install
```

### 3. Supabase configuration

Create a `.env` file in the project root (or update the existing one):

```env
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-public-key>"
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
```

You can find these values in the Supabase dashboard under **Project Settings → API**.

### 4. Apply database schema

This project ships with SQL migrations under `supabase/migrations/` which define:

- Enums: `app_role`, `incident_type`, `incident_status`
- Tables: `profiles`, `user_roles`, `incidents`, `sos_alerts`, `forum_posts`, `forum_comments`, `legal_resources`
- Row Level Security (RLS) policies
- Triggers for automatic profile creation and `updated_at` timestamps
- Seed data for `legal_resources`

To apply the schema, you can either:

- Copy the contents of each migration file and run them in the **Supabase SQL editor**, or
- Use the Supabase CLI to apply migrations to your project.

After migrations are applied, new sign‑ups will automatically get a `profiles` row and the `user` role in `user_roles`.

### 5. Run the app

Start the Vite dev server:

```sh
npm run dev
```

By default, Vite will start on `http://localhost:8080` (see `vite.config.ts`).

To create a production build:

```sh
npm run build
```

To preview the production build locally:

```sh
npm run preview
```

---

## Available npm scripts

- `npm run dev` – start development server
- `npm run build` – build for production
- `npm run preview` – preview the production build
- `npm run lint` – run linting

---

## Deployment

This is a standard Vite React app. You can deploy the contents of the `dist/` folder to any static hosting provider, for example:

- Netlify
- Vercel
- GitHub Pages
- Any static file host / S3 + CloudFront

Ensure the following environment variables are configured on your hosting provider as **build/runtime env vars**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Then run the build command (`npm run build`) as part of your deployment pipeline.

