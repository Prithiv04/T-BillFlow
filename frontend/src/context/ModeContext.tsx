"use client";

import React, { createContext, useContext, useState } from 'react';

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

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ExecutionMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tbillflow_mode') as ExecutionMode | null;
      if (saved === 'demo' || saved === 'live') {
        return saved;
      }
    }
    return 'demo';
  });

  const setMode = (newMode: ExecutionMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tbillflow_mode', newMode);
    }
  };

  const toggleMode = () => {
    const next = mode === 'demo' ? 'live' : 'demo';
    setMode(next);
  };

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
