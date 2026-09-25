'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { processPayment } from '@/lib/fakePayment';

type Status = 'idle' | 'processing' | 'success' | 'error';

interface FormValues { email: string; card: string; expiry: string; cvc: string; }
interface FormErrors { email?: string; card?: string; expiry?: string; cvc?: string; }

function post(msg: object) {
  window.parent.postMessage(msg, window.location.origin);
}

function fmtCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function fmtExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
}

function validate(f: FormValues): FormErrors {
  const e: FormErrors = {};
  if (!f.email.trim()) e.email = 'Required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Invalid email';
  const card = f.card.replace(/\s/g, '');
  if (!card) e.card = 'Required';
  else if (!/^\d{13,19}$/.test(card)) e.card = 'Invalid card number';
  if (!f.expiry) e.expiry = 'Required';
  else {
    const m = f.expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!m) e.expiry = 'MM/YY';
    else {
      const mon = parseInt(m[1]!, 10);
      if (mon < 1 || mon > 12) e.expiry = 'Invalid month';
      else {
        const exp = new Date(2000 + parseInt(m[2]!, 10), mon - 1);
        if (exp < new Date()) e.expiry = 'Card expired';
      }
    }
  }
  if (!f.cvc) e.cvc = 'Required';
  else if (!/^\d{3,4}$/.test(f.cvc)) e.cvc = '3-4 digits';
  return e;
}

function hasErrors(e: FormErrors) {
  return !!(e.email || e.card || e.expiry || e.cvc);
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #ccc',
  borderRadius: 4, fontSize: 14, outline: 'none', fontFamily: 'inherit',
};

const errStyle: React.CSSProperties = { color: '#c00', fontSize: 12, marginTop: 3 };

