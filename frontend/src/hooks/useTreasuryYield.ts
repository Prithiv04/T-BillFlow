"use client";

import { useState, useEffect } from 'react';

export interface TreasuryYieldState {
  yield: number | null;
  observationDate: string | null;
  source: string;
  isLoading: boolean;
  isUnavailable: boolean;
  formattedYield: string;
}

export function useTreasuryYield(): TreasuryYieldState {
  const [liveData, setLiveData] = useState<{
    yield: number | null;
    observationDate: string | null;
    source: string;
  }>({
    yield: null,
    observationDate: null,
    source: 'U.S. Department of the Treasury (Daily Treasury Par Yield Curve Rates)',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    async function fetchTreasuryRate() {
      try {
        const res = await fetch('/api/treasury-yield');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (mounted) {
          if (data.status === 'ok' && typeof data.yield === 'number') {
            setLiveData({
              yield: data.yield,
              observationDate: data.observationDate || null,
              source: data.source || 'U.S. Department of the Treasury (Daily Treasury Par Yield Curve Rates)',
            });
            setIsUnavailable(false);
          } else {
            setLiveData((prev) => ({ ...prev, yield: null, observationDate: null }));
            setIsUnavailable(true);
          }
        }
      } catch (err) {
        console.error('[useTreasuryYield] Failed to fetch Treasury yield:', err);
        if (mounted) {
          setLiveData((prev) => ({ ...prev, yield: null, observationDate: null }));
          setIsUnavailable(true);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTreasuryRate();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    yield: liveData.yield,
    observationDate: liveData.observationDate,
    source: liveData.source,
    isLoading,
    isUnavailable: isUnavailable || liveData.yield === null,
    formattedYield: liveData.yield !== null ? `${liveData.yield.toFixed(2)}%` : 'Unavailable',
  };
}
