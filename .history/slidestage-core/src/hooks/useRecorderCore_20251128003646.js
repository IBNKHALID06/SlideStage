import { useMemo } from 'react';
import { RecorderCore } from '../core/recorderCore.js';

export function useRecorderCore() {
  const core = useMemo(() => new RecorderCore(), []);
  return core;
}
