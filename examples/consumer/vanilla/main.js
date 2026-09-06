import SecurityGuard, { createSecurityGuard } from '@yourname/security-guard';
import { calculateScore } from '@yourname/security-guard/scoring';
import { DimensionDetector } from '@yourname/security-guard/detectors';

const guard = createSecurityGuard();
const render = () => { document.querySelector('#status').textContent = guard.getStatus().lifecycle; };
document.querySelector('#start').addEventListener('click', () => { guard.start({ action: { type: 'callback', handler: render } }); render(); });
for (const method of ['stop', 'pause', 'resume']) document.querySelector(`#${method}`).addEventListener('click', () => { guard[method](); render(); });
window.consumer = { guard, SecurityGuard, calculateScore, DimensionDetector };
window.addEventListener('pagehide', () => guard.stop());
