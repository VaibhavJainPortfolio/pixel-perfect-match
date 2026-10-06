# TheGent — AI Personal Style Analysis for Indian Men

**TheGent** is an automated, AI-powered personal styling platform designed for Indian men. By analyzing 8 guided user photos and demographic details, TheGent produces a comprehensive 9-chapter style report complete with photorealistic AI renders of recommended outfits.

---

## 🌟 Key Features

- 📸 **Guided Photo Intake**: Real-time browser camera guidance powered by MediaPipe for posture, lighting, and distance metrics.
- 🎨 **AI Style & Color Analysis**:
  - Face shape identification with haircut & beard recommendations.
  - Custom skin-tone color palette (shades to wear vs. skip).
  - Body build analysis for precise fits and clothing proportions.
- 👔 **16 Personalized Outfits & AI Try-On Renders**: Photorealistic preview renders showing recommended looks directly on the user's likeness.
- 📑 **Interactive & Printable Reports**: High-resolution web report (`/app/report/:id`) with 7-day share links and downloadable PDF.
- ⚡ **Automated Pipeline with Human Review**: Multi-agent async pipeline with automatic fallback to human stylist review for low-confidence scores.
- 🧾 **GST-Compliant Invoicing & Razorpay Payments**: Server-calculated pricing, coupon verification, state-wise GST calculations, and automated tax invoices.
- 🛡️ **Admin Portal**: Back-office management for rulebooks, outfit catalogs, AI settings, payment audits, and review queues.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TanStack Start, TanStack Router, TanStack Query, Tailwind CSS v4, Radix UI.
- **Computer Vision & AI**: `@mediapipe/tasks-vision`, Google Gemini (`@ai-sdk/google`).
- **Backend & Storage**: Supabase (PostgreSQL, Row Level Security, Private Buckets).
- **ORM & Database**: Drizzle ORM & Drizzle Kit.
- **Payments & PDF**: Razorpay integration, PDFShift rendering engine.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or bun

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/VaibhavJainPortfolio/pixel-perfect-match.git
   cd pixel-perfect-match
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env` and set your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 📜 Available Scripts

- `npm run dev` - Starts the Vite development server.
- `npm run build` - Builds the application for production.
- `npm run preview` - Previews the built production app.
- `npm run lint` - Runs ESLint.
- `npm run format` - Formats code with Prettier.
- `npm run test` - Runs test suite using Vitest.

---

## 🔒 Security & Privacy

- All user photos are stored in private Supabase buckets protected by Row-Level Security (RLS).
- Photos are used exclusively for report generation and anonymized according to user privacy preferences.
- Server-side security definer functions gate role escalations (`user_roles`).
