import type { BrowserContext } from '../environment';
import type { LayerOptions } from '../types';

export interface ActionHandle {
  blocked: boolean;
  cleanup: () => void;
}

let sequence = 0;
const layers = new WeakMap<Document, { handle: ActionHandle; owners: number }>();

export function createLayer(context: BrowserContext, options: LayerOptions, block: boolean): ActionHandle {
  let shared = layers.get(context.document);
  if (!shared) {
    const handle = createOwnedLayer(context, options, block);
    if (!handle.blocked) return handle;
    shared = { handle, owners: 0 };
    layers.set(context.document, shared);
  }
  shared.owners++;
  const owned = shared;
  let released = false;
  return {
    blocked: true,
    cleanup: () => {
      if (released) return;
      released = true;
      if (--owned.owners === 0) {
        layers.delete(context.document);
        owned.handle.cleanup();
      }
    },
  };
}

function createOwnedLayer(context: BrowserContext, options: LayerOptions, block: boolean): ActionHandle {
  const { document: doc, window: win } = context;
  const body = doc.body;
  if (!body) return { blocked: false, cleanup: () => undefined };
  const previousFocus = doc.activeElement;
  const layer = doc.createElement('dialog');
  const title = doc.createElement('h2');
  const message = doc.createElement('p');
  const button = doc.createElement('button');
  const id = `security-guard-${++sequence}`;
  layer.dataset.securityGuard = block ? 'block' : 'overlay';
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('role', 'alertdialog');
  layer.setAttribute('aria-labelledby', `${id}-title`);
  layer.setAttribute('aria-describedby', `${id}-message`);
  layer.tabIndex = -1;
  title.id = `${id}-title`;
  message.id = `${id}-message`;
  title.textContent = options.title ?? 'Access Restricted';
  message.textContent = options.message ?? 'Possible developer tools or suspicious inspection activity was detected. Please reload the page to continue.';
  button.textContent = options.buttonLabel ?? 'Reload page';
  button.type = 'button';
  layer.style.cssText = 'position:fixed;inset:0;box-sizing:border-box;margin:0;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;padding:clamp(24px,8vw,100px);background:#0c1426;color:#f4f7ff;z-index:2147483647;font:16px/1.6 system-ui,sans-serif;overflow:auto;overscroll-behavior:contain;text-align:center;';
  title.style.cssText = 'font-size:clamp(26px,5vw,42px);line-height:1.2;margin:15vh auto 20px;max-width:640px;';
  message.style.cssText = 'max-width:520px;margin:0 auto 28px;color:#c7d3ea;';
  button.style.cssText = 'background:#b9d9ff;color:#101a2d;border:0;border-radius:8px;padding:14px 24px;font:600 16px system-ui;cursor:pointer;';
  layer.append(title, message);
  if (!block) layer.append(button);
  const inertElements = new Map<Element, string | null>();
  const inertSiblings = (): void => {
    for (const element of body.children) {
      if (element === layer || inertElements.has(element)) continue;
      inertElements.set(element, element.getAttribute('inert'));
      element.setAttribute('inert', '');
    }
  };
  const focusLayer = (): void => { (block ? layer : button).focus({ preventScroll: true }); };
  const onFocus = (event: FocusEvent): void => {
    if (event.target instanceof win.Node && !layer.contains(event.target)) focusLayer();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); event.stopPropagation(); focusLayer(); }
    else if (event.target instanceof win.Node && !layer.contains(event.target)) { event.preventDefault(); event.stopPropagation(); }
  };
  const onPointer = (event: Event): void => {
    if (event.target instanceof win.Node && !layer.contains(event.target)) { event.preventDefault(); event.stopPropagation(); }
  };
  const onCancel = (event: Event): void => { event.preventDefault(); };
  const reload = (): void => { win.location.reload(); };
  const overflow = body.style.getPropertyValue('overflow');
  const priority = body.style.getPropertyPriority('overflow');
  body.append(layer);
  inertSiblings();
  body.style.setProperty('overflow', 'hidden');
  const observer = new win.MutationObserver(inertSiblings);
  observer.observe(body, { childList: true });
  doc.addEventListener('focusin', onFocus, true);
  doc.addEventListener('keydown', onKey, true);
  doc.addEventListener('click', onPointer, true);
  doc.addEventListener('pointerdown', onPointer, true);
  layer.addEventListener('cancel', onCancel);
  button.addEventListener('click', reload);
  try {
    if (typeof layer.showModal === 'function') layer.showModal();
    else layer.setAttribute('open', '');
  } catch { layer.setAttribute('open', ''); }
  focusLayer();
  let cleaned = false;
  return {
    blocked: true,
    cleanup: () => {
      if (cleaned) return;
      cleaned = true;
      observer.disconnect();
      doc.removeEventListener('focusin', onFocus, true);
      doc.removeEventListener('keydown', onKey, true);
      doc.removeEventListener('click', onPointer, true);
      doc.removeEventListener('pointerdown', onPointer, true);
      layer.removeEventListener('cancel', onCancel);
      button.removeEventListener('click', reload);
      layer.remove();
      for (const [element, original] of inertElements) {
        if (element.getAttribute('inert') !== '') continue;
        if (original === null) element.removeAttribute('inert');
        else element.setAttribute('inert', original);
      }
      inertElements.clear();
      if (body.style.overflow === 'hidden') {
        if (overflow) body.style.setProperty('overflow', overflow, priority);
        else body.style.removeProperty('overflow');
      }
      if (previousFocus instanceof win.HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    },
  };
}
