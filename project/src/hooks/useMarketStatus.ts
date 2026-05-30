import { useState, useEffect } from 'react';
import { getMarketInfo, MarketInfo } from '../lib/marketHours';

export function useMarketStatus(): MarketInfo {
  const [info, setInfo] = useState<MarketInfo>(() => getMarketInfo());

  useEffect(() => {
    // Update every 30 seconds
    const tick = () => setInfo(getMarketInfo());
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return info;
}
