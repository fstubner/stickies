import { describe, it, expect } from 'vitest';
import { toasts } from '../../../src/stores/toasts';

describe('Toasts Store', () => {
  it('should add a toast', () => {
    let currentToasts: any[] = [];
    const unsubscribe = toasts.subscribe((t) => {
      currentToasts = t;
    });

    toasts.show({
      message: 'Test message',
      type: 'info'
    });

    expect(currentToasts).toHaveLength(1);
    expect(currentToasts[0].message).toBe('Test message');

    unsubscribe();
  });

  it('should dismiss a toast', () => {
    let currentToasts: any[] = [];
    const unsubscribe = toasts.subscribe((t) => {
      currentToasts = t;
    });

    toasts.show({ message: 'Test', type: 'info', duration: 0 });
    expect(currentToasts).toHaveLength(1);

    const id = currentToasts[0].id;
    toasts.dismiss(id);

    expect(currentToasts).toHaveLength(0);

    unsubscribe();
  });

  it('should clear all toasts', () => {
    let currentToasts: any[] = [];
    const unsubscribe = toasts.subscribe((t) => {
      currentToasts = t;
    });

    toasts.show({ message: 'Test 1', type: 'info', duration: 0 });
    toasts.show({ message: 'Test 2', type: 'error', duration: 0 });
    expect(currentToasts).toHaveLength(2);

    toasts.clear();
    expect(currentToasts).toHaveLength(0);

    unsubscribe();
  });
});
