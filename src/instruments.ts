import { AU, LY } from './science';
export const mph = (kmS: number) => (kmS * 3600) / 1.609344;
export function earthDistance(km: number) {
  return {
    miles: `${Math.round(km / 1.609344).toLocaleString('en-US')} mi`,
    context:
      km >= 0.1 * LY
        ? `${(km / LY).toFixed(2)} ly`
        : km >= 0.1 * AU
          ? `${(km / AU).toFixed(2)} AU`
          : '',
  };
}
/** Each column travels to its actual digit, with rollover in the target direction. */
export class RollingDigits {
  private columns: { el: HTMLElement; value: number }[] = [];
  private previous = 0;
  private lastReducedAt = -Infinity;
  private lastAriaAt = -Infinity;
  private wasReduced = false;
  constructor(private root: HTMLElement) {}
  update(
    value: number,
    frozen: boolean,
    reduced: boolean,
    now = performance.now(),
  ) {
    const integer = Math.round(value),
      formatted = integer.toLocaleString('en-US');
    this.root.dataset.reduced = String(reduced);
    if (reduced || frozen) {
      for (const col of this.columns) {
        col.el.style.filter = '';
        (col.el.firstElementChild as HTMLElement | null)
          ?.getAnimations()
          .forEach((a) => a.cancel());
      }
    }
    if (
      reduced &&
      this.wasReduced &&
      !frozen &&
      integer > 0 &&
      this.columns.length > 0 &&
      now - this.lastReducedAt < 100
    ) {
      return;
    }
    this.wasReduced = reduced;
    if (reduced) this.lastReducedAt = now;
    this.root.dataset.value = String(integer);
    if (frozen || now - this.lastAriaAt >= 1000) {
      this.lastAriaAt = now;
      this.root.parentElement?.setAttribute(
        'aria-label',
        `${formatted} miles per hour`,
      );
    }
    if (this.columns.length !== formatted.length) {
      this.root.replaceChildren();
      this.columns = [...formatted].map((char) => {
        const el = document.createElement('span');
        el.className = /\d/.test(char) ? 'digit' : 'separator';
        if (/\d/.test(char))
          el.innerHTML = `<span>${Array.from({ length: 30 }, (_, i) => `<i>${i % 10}</i>`).join('')}</span>`;
        else el.textContent = char;
        this.root.append(el);
        return { el, value: Number(char) };
      });
    }
    [...formatted].forEach((char, i) => {
      if (!/\d/.test(char)) return;
      const column = this.columns[i],
        digit = Number(char),
        strip = column.el.firstElementChild as HTMLElement;
      const from = column.value,
        direction = Math.sign(integer - this.previous);
      const distance =
        direction >= 0 ? (digit - from + 10) % 10 : -((from - digit + 10) % 10);
      if (frozen || reduced) {
        strip.getAnimations().forEach((a) => a.cancel());
      } else if (distance) {
        strip.getAnimations().forEach((a) => a.cancel());
        strip.animate(
          [
            { transform: `translateY(-${((10 + from) / 30) * 100}%)` },
            {
              transform: `translateY(-${((10 + from + distance) / 30) * 100}%)`,
            },
          ],
          { duration: 85, easing: 'linear' },
        );
      }
      strip.style.transform = `translateY(-${((10 + digit) / 30) * 100}%)`;
      column.el.style.filter =
        !frozen &&
        !reduced &&
        i > formatted.length - 4 &&
        Math.abs(integer - this.previous) > 30
          ? 'blur(.35px)'
          : '';
      column.value = digit;
    });
    this.previous = integer;
  }
}
