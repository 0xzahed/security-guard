import { createSecurityGuard, type SecurityAction, type SecurityGuardConfig, type Sensitivity } from '@0xzahed/security-guard';

/* ---------- Nav: toggle, scroll, scroll-spy ---------- */
const navToggle = document.querySelector<HTMLButtonElement>('#nav-toggle')!;
const navLinks = document.querySelector<HTMLElement>('#nav-links')!;
const nav = document.querySelector<HTMLElement>('#nav')!;
const navLinkEls = document.querySelectorAll<HTMLAnchorElement>('.nav-links > a[data-nav]');

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', String(open));
});

// Close mobile menu on link click
for (const link of navLinkEls) {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
}

// Scroll: nav background + active section highlight
const sections = ['features', 'signals', 'actions', 'code', 'demo', 'api']
  .map(id => document.getElementById(id))
  .filter((el): el is HTMLElement => el !== null);

function onScroll(): void {
  nav.classList.toggle('scrolled', window.scrollY > 20);
  const scrollPos = window.scrollY + 100;
  let activeId = '';
  for (const section of sections) {
    if (section.offsetTop <= scrollPos) activeId = section.id;
  }
  for (const link of navLinkEls) {
    link.classList.toggle('active', link.dataset.nav === activeId);
  }
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Code tabs ---------- */
const tabs = document.querySelectorAll<HTMLButtonElement>('.tab');
const contents = document.querySelectorAll<HTMLElement>('.tab-content');
for (const tab of tabs) {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`[data-content="${tab.dataset.tab}"]`)?.classList.add('active');
  });
}

/* ---------- Live demo ---------- */
function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element: ${id}`);
  return found as T;
}

const guard = createSecurityGuard();
const sensitivity = el<HTMLSelectElement>('demo-sensitivity');
const action = el<HTMLSelectElement>('demo-action');
let previewGuard: { stop: () => void } | undefined;
let previewTimer: ReturnType<typeof setTimeout> | undefined;

function log(msg: string): void {
  const list = el('demo-activity');
  list.querySelector('.demo-empty')?.remove();
  const li = document.createElement('li');
  li.textContent = msg;
  list.prepend(li);
  while (list.children.length > 20) list.lastElementChild?.remove();
}

function selectedAction(): SecurityAction {
  switch (action.value) {
    case 'block': return 'block';
    case 'callback': return { type: 'callback', handler: e => log(`Callback: ${e.confidence}/100`) };
    default: return 'overlay';
  }
}

function config(): SecurityGuardConfig {
  return { sensitivity: sensitivity.value as Sensitivity, action: selectedAction(), reporting: false };
}

function render(): void {
  const status = guard.getStatus();
  el('demo-lifecycle').textContent = status.lifecycle;
  const state = el('demo-state');
  state.textContent = status.state[0]!.toUpperCase() + status.state.slice(1);
  state.style.color = status.state === 'blocked' ? '#f87171' : status.state === 'suspicious' ? '#fbbf24' : '#64ffda';
  el('demo-score').replaceChildren(document.createTextNode(String(status.score)), Object.assign(document.createElement('span'), { textContent: '%' }));
  el('demo-score-ring').style.setProperty('--score', String(status.score));
  el('demo-detail').textContent = status.lifecycle !== 'running' ? 'Start the guard to begin monitoring.' : status.detected ? 'Detection confirmed.' : status.score ? 'Evidence observed.' : 'No suspicious evidence.';
  el<HTMLButtonElement>('demo-start').disabled = status.lifecycle === 'running';
  el<HTMLButtonElement>('demo-stop').disabled = status.lifecycle === 'stopped';
  el<HTMLButtonElement>('demo-pause').disabled = status.lifecycle !== 'running';
  el<HTMLButtonElement>('demo-resume').disabled = status.lifecycle !== 'paused';
  for (const row of document.querySelectorAll<HTMLElement>('.demo-signal')) {
    const sig = status.signals.find(s => s.name === row.dataset.signal);
    row.dataset.active = String(sig?.detected ?? false);
    row.querySelector('.ds-state')!.textContent = sig?.detected ? 'observed' : status.lifecycle === 'running' ? 'clear' : 'inactive';
  }
}

function endPreview(): void {
  clearTimeout(previewTimer);
  previewTimer = undefined;
  previewGuard?.stop();
  previewGuard = undefined;
}

guard.on('detected', e => { log(`Detected · ${e.confidence}/100`); render(); });
guard.on('cleared', () => { log('Cleared.'); render(); });

el('demo-start').addEventListener('click', () => { guard.start(config()); log('Guard started.'); render(); });
el('demo-stop').addEventListener('click', () => { guard.stop(); endPreview(); log('Guard stopped.'); render(); });
el('demo-pause').addEventListener('click', () => { guard.pause(); log('Paused.'); render(); });
el('demo-resume').addEventListener('click', () => { guard.resume(); log('Resumed.'); render(); });
el('demo-reset').addEventListener('click', () => { guard.stop(); endPreview(); el('demo-activity').replaceChildren(); log('Reset.'); render(); });
for (const c of [sensitivity, action]) c.addEventListener('change', () => { if (guard.getStatus().lifecycle !== 'stopped') guard.start(config()); render(); });
el('demo-preview').addEventListener('click', () => {
  endPreview();
  log('Action preview (not a real detection).');
  // Use a temporary guard with the selected action to preview the layer.
  // We start it and immediately stop it — the action fires on detection,
  // so for preview we use a callback that manually creates the overlay.
  const previewAction = selectedAction();
  if (previewAction === 'overlay' || previewAction === 'block') {
    // Create a simple preview layer manually
    const layer = document.createElement('dialog');
    layer.dataset.securityGuard = previewAction === 'block' ? 'block' : 'overlay';
    layer.setAttribute('role', 'alertdialog');
    layer.setAttribute('aria-modal', 'true');
    layer.style.cssText = 'position:fixed;inset:0;margin:0;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;padding:clamp(24px,8vw,80px);background:#0a0e14;color:#e6edf3;z-index:2147483647;font:16px/1.6 system-ui,sans-serif;overflow:auto;text-align:center;';
    const title = document.createElement('h2');
    title.textContent = 'Access Restricted';
    title.style.cssText = 'font-size:clamp(22px,4vw,36px);margin:15vh auto 16px;max-width:560px;color:#64ffda;font-weight:800;';
    const msg = document.createElement('p');
    msg.textContent = 'This is a preview of the security overlay action.';
    msg.style.cssText = 'max-width:440px;margin:0 auto 24px;color:#8b98a8;';
    layer.append(title, msg);
    if (previewAction !== 'block') {
      const btn = document.createElement('button');
      btn.textContent = 'Close preview';
      btn.style.cssText = 'background:#64ffda;color:#0a0e14;border:0;border-radius:8px;padding:12px 22px;font:700 15px system-ui;cursor:pointer;';
      btn.addEventListener('click', endPreview);
      layer.append(btn);
    }
    document.body.append(layer);
    if (typeof layer.showModal === 'function') layer.showModal(); else layer.setAttribute('open', '');
    previewGuard = { stop: () => layer.remove() };
  }
  previewTimer = setTimeout(() => { endPreview(); log('Preview ended.'); render(); }, 6000);
});

render();
setInterval(render, 500);
