import { useEffect } from 'react';

/**
 * Cross-version TV event hook.
 * Tries to use React Native's `useTVEventHandler` hook when available.
 * Falls back to `TVEventHandler` constructor when necessary.
 */
export const useTVEvent = (handler: (evt: any) => void, enabled = true) => {
  // First try to call the RN hook at top-level of this hook (hooks must be called directly)
  try {
    const RN = require('react-native');
    const rnUseTVEventHandler = (RN as any).useTVEventHandler;
    if (typeof rnUseTVEventHandler === 'function') {
      // If not enabled, still call but ignore events by early return in handler wrapper
      rnUseTVEventHandler((evt: any) => {
        if (!enabled) return;
        handler(evt);
      });
      // Do not run the fallback effect
      return;
    }
  } catch (e) {
    // ignore and fall back to effect-based handler
  }

  // Fallback for older RN versions using TVEventHandler
  useEffect(() => {
    if (!enabled) return;
    try {
      const RN = require('react-native');
      const TVEventHandler = (RN as any).TVEventHandler;
      if (!TVEventHandler) return;

      const tvHandler = new TVEventHandler();
      // TVEventHandler callback receives (component, evt) — normalize to pass only evt
      tvHandler.enable(null, (_cmp: any, evt: any) => {
        handler(evt);
      });

      return () => {
        try {
          tvHandler.disable();
        } catch (e) {
          /* noop */
        }
      };
    } catch (e) {
      // swallow errors
    }
  }, [handler, enabled]);
};
