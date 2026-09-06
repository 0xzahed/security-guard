import type { BrowserContext } from '../environment';
import type { SecurityAction, SecurityEvent } from '../types';
import { block } from './block';
import { callback } from './callback';
import { overlay } from './overlay';
import { redirect } from './redirect';
import type { ActionHandle } from './layer';

export function runAction(context: BrowserContext, action: SecurityAction, event: SecurityEvent): ActionHandle {
  if (typeof action === 'string') return action === 'block' ? block(context) : overlay(context);
  switch (action.type) {
    case 'block': return block(context, action);
    case 'overlay': return overlay(context, action);
    case 'redirect': return redirect(context, action.url);
    case 'callback': return callback(action.handler, event);
  }
}

export type { ActionHandle } from './layer';
