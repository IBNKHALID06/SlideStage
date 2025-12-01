import { useMemo } from 'react';
import { WebcamCore } from '../core/webcamCore.js';

export function useWebcamCore() {
  const core = useMemo(() => new WebcamCore(), []);
  return core;
}
