import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Wraps each character in a span, grouped by word so lines still break between
 * words, and keeps the original text for screen readers.
 */
function splitChars(element: HTMLElement, className: string) {
  const text = element.textContent ?? '';
  element.setAttribute('aria-label', text);
  element.textContent = '';
  const chars: HTMLSpanElement[] = [];
  text.split(' ').forEach((word, index) => {
    if (index > 0) element.append(' ');
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word';
    wordSpan.setAttribute('aria-hidden', 'true');
    for (const char of word) {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = char;
      wordSpan.append(span);
      chars.push(span);
    }
    element.append(wordSpan);
  });
  return chars;
}

export function setupChapters(reduceMotion: boolean) {
  for (const heading of document.querySelectorAll<HTMLElement>(
    '[data-split]',
  )) {
    const chars = splitChars(heading, 'char');
    if (reduceMotion) continue;
    gsap.from(chars, {
      yPercent: 115,
      rotate: 9,
      opacity: 0,
      filter: 'blur(10px)',
      stagger: 0.035,
      duration: 1.1,
      ease: 'expo.out',
      scrollTrigger: {
        trigger: heading.closest('.chapter'),
        start: 'top 35%',
        toggleActions: 'play none none reverse',
      },
    });
  }

  for (const chapter of document.querySelectorAll<HTMLElement>('.chapter')) {
    const copy = chapter.querySelector<HTMLElement>('[data-reveal]');
    if (!copy) continue;
    const isFirst = chapter.dataset.chapter === '0';
    const isLast = chapter.classList.contains('chapter--end');
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: chapter,
        start: 'top top',
        end: 'bottom bottom',
        scrub: reduceMotion ? true : 0.6,
      },
    });
    timeline.fromTo(
      copy,
      { opacity: 0, y: reduceMotion ? 0 : 60, filter: 'blur(14px)' },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.22,
        ease: 'power2.out',
      },
      isFirst ? 0.12 : 0,
    );
    timeline.to({}, { duration: isLast ? 0.2 : 0.5 });
    timeline.to(copy, {
      opacity: 0,
      y: reduceMotion ? 0 : -50,
      filter: 'blur(10px)',
      duration: 0.22,
      ease: 'power2.in',
    });
    if (isLast) timeline.to({}, { duration: 0.36 });
  }

  const cues = document.querySelectorAll<HTMLElement>('[data-cue]');
  gsap.to(cues, {
    opacity: 0,
    y: 20,
    scrollTrigger: {
      trigger: '#chapter-1',
      start: 'top top',
      end: '15% top',
      scrub: true,
    },
  });

  const orbit = document.querySelector<SVGElement>('[data-orbit]');
  if (orbit) {
    gsap.fromTo(
      orbit,
      { rotate: -40, scale: 0.6, opacity: 0 },
      {
        rotate: 220,
        scale: 1.15,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '#chapter-3',
          start: 'top bottom',
          end: 'bottom top',
          scrub: reduceMotion ? true : 1,
        },
      },
    );
  }

  const stretch = document.querySelector<HTMLElement>('[data-stretch]');
  if (stretch) {
    const letters = splitChars(stretch, 'stretch__char');
    const middle = (letters.length - 1) / 2;
    letters.forEach((letter, i) => {
      // Letters near the middle fall deepest, so they stretch the most.
      const k = 1 - Math.abs(i - middle) / (middle + 1);
      letter.style.setProperty(
        '--k',
        (0.35 + k * 0.65 + Math.sin(i * 2.7) * 0.12).toFixed(3),
      );
    });
    ScrollTrigger.create({
      trigger: '#chapter-4',
      start: 'top 60%',
      end: 'bottom bottom',
      scrub: reduceMotion ? true : 0.4,
      onUpdate: (self) => {
        const eased = reduceMotion
          ? 0
          : gsap.parseEase('power2.in')(self.progress);
        stretch.style.setProperty('--stretch', eased.toFixed(4));
        stretch.style.setProperty(
          '--fade',
          Math.min(1, self.progress * 4).toFixed(3),
        );
      },
    });
  }
}

export { ScrollTrigger };
