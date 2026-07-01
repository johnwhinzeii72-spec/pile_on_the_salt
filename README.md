# Pile On The Salt

A mobile-first PWA for people with POTS to track sodium, fluids, minerals, food entries, barcode scans, symptoms, and practical flare support.

## Features

- React, Vite, TypeScript, and Tailwind CSS
- Installable PWA with service worker support
- Camera barcode scanner using `html5-qrcode`
- UPC, EAN, and Code128 scanning
- Open Food Facts product lookup
- Manual nutrition entry fallback
- Dashboard for today's sodium, fluids, potassium, magnesium, calcium, and foods
- Symptom tracker for dizziness, fatigue, brain fog, nausea, pain, heart rate, standing tolerance, and notes
- Insights page with 7-day averages
- Help Now page with non-medical flare checklist, emergency warning signs, and disclaimer
- Settings for sodium goal, fluid goal, emergency contact, and doctor contact
- localStorage persistence
- iPhone Safari camera compatibility notes built into the scanner

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm install
npm run build
```

The scanner requires camera permission and must run on HTTPS or localhost, especially on iPhone Safari.
