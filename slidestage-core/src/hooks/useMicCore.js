import { useMemo } from 'react';
import { MicCore } from '../core/micCore.js';

export function useMicCore() {
  const core = useMemo(() => new MicCore(), []);
  return core;
}
