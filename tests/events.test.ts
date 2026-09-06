import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/events';
import type { SecurityEvent } from '../src/types';

const event: SecurityEvent = { type: 'DEVTOOLS_DETECTED', confidence: 60, signals: [{ name: 'dimension', detected: true, confidence: 100, timestamp: 0, metadata: { widthGap: 200 } }], timestamp: 0, path: '/' };

describe('event subscriptions', () => {
  it('supports on/off, unsubscribe, deduplication and channel isolation', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsubscribe = bus.on('detected', handler);
    bus.on('detected', handler);
    bus.emit('cleared', event);
    expect(handler).not.toHaveBeenCalled();
    bus.emit('detected', event);
    expect(handler).toHaveBeenCalledTimes(1);
    unsubscribe();
    bus.off('detected', handler);
    bus.emit('detected', event);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('isolates thrown/rejected callbacks and payload mutation', async () => {
    const bus = new EventBus();
    bus.on('detected', data => { data.confidence = 0; data.signals[0]!.metadata!.widthGap = 0; throw new Error('consumer error'); });
    bus.on('detected', async () => { throw new Error('async consumer error'); });
    const handler = vi.fn();
    bus.on('detected', handler);
    bus.emit('detected', event);
    await Promise.resolve();
    expect(handler).toHaveBeenCalledWith(event);
    expect(event.signals[0]?.metadata?.widthGap).toBe(200);
  });
});
