const FAIL_ONCE = new Set<string>();

function normalize(card: string): string {
  return card.replace(/\s/g, '');
}

function sessionId(): string {
  return 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export type PaymentResult =
  | { status: 'success'; sessionId: string }
  | { status: 'error'; code: string; message: string };

export async function processPayment(card: string): Promise<PaymentResult> {
  await new Promise(r => setTimeout(r, 1500));
  const n = normalize(card);
  if (n === '4242424242424242') return { status: 'success', sessionId: sessionId() };
  if (n === '4000000000000002') return { status: 'error', code: 'CARD_DECLINED', message: 'Your card was declined.' };
  if (n === '4000000000000341') {
    if (!FAIL_ONCE.has(n)) { FAIL_ONCE.add(n); return { status: 'error', code: 'PAYMENT_FAILED', message: 'Payment failed. Please try again.' }; }
    return { status: 'success', sessionId: sessionId() };
  }
  return { status: 'error', code: 'CARD_DECLINED', message: 'Your card was declined.' };
}
