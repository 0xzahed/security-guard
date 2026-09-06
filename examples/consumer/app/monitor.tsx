'use client';

import { StrictMode, useEffect, useState } from 'react';
import { createSecurityGuard, type GuardStatus } from '@yourname/security-guard';

function ClientMonitor() {
  const [status, setStatus] = useState<GuardStatus['lifecycle']>('stopped');
  const [mounted, setMounted] = useState(true);
  useEffect(() => {
    if (!mounted) { setStatus('stopped'); return; }
    const guard = createSecurityGuard().start({ action: { type: 'callback', handler: event => setStatus(event.confidence > 0 ? 'running' : 'stopped') } });
    setStatus(guard.getStatus().lifecycle);
    return () => guard.stop();
  }, [mounted]);
  return <section><p id="client-status">Client: {status}</p><button id="toggle" onClick={() => setMounted(value => !value)}>{mounted ? 'Unmount monitor' : 'Mount monitor'}</button></section>;
}

export default function Monitor() { return <StrictMode><ClientMonitor /></StrictMode>; }