export default function CheckoutPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [values, setValues] = useState<FormValues>({ email: '', card: '', expiry: '', cvc: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormValues, boolean>>({ email: false, card: false, expiry: false, cvc: false });
  const [successId, setSuccessId] = useState('');
  const [errInfo, setErrInfo] = useState<{ code: string; message: string } | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    post({ source: 'dodo-checkout', type: 'checkout_ready', payload: {} });
  }, []);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (typeof e.data !== 'object' || !e.data) return;
      if (e.data.source === 'dodo-sdk' && e.data.type === 'checkout_init') {
        // productId received — no-op for now
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function set<K extends keyof FormValues>(k: K, v: string) {
    const next = { ...values, [k]: v };
    setValues(next);
    if (touched[k]) setErrors(prev => ({ ...prev, [k]: validate(next)[k] }));
  }

  function blur(k: keyof FormValues) {
    setTouched(prev => ({ ...prev, [k]: true }));
    setErrors(prev => ({ ...prev, [k]: validate(values)[k] }));
  }

  const handleClose = useCallback(() => {
    if (status === 'processing') return;
    post({ source: 'dodo-checkout', type: 'checkout_closed', payload: { reason: 'user_closed' } });
  }, [status]);

  const handlePay = useCallback(async () => {
    if (submitting.current) return;
    setTouched({ email: true, card: true, expiry: true, cvc: true });
    const errs = validate(values);
    setErrors(errs);
    if (hasErrors(errs)) return;

    submitting.current = true;
    setStatus('processing');
    post({ source: 'dodo-checkout', type: 'payment_processing', payload: {} });

    try {
      const result = await processPayment(values.card);
      if (result.status === 'success') {
        setSuccessId(result.sessionId);
        setStatus('success');
        post({ source: 'dodo-checkout', type: 'payment_success', payload: { sessionId: result.sessionId } });
      } else {
        setErrInfo({ code: result.code, message: result.message });
        setStatus('error');
        post({ source: 'dodo-checkout', type: 'payment_error', payload: { code: result.code, message: result.message } });
      }
    } catch {
      setErrInfo({ code: 'ERROR', message: 'Unexpected error.' });
      setStatus('error');
      post({ source: 'dodo-checkout', type: 'payment_error', payload: { code: 'ERROR', message: 'Unexpected error.' } });
    } finally {
      submitting.current = false;
    }
  }, [values]);

  const handleDone = () => {
    post({ source: 'dodo-checkout', type: 'checkout_closed', payload: { reason: 'payment_complete' } });
  };

  const handleRetry = () => {
    setStatus('idle');
    setErrInfo(null);
    setErrors({});
  };

  const wrap: React.CSSProperties = {
    height: '100vh', display: 'flex', flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 14, color: '#111', background: '#fff',
  };

  const centered: React.CSSProperties = {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center',
  };

  if (status === 'processing') {
    return (
      <div style={wrap}>
        <div style={centered}>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Processing payment…</p>
          <p style={{ color: '#666' }}>Please don't close this window.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={wrap}>
        <div style={centered}>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Payment successful</p>
          <p style={{ color: '#666', marginBottom: 12 }}>Your payment was completed.</p>
          <div style={{ background: '#f5f5f5', borderRadius: 6, padding: '8px 14px', marginBottom: 20, fontFamily: 'monospace', fontSize: 13 }}>
            {successId}
          </div>
          <button id="done-button" onClick={handleDone} style={{ padding: '8px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error' && errInfo) {
    return (
      <div style={wrap}>
        <div style={centered}>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Payment failed</p>
          <p style={{ color: '#666', marginBottom: 20 }}>{errInfo.message}</p>
          <button id="retry-button" onClick={handleRetry} style={{ padding: '8px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const lb: React.CSSProperties = { display: 'block', marginBottom: 4, fontWeight: 500 };
  const row: React.CSSProperties = { marginBottom: 14 };

  return (
    <div style={wrap}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>Checkout</span>
        <button onClick={handleClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#666' }}>×</button>
      </div>

      <div style={{ padding: 16, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontWeight: 600 }}>Premium Developer Toolkit</p>
          <p style={{ color: '#666', fontSize: 13 }}>Professional tools for developers</p>
        </div>
        <p style={{ fontWeight: 700 }}>$49.00</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <div style={row}>
          <label style={lb} htmlFor="email">Email</label>
          <input
            id="email" type="email" style={{ ...inputStyle, borderColor: errors.email ? '#c00' : '#ccc' }}
            placeholder="you@example.com" value={values.email}
            onChange={e => set('email', e.target.value)} onBlur={() => blur('email')}
            autoComplete="email"
          />
          {errors.email && <p style={errStyle}>{errors.email}</p>}
        </div>

        <div style={row}>
          <label style={lb} htmlFor="card">Card number</label>
          <input
            id="card" type="text" inputMode="numeric" style={{ ...inputStyle, borderColor: errors.card ? '#c00' : '#ccc' }}
            placeholder="1234 5678 9012 3456" value={values.card} maxLength={19}
            onChange={e => set('card', fmtCard(e.target.value))} onBlur={() => blur('card')}
            autoComplete="cc-number"
          />
          {errors.card && <p style={errStyle}>{errors.card}</p>}
        </div>

        <div style={{ display: 'flex', gap: 10, ...row }}>
          <div style={{ flex: 1 }}>
            <label style={lb} htmlFor="expiry">Expiry</label>
            <input
              id="expiry" type="text" inputMode="numeric" style={{ ...inputStyle, borderColor: errors.expiry ? '#c00' : '#ccc' }}
              placeholder="MM/YY" value={values.expiry} maxLength={5}
              onChange={e => set('expiry', fmtExpiry(e.target.value))} onBlur={() => blur('expiry')}
              autoComplete="cc-exp"
            />
            {errors.expiry && <p style={errStyle}>{errors.expiry}</p>}
          </div>
          <div style={{ flex: 1 }}>
            <label style={lb} htmlFor="cvc">CVC</label>
            <input
              id="cvc" type="text" inputMode="numeric" style={{ ...inputStyle, borderColor: errors.cvc ? '#c00' : '#ccc' }}
              placeholder="123" value={values.cvc} maxLength={4}
              onChange={e => set('cvc', e.target.value.replace(/\D/g, '').slice(0, 4))} onBlur={() => blur('cvc')}
              autoComplete="cc-csc"
            />
            {errors.cvc && <p style={errStyle}>{errors.cvc}</p>}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: 14, marginBottom: 14, display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
          <span>Total</span>
          <span>$49.00</span>
        </div>

        <button
          id="pay-button"
          onClick={handlePay}
          style={{ width: '100%', padding: '10px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          Pay $49.00
        </button>
      </div>
    </div>
  );
}
