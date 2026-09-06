import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToString } from 'react-dom/server';
import SecurityGuard, { createSecurityGuard } from '@0xzahed/devtoolguard';
import { calculateScore } from '@0xzahed/devtoolguard/scoring';
import { DimensionDetector } from '@0xzahed/devtoolguard/detectors';

assert.equal(typeof window, 'undefined');
assert.equal(SecurityGuard.start().getStatus().lifecycle, 'unsupported');
SecurityGuard.stop();
const require = createRequire(import.meta.url);
const cjs = require('@0xzahed/devtoolguard');
assert.equal(cjs.default.start().getStatus().lifecycle, 'unsupported');
cjs.default.stop();
assert.equal(typeof require('@0xzahed/devtoolguard/scoring').calculateScore, 'function');
assert.equal(typeof require('@0xzahed/devtoolguard/detectors').DimensionDetector, 'function');
assert.equal(typeof calculateScore, 'function');
assert.equal(typeof DimensionDetector, 'function');
function App() {
  const guard = createSecurityGuard().start();
  const lifecycle = guard.getStatus().lifecycle;
  guard.stop();
  return React.createElement('p', null, lifecycle);
}
assert.equal(renderToString(React.createElement(App)), '<p>unsupported</p>');
console.log('Tarball consumer: ESM, CJS, subpath exports and React SSR passed.');
