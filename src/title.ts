export interface TitleArt {
  canvas: HTMLCanvasElement;
  /** Width of the title plane in Schwarzschild radii. */
  worldWidth: number;
}

const SERIF = '"Instrument Serif", "Times New Roman", serif';
const MONO = '"JetBrains Mono Variable", ui-monospace, monospace';
const CAPTION = 'A DESCENT IN SIX CHAPTERS'.split('').join(' ');

/**
 * Draws the hero title onto a canvas that the shader samples as part of the
 * sky, so the black hole lenses the page's own typography.
 */
export function drawTitle(portrait: boolean): TitleArt {
  const canvas = document.createElement('canvas');
  canvas.width = portrait ? 1024 : 2048;
  canvas.height = portrait ? 1920 : 640;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 200, 150, 0.55)';

  if (portrait) {
    // On a narrow screen the words sit above and below the hole, outside the
    // Einstein ring, so they stay readable while their echoes wrap around it.
    ctx.font = `italic 400 200px ${SERIF}`;
    ctx.shadowBlur = 12;
    ctx.fillText('Event', canvas.width / 2, canvas.height * 0.17);
    ctx.fillText('Horizon', canvas.width / 2, canvas.height * 0.79);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.75;
    ctx.font = `500 26px ${MONO}`;
    ctx.fillText(CAPTION, canvas.width / 2, canvas.height * 0.79 + 125);
    return { canvas, worldWidth: 16 };
  }

  const size = 330;
  const baseline = canvas.height / 2 - 40;
  ctx.font = `italic 400 ${size}px ${SERIF}`;
  ctx.shadowBlur = 24;
  ctx.fillText('Event Horizon', canvas.width / 2, baseline);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.75;
  ctx.font = `500 36px ${MONO}`;
  ctx.fillText(CAPTION, canvas.width / 2, baseline + size * 0.62);
  return { canvas, worldWidth: 32 };
}
