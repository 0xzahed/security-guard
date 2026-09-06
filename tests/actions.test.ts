import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAction, type ActionHandle } from '../src/actions';
import type { BrowserContext } from '../src/environment';
import type { SecurityEvent } from '../src/types';
import { browser } from './helpers';

let context: BrowserContext;
const handles: ActionHandle[] = [];
const event: SecurityEvent = { type: 'DEVTOOLS_DETECTED', confidence: 60, signals: [], timestamp: 0, path: '/' };
beforeEach(() => { context = browser(); });
afterEach(() => { for (const handle of handles.splice(0)) handle.cleanup(); document.body.replaceChildren(); vi.unstubAllGlobals(); });

describe('reversible layers', () => {
  it('creates an accessible, text-safe overlay and restores DOM state, focus and scrolling', () => {
    const app = document.createElement('main');
    const input = document.createElement('input');
    input.value = 'preserved state';
    app.append(input);
    document.body.append(app);
    document.body.style.setProperty('overflow', 'scroll', 'important');
    input.focus();
    const handle = runAction(context, { type: 'overlay', title: '<img src=x>', message: 'Custom message' }, event);
    handles.push(handle);
    const layer = document.querySelector('dialog')!;
    expect(handle.blocked).toBe(true);
    expect(layer.getAttribute('role')).toBe('alertdialog');
    expect(layer.getAttribute('aria-modal')).toBe('true');
    expect(layer.querySelector('h2')?.textContent).toBe('<img src=x>');
    expect(layer.querySelector('img')).toBeNull();
    expect(app.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(layer.querySelector('button'));
    const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true });
    layer.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    handle.cleanup();
    handle.cleanup();
    expect(document.querySelector('dialog')).toBeNull();
    expect(app.hasAttribute('inert')).toBe(false);
    expect(input.value).toBe('preserved state');
    expect(document.activeElement).toBe(input);
    expect(document.body.style.overflow).toBe('scroll');
    expect(document.body.style.getPropertyPriority('overflow')).toBe('important');
    document.body.style.removeProperty('overflow');
  });

  it('blocks without destroying SPA roots; covers dynamically mounted siblings', async () => {
    const app = document.createElement('main');
    app.setAttribute('inert', 'existing');
    document.body.append(app);
    const handle = runAction(context, 'block', event);
    handles.push(handle);
    expect(document.querySelector('dialog button')).toBeNull();
    const portal = document.createElement('div');
    document.body.append(portal);
    await Promise.resolve();
    expect(portal.hasAttribute('inert')).toBe(true);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    portal.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    handle.cleanup();
    expect(app.getAttribute('inert')).toBe('existing');
    expect(portal.hasAttribute('inert')).toBe(false);
    expect(app.isConnected).toBe(true);
  });

  it('shares the blocking layer across instances without focus recursion or early removal', () => {
    const first = runAction(context, 'overlay', event);
    handles.push(first);
    const second = runAction(context, 'block', event);
    handles.push(second);
    expect(document.querySelectorAll('dialog')).toHaveLength(1);
    first.cleanup();
    expect(document.querySelectorAll('dialog')).toHaveLength(1);
    second.cleanup();
    expect(document.querySelectorAll('dialog')).toHaveLength(0);
  });
});

describe('non-DOM actions', () => {
  it('calls developer handlers without sharing mutable event data', () => {
    const handler = vi.fn(data => { data.confidence = 0; });
    expect(runAction(context, { type: 'callback', handler }, event).blocked).toBe(false);
    expect(handler).toHaveBeenCalledOnce();
    expect(event.confidence).toBe(60);
  });

  it('uses replace for same-origin redirects and avoids identical URL loops', () => {
    const replace = vi.fn();
    const fake = { ...context, window: { location: { href: 'https://example.test/app', replace } } as unknown as BrowserContext['window'] };
    runAction(fake, { type: 'redirect', url: '/blocked' }, event);
    expect(replace).toHaveBeenCalledWith('https://example.test/blocked');
    runAction(fake, { type: 'redirect', url: '/app' }, event);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', 'https://other.test/', 'https://user:password@example.test/'])('rejects unsafe redirect %s', url => {
    const fake = { ...context, window: { location: { href: 'https://example.test/app' } } as BrowserContext['window'] };
    expect(() => runAction(fake, { type: 'redirect', url }, event)).toThrow();
  });
});
