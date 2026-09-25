# Dodo Checkout SDK — Demo

A Next.js demo application showcasing an embedded, iframe-based checkout flow powered by the `DodoCheckout` SDK.

## Overview

This project demonstrates how to integrate a pop-up checkout modal into a merchant page. Clicking **Buy Now** opens a sandboxed `<iframe>` overlay that handles the full payment flow. All lifecycle events are relayed back to the parent page via `postMessage`.

```
┌──────────────────────────────┐
│       Merchant Page          │
│  DodoCheckout.open({...})    │
│         │                    │
│    iframe overlay            │
│  ┌───────────────────┐       │
│  │  /checkout page   │       │
│  │  (payment form)   │       │
│  └───────────────────┘       │
│         │ postMessage        │
│  onSuccess / onError / ...   │
└──────────────────────────────┘
```

## Tech Stack

| Layer      | Technology                     |
|------------|--------------------------------|
| Framework  | Next.js 16 (App Router)        |
| Language   | TypeScript 5                   |
| Runtime    | React 19                       |
| Styling    | Inline styles (no CSS framework) |

## Project Structure

```
dodo/
├── app/
│   ├── page.tsx          # Merchant demo page (product card + event log)
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Global styles
│   └── checkout/
│       └── page.tsx      # Checkout iframe page (payment form)
├── lib/
│   ├── sdk.ts            # DodoCheckout SDK (iframe manager)
│   └── fakePayment.ts    # Simulated payment processing
├── next.config.ts
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## SDK Usage

```ts
import { DodoCheckout } from '@/lib/sdk';

DodoCheckout.open({
  productId: 'prod_123',
  onProcessing: () => console.log('Payment processing…'),
  onSuccess: ({ sessionId }) => console.log('Success!', sessionId),
  onError: ({ code, message }) => console.error(code, message),
  onClose: ({ reason }) => console.log('Closed:', reason),
});

// Programmatically close (noop while processing)
DodoCheckout.close();
```

### `DodoCheckoutOptions`

| Option         | Type                                        | Description                              |
|----------------|---------------------------------------------|------------------------------------------|
| `productId`    | `string`                                    | **Required.** Product identifier         |
| `onProcessing` | `() => void`                                | Fired when payment is submitted          |
| `onSuccess`    | `({ sessionId: string }) => void`           | Fired on successful payment              |
| `onError`      | `({ code: string; message: string }) => void` | Fired on payment failure or timeout    |
| `onClose`      | `({ reason: string }) => void`              | Fired when the checkout modal is closed  |

### Checkout Events

| Event               | Trigger                                      |
|---------------------|----------------------------------------------|
| `checkout_opened`   | `DodoCheckout.open()` called                 |
| `payment_processing`| User submits the payment form                |
| `payment_success`   | Payment completes successfully               |
| `payment_error`     | Payment is declined or times out             |
| `checkout_closed`   | Overlay dismissed (Escape key or button)     |

## Test Cards

| Card Number           | Behaviour         |
|-----------------------|-------------------|
| `4242 4242 4242 4242` | Success           |
| `4000 0000 0000 0002` | Decline           |
| `4000 0000 0000 0341` | Fail once, then succeed |

## Available Scripts

| Command         | Description                  |
|-----------------|------------------------------|
| `npm run dev`   | Start development server     |
| `npm run build` | Build for production         |
| `npm run start` | Start production server      |
| `npm run lint`  | Run ESLint                   |
