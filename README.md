# Pile On The Salt

Pile On The Salt is a mobile-first Progressive Web App for people with POTS to track sodium, fluids, minerals, food entries, barcode scans, symptoms, and practical flare support.

## What It Does

- Tracks today's sodium, fluids, potassium, magnesium, and calcium totals
- Logs foods from barcode scans or manual nutrition entry
- Scans UPC, EAN, and Code128 barcodes with the phone camera
- Looks up products through Open Food Facts
- Tracks dizziness, fatigue, brain fog, nausea, pain, heart rate, standing tolerance, and notes
- Shows simple insights from recent food and symptom logs
- Includes a non-medical Help Now checklist and emergency warning signs
- Stores data locally in the browser with `localStorage`
- Supports light mode, dark mode, iPhone safe areas, and installable PWA behavior

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- vite-plugin-pwa
- html5-qrcode
- Open Food Facts API

## Local Setup

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Vercel Deployment

This project is ready for Vercel as a standard Vite app.

1. Push this repository to GitHub.
2. In Vercel, choose **Add New Project**.
3. Import the GitHub repository.
4. Use the default Vercel settings for Vite:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
5. Deploy.

Vercel serves production deployments over HTTPS, which is required for the camera scanner on iPhone Safari and other mobile browsers.

## iPhone Install Instructions

1. Open the deployed HTTPS Vercel URL in Safari on iPhone.
2. Tap the Share button.
3. Choose **Add to Home Screen**.
4. Open **Pile On The Salt** from the Home Screen icon.
5. When using the barcode scanner, tap **Start Scan** and allow camera access.

## Camera Scanner Note

The barcode scanner requires camera permission and a secure context. Use HTTPS in production. Localhost is allowed for development, but a normal `http://` LAN URL will not work reliably on iPhone Safari.

## Available Scripts

- `npm run dev` starts the Vite development server.
- `npm run build` runs TypeScript checking and creates the production build.
- `npm run preview` serves the production build locally for testing.

## Medical Disclaimer

Pile On The Salt is not medical advice and does not diagnose, treat, or replace care from a clinician.
