import type { BrowserContext } from '../environment';
import type { LayerOptions } from '../types';
import { createLayer, type ActionHandle } from './layer';

export function block(context: BrowserContext, options: LayerOptions = {}): ActionHandle {
  return createLayer(context, options, true);
}
