import SecurityGuard, { createSecurityGuard } from '@0xzahed/devtoolguard';
import { calculateScore } from '@0xzahed/devtoolguard/scoring';
import { DimensionDetector } from '@0xzahed/devtoolguard/detectors';

const guard = createSecurityGuard();
const render = () => { document.querySelector('#status').textContent = guard.getStatus().lifecycle; };
document.querySelector('#start').addEventListener('click', () => { guard.start({ action: { type: 'callback', handler: render } }); render(); });
for (const method of ['stop', 'pause', 'resume']) document.querySelector(`#${method}`).addEventListener('click', () => { guard[method](); render(); });
window.consumer = { guard, SecurityGuard, calculateScore, DimensionDetector };
window.addEventListener('pagehide', () => guard.stop());
