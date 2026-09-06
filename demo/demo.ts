import { createSecurityGuard, resolveConfig, type SecurityAction, type SecurityGuardConfig, type Sensitivity } from '../src';
import { runAction, type ActionHandle } from '../src/actions';
import { getBrowserContext } from '../src/environment';

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing demo element: ${id}`);
  return found as T;
}

const guard = createSecurityGuard();
const sensitivity = element<HTMLSelectElement>('sensitivity');
const action = element<HTMLSelectElement>('action');
const debuggerToggle = element<HTMLInputElement>('debugger');
let eventCount = 0;
let preview: ActionHandle | undefined;
let previewTimer: ReturnType<typeof setTimeout> | undefined;

function log(message: string): void {
  const list = element('activity');
  list.querySelector('.empty-state')?.remove();
  const row = document.createElement('li');
  const time = document.createElement('time');
  time.dateTime = new Date().toISOString();
  time.textContent = new Date().toLocaleTimeString([], { hour12: false });
  const text = document.createElement('span');
  text.textContent = message;
  row.append(time, text);
  list.prepend(row);
  while (list.children.length > 50) list.lastElementChild?.remove();
  element('event-count').textContent = `${++eventCount} events`;
}

function selectedAction(): SecurityAction {
  switch (action.value) {
    case 'block': return 'block';
    case 'redirect': return { type: 'redirect', url: '/?blocked=1' };
    case 'callback': return { type: 'callback', handler: event => log(`Callback received a ${event.confidence}/100 event.`) };
    default: return 'overlay';
  }
}

function configuration(): SecurityGuardConfig {
  return { sensitivity: sensitivity.value as Sensitivity, action: selectedAction(), debugger: { enabled: debuggerToggle.checked }, reporting: false };
}

function render(): void {
  const status = guard.getStatus();
  element('lifecycle').textContent = status.lifecycle;
  const state = element('state');
  state.textContent = status.state[0]!.toUpperCase() + status.state.slice(1);
  state.dataset.state = status.state;
  element('score').replaceChildren(document.createTextNode(String(status.score)), Object.assign(document.createElement('span'), { textContent: '%' }));
  element('score-ring').style.setProperty('--score', String(status.score));
  element('threshold').textContent = `${resolveConfig(configuration()).threshold} / 100`;
  element('runtime').textContent = status.lifecycle === 'running' ? 'Observing this browser' : status.lifecycle === 'paused' ? 'Observation suspended' : 'Ready to initialize';
  element('state-detail').textContent = status.lifecycle !== 'running' ? 'No active sampling. Start or resume to observe.' : !document.hasFocus() || document.hidden ? 'Waiting for a visible, focused page.' : status.detected ? 'Multiple evidence categories confirmed an episode.' : status.score ? 'Evidence observed. No confirmed detection yet.' : 'No suspicious evidence in the current window.';
  element<HTMLButtonElement>('start').disabled = status.lifecycle === 'running';
  element<HTMLButtonElement>('stop').disabled = status.lifecycle === 'stopped';
  element<HTMLButtonElement>('pause').disabled = status.lifecycle !== 'running';
  element<HTMLButtonElement>('resume').disabled = status.lifecycle !== 'paused';
  for (const row of document.querySelectorAll<HTMLElement>('[data-signal]')) {
    const signal = status.signals.find(value => value.name === row.dataset.signal);
    row.dataset.active = String(signal?.detected ?? false);
    row.querySelector('.signal-state')!.textContent = row.dataset.signal === 'debugger' && !debuggerToggle.checked ? 'Disabled' : signal?.detected ? 'Observed' : status.lifecycle === 'running' ? 'Clear' : 'Inactive';
  }
}

function endPreview(): void {
  clearTimeout(previewTimer);
  previewTimer = undefined;
  preview?.cleanup();
  preview = undefined;
}

const unsubscribe = [
  guard.on('detected', event => { log(`Detection confirmed · ${event.confidence}/100 · ${event.signals.filter(signal => signal.detected).map(signal => signal.name).join(', ')}`); render(); }),
  guard.on('cleared', () => { log('Evidence cleared. Normal interaction restored.'); render(); }),
  guard.on('violation', () => log('Configured response requested.')),
];

element('start').addEventListener('click', () => { guard.start(configuration()); log('Guard started. Waiting for independent signals.'); render(); });
element('stop').addEventListener('click', () => { guard.stop(); endPreview(); log('Guard stopped. Listeners, timers and layers removed.'); render(); });
element('pause').addEventListener('click', () => { guard.pause(); log('Observation paused. Evidence reset.'); render(); });
element('resume').addEventListener('click', () => { guard.resume(); log('Observation resumed.'); render(); });
element('reset').addEventListener('click', () => {
  guard.stop(); endPreview(); sensitivity.value = 'medium'; action.value = 'overlay'; debuggerToggle.checked = false;
  element('activity').replaceChildren(); eventCount = 0; log('Session reset. Default configuration restored.'); render();
});
for (const control of [sensitivity, action, debuggerToggle]) {
  control.addEventListener('change', () => {
    if (guard.getStatus().lifecycle !== 'stopped') { guard.start(configuration()); log('Configuration changed. Started a fresh observation session.'); }
    render();
  });
}
element('preview').addEventListener('click', () => {
  const context = getBrowserContext();
  if (!context) return;
  endPreview();
  log('Manual action preview — not a real detection.');
  preview = runAction(context, selectedAction(), { type: 'DEVTOOLS_DETECTED', confidence: 0, signals: [], timestamp: Date.now(), path: location.pathname });
  previewTimer = setTimeout(() => { endPreview(); log('Action preview finished.'); render(); }, 6000);
});
if (new URLSearchParams(location.search).has('blocked')) log('Local redirect destination reached. Guard remains stopped to avoid a redirect loop.');
const renderTimer = setInterval(render, 500);
render();
if (import.meta.hot) import.meta.hot.dispose(() => { guard.stop(); endPreview(); clearInterval(renderTimer); unsubscribe.forEach(off => off()); });
