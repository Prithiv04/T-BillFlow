"use client";

import React, { createContext, useContext, useSyncExternalStore, useCallback } from 'react';

type ExecutionMode = 'demo' | 'live';

interface ModeContextType {
  mode: ExecutionMode;
  setMode: (mode: ExecutionMode) => void;
  toggleMode: () => void;
  isDemo: boolean;
}

const ModeContext = createContext<ModeContextType>({
  mode: 'demo',
  setMode: () => {},
  toggleMode: () => {},
  isDemo: true,
});

const MODE_STORAGE_KEY = 'tbillflow_mode';
const MODE_CHANGE_EVENT = 'tbillflow_mode_change';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(MODE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(MODE_CHANGE_EVENT, callback);
  };
}

function getSnapshot(): ExecutionMode {
  const saved = localStorage.getItem(MODE_STORAGE_KEY);
  return saved === 'live' ? 'live' : 'demo';
}

function getServerSnapshot(): ExecutionMode {
  return 'demo';
}

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setMode = useCallback((newMode: ExecutionMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MODE_STORAGE_KEY, newMode);
      window.dispatchEvent(new Event(MODE_CHANGE_EVENT));
    }
  }, []);

  const toggleMode = useCallback(() => {
    const current = getSnapshot();
    const next = current === 'demo' ? 'live' : 'demo';
    setMode(next);
  }, [setMode]);

  return (
    <ModeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        isDemo: mode === 'demo',
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
