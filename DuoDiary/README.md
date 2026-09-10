# DuoDiary — A Shared Journal with Two Truths

> *"Two people never step into the same river, nor do they experience the same day alike."*

DuoDiary is not a messaging app, not a notes app, and not an AI chatbot. It is a **living journal for two people** that captures the same life from two distinct perspectives while respecting that every human being also has thoughts they may never want to share.

---

## 🚀 Instant Vercel Deployment

Deploy directly to Vercel in seconds:

### Option A: Via GitHub (Recommended)
1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: DuoDiary"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. Open [vercel.com](https://vercel.com), click **"Add New Project"**, and import your repository.
3. Vercel automatically detects the Vite framework with the included `vercel.json`.
4. Click **Deploy**. Your living journal will be live worldwide with SSL, fast edge delivery, and SPA routing!

### Option B: Via Vercel CLI
```bash
npm i -g vercel
vercel
```

---

## 🌟 Core Architecture & Three Daily Layers

Every calendar day generates a single chapter structured across three essential layers:

1. **Layer 1: Shared Memory**
   - Visible to both partners once unlocked.
   - Preserves common memories, photos, real microphone voice recordings with audio waveforms, locations, and emotional mood badges.
   - **Delayed Sharing Mode**: Entries remain unrevealed until both members have submitted their daily contribution, guaranteeing two pure, unaffected versions of the same day.

2. **Layer 2: Private Reflection**
   - Visible **ONLY** to its owner.
   - Permanently client-side encrypted using **AES-GCM 256-bit** and **PBKDF2** key derivation via the native Web Crypto API.
   - Completely inaccessible to the partner, and even the diary owner cannot decrypt the partner's private reflections.
   - Supports **Time-Locks** (Immediate, 1 Month, 1 Year, 5 Years, or Never).

3. **Layer 3: Intelligent Companion**
   - Quiet, contextual writing companion.
   - Builds a long-term **Silent Memory Graph** tracking recurring entities, goals, conflicts, and emotional trajectories.
   - Asks natural contextual check-in questions (e.g., following up on job interviews, marathon training, distant friendships) rather than generic questionnaire templates.
   - Writing assistant tools: Polish cadence, smooth sentence structure, deepen intimacy, and expand reflections without unsolicited therapy or judgment.

---

## 🎨 Cinematic Atmosphere & Sensory Features

- **5 Immersive Atmosphere Themes**:
  - 🌌 *Moonlit Sky* (Cosmic indigo, starlight constellations, lunar glow)
  - 📜 *Vintage Parchment* (Warm vellum, golden dust motes, candle embers)
  - 🌧️ *Rainy Twilight* (Slate blue, slanted falling rain streaks, window mist)
  - 🌿 *Botanical Whisper* (Earthy sage, drifting flower petals and eucalyptus leaves)
  - ✨ *Aurora Minimalist* (Ethereal pastel bioluminescent orbs)
- **60fps Dynamic Canvas Engine**:
  - Smooth HTML5 Canvas particle/starfield/rain animations customized per active theme.
- **Zero-Dependency Procedural Web Audio Synth**:
  - 100% offline, realistic procedural ambient soundscapes: Gentle Rain, Crackling Fireplace, Celestial Night Chimes, and Fountain Pen on Paper.
- **Two Truths Persona Switcher**:
  - Toggle seamlessly between **Julian Vance (Owner)** and **Elena Rostova (Partner)** directly from the header to test delayed reveal and client-side privacy separation.
- **Emotional Time Capsule Vault**:
  - Cryptographically sealed vault with countdown timers for reflections meant to be revisited years later.
- **Storybook Timeline & Keepsake Printing**:
  - Chronological storybook view of past chapters with search and milestone filtering.
  - Dedicated print styling (`@media print`) to print a physical bound keepsake book of your relationship.

---

## 🛠️ Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build
npm run preview
```

---

## 🔒 Authentic Privacy Guarantee

All encryption operates entirely client-side using the browser's native `window.crypto.subtle` implementation:
- **Cipher**: AES-GCM (Galois/Counter Mode) with 256-bit keys.
- **Derivation**: PBKDF2 with 100,000 iterations of SHA-256 and unique 16-byte random salts per entry.
- Private reflections never leave the device in plaintext.
