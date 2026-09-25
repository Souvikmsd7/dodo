export interface DodoCheckoutOptions {
  productId: string;
  onSuccess?: (payload: { sessionId: string }) => void;
  onClose?: (payload: { reason: string }) => void;
  onError?: (payload: { code: string; message: string }) => void;
  onProcessing?: () => void;
}

type CheckoutMessage =
  | { source: 'dodo-checkout'; type: 'checkout_ready'; payload: Record<string, never> }
  | { source: 'dodo-checkout'; type: 'payment_processing'; payload: Record<string, never> }
  | { source: 'dodo-checkout'; type: 'payment_success'; payload: { sessionId: string } }
  | { source: 'dodo-checkout'; type: 'payment_error'; payload: { code: string; message: string } }
  | { source: 'dodo-checkout'; type: 'checkout_closed'; payload: { reason: string } };

interface CheckoutInstance {
  overlay: HTMLDivElement;
  iframe: HTMLIFrameElement;
  options: DodoCheckoutOptions;
  origin: string;
  isProcessing: boolean;
  initTimer: ReturnType<typeof setTimeout> | null;
  onMessage: (e: MessageEvent) => void;
  onKey: (e: KeyboardEvent) => void;
}

let _instance: CheckoutInstance | null = null;

function destroy(): void {
  if (!_instance) return;
  if (_instance.initTimer) clearTimeout(_instance.initTimer);
  window.removeEventListener('message', _instance.onMessage);
  document.removeEventListener('keydown', _instance.onKey);
  if (_instance.overlay.parentNode) _instance.overlay.parentNode.removeChild(_instance.overlay);
  _instance = null;
}

function isValid(e: MessageEvent, origin: string): e is MessageEvent<CheckoutMessage> {
  if (e.origin !== origin) return false;
  if (typeof e.data !== 'object' || !e.data) return false;
  const d = e.data as Record<string, unknown>;
  return d['source'] === 'dodo-checkout' && typeof d['type'] === 'string' && typeof d['payload'] === 'object';
}

export const DodoCheckout = {
  open(options: DodoCheckoutOptions): void {
    if (_instance) return;

    const checkoutUrl = (typeof window !== 'undefined' && window.location.origin) || 'http://localhost:3000';
    const origin = new URL(checkoutUrl).origin;

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';

    const iframe = document.createElement('iframe');
    const url = new URL('/checkout', checkoutUrl);
    url.searchParams.set('productId', options.productId);
    iframe.src = url.toString();
    iframe.title = 'Checkout';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    iframe.style.cssText = 'width:460px;height:600px;border:none;border-radius:8px;background:#fff;';

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    const inst: CheckoutInstance = {
      overlay, iframe, options, origin,
      isProcessing: false,
      initTimer: null,
      onMessage: () => undefined,
      onKey: () => undefined,
    };

    inst.onMessage = (e: MessageEvent) => {
      if (!isValid(e, origin)) return;
      const { type, payload } = e.data;
      switch (type) {
        case 'checkout_ready':
          if (inst.initTimer) { clearTimeout(inst.initTimer); inst.initTimer = null; }
          iframe.contentWindow?.postMessage({ source: 'dodo-sdk', type: 'checkout_init', payload: { productId: options.productId } }, origin);
          break;
        case 'payment_processing':
          inst.isProcessing = true;
          options.onProcessing?.();
          break;
        case 'payment_success':
          inst.isProcessing = false;
          options.onSuccess?.({ sessionId: (payload as { sessionId: string }).sessionId });
          break;
        case 'payment_error':
          inst.isProcessing = false;
          options.onError?.({ code: (payload as { code: string; message: string }).code, message: (payload as { code: string; message: string }).message });
          break;
        case 'checkout_closed':
          options.onClose?.({ reason: (payload as { reason: string }).reason });
          destroy();
          break;
      }
    };

    inst.onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !inst.isProcessing) DodoCheckout.close();
    };

    inst.initTimer = setTimeout(() => {
      options.onError?.({ code: 'INIT_TIMEOUT', message: 'Checkout failed to load.' });
      destroy();
    }, 15000);

    window.addEventListener('message', inst.onMessage);
    document.addEventListener('keydown', inst.onKey);
    _instance = inst;
  },

  close(): void {
    if (!_instance || _instance.isProcessing) return;
    _instance.options.onClose?.({ reason: 'user_closed' });
    destroy();
  },
} as const;
