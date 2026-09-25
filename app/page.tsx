'use client';

import { useState, useCallback } from 'react';
import { DodoCheckout } from '@/lib/sdk';

type EventType = 'checkout_opened' | 'payment_processing' | 'payment_success' | 'payment_error' | 'checkout_closed';

interface LogEvent {
  id: string;
  type: EventType;
  time: string;
  detail?: string;
}

export default function MerchantPage() {
  const [events, setEvents] = useState<LogEvent[]>([]);

  const add = useCallback((type: EventType, detail?: string) => {
    setEvents(prev => [{
      id: Math.random().toString(36).slice(2),
      type,
      time: new Date().toLocaleTimeString(),
      detail,
    }, ...prev]);
  }, []);

  const handleBuy = useCallback(() => {
    add('checkout_opened');
    DodoCheckout.open({
      productId: 'prod_123',
      onProcessing: () => add('payment_processing'),
      onSuccess: ({ sessionId }) => add('payment_success', `sessionId: ${sessionId}`),
      onError: ({ code, message }) => add('payment_error', `${code}: ${message}`),
      onClose: ({ reason }) => add('checkout_closed', `reason: ${reason}`),
    });
  }, [add]);

  return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>DevTools Store</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Demo merchant website</p>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 24, background: '#fff', marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Premium Developer Toolkit</h2>
        <p style={{ color: '#555', marginBottom: 16 }}>Professional tools for developers.</p>
        <p style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>$49.00</p>
        <button
          id="buy-now-button"
          onClick={handleBuy}
          style={{
            padding: '10px 24px',
            background: '#111',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Buy Now
        </button>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Checkout Events</h3>
          {events.length > 0 && (
            <button
              onClick={() => setEvents([])}
              style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: 8, background: '#fff', minHeight: 80 }}>
          {events.length === 0 ? (
            <p style={{ padding: 20, color: '#999', textAlign: 'center' }}>No events yet.</p>
          ) : (
            events.map(e => (
              <div
                key={e.id}
                style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 12, alignItems: 'flex-start' }}
              >
                <span style={{ color: '#999', fontSize: 12, whiteSpace: 'nowrap', marginTop: 1 }}>{e.time}</span>
                <div>
                  <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{e.type}</span>
                  {e.detail && <p style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{e.detail}</p>}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 16, padding: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
          <strong>Test cards:</strong> 4242 4242 4242 4242 (success) · 4000 0000 0000 0002 (decline) · 4000 0000 0000 0341 (fail once)
        </div>
      </div>
    </div>
  );
}
