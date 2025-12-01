import { useMemo } from 'react';
import { SlidesCore } from '../core/slidesCore.js';

export function useSlidesCore() {
  const core = useMemo(() => new SlidesCore(), []);
  return core;
}
