import { useMemo } from 'react';
import { VoskCore } from '../core/voskCore.js';

export function useVoskCore() {
  const core = useMemo(() => new VoskCore(), []);
  return core;
}
