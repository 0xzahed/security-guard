import { createSecurityGuard } from '@0xzahed/devtoolguard';
import Monitor from './monitor';

export default function Page() {
  const guard = createSecurityGuard().start();
  const lifecycle = guard.getStatus().lifecycle;
  guard.stop();
  return <main><h1>SecurityGuard package consumer</h1><p id="server-status">SSR: {lifecycle}</p><Monitor /></main>;
}
