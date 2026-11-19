import { AU, LY } from './science';
import { formatLength, type UnitMode } from './units';
export const mph = (kmS: number) => (kmS * 3600) / 1.609344;
export function earthDistance(km: number, mode: UnitMode = 'miles') {
  return {
    miles: formatLength(km, 'miles'),
    distance: formatLength(km, mode),
    context:
      km >= 0.1 * LY
        ? `${(km / LY).toFixed(2)} ly`
        : km >= 0.1 * AU
          ? `${(km / AU).toFixed(2)} AU`
          : '',
  };
}
/** Instant in-place tabular tick counter with reduced-motion cadence throttling. */
export class RollingDigits {
  private lastReducedAt = -Infinity;
  private lastAriaAt = -Infinity;
  private wasReduced = false;
  private hasValue = false;
  private unitLabel = '';
  constructor(private root: HTMLElement) {}
  update(
    value: number,
    frozen: boolean,
    reduced: boolean,
    now = performance.now(),
    unitLabel = 'miles per hour',
  ) {
    const unitChanged = unitLabel !== this.unitLabel;
    const integer = Math.round(value),
      formatted = integer.toLocaleString('en-US');
    this.root.dataset.reduced = String(reduced);
    if (
      reduced &&
      !unitChanged &&
      this.wasReduced &&
      !frozen &&
      integer > 0 &&
      this.hasValue &&
      now - this.lastReducedAt < 100
    ) {
      return;
    }
    this.wasReduced = reduced;
    this.hasValue = true;
    if (reduced) this.lastReducedAt = now;
    this.root.dataset.value = String(integer);
    if (unitChanged || frozen || now - this.lastAriaAt >= 1000) {
      this.unitLabel = unitLabel;
      this.lastAriaAt = now;
      this.root.parentElement?.setAttribute(
        'aria-label',
        `${formatted} ${unitLabel}`,
      );
    }
    if (this.root.textContent !== formatted) {
      this.root.textContent = formatted;
    }
  }
}
