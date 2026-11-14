import { JourneyController } from './controller';
/** Pointer ownership belongs only to the scene; controls and dialogs remain native. */
export function inspectionInput(
  region: HTMLElement,
  controller: JourneyController,
) {
  const pointers = new Map<number, { x: number; y: number }>();
  let separation = 0,
    previousTime = 0;
  const clear = () => {
    pointers.clear();
    separation = 0;
    controller.setDragging(false);
  };
  region.addEventListener('pointerdown', (e) => {
    if (controller.snapshot().playback !== 'observing') return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (e.isTrusted) region.setPointerCapture(e.pointerId);
    controller.setDragging(true);
    previousTime = e.timeStamp;
    separation = 0;
  });
  region.addEventListener('pointermove', (e) => {
    const previous = pointers.get(e.pointerId);
    if (!previous) return;
    const dx = (previous.x - e.clientX) * 0.006,
      dy = (e.clientY - previous.y) * 0.006;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      controller.inspect(dx, dy);
      const dt = Math.max(0.016, (e.timeStamp - previousTime) / 1000);
      controller.fling(dx / dt, dy / dt);
      previousTime = e.timeStamp;
    } else {
      const [a, b] = [...pointers.values()],
        next = Math.hypot(a.x - b.x, a.y - b.y);
      if (separation && next) controller.zoomBy(separation / next);
      separation = next;
    }
  });
  region.addEventListener('pointerup', (e) => {
    pointers.delete(e.pointerId);
    separation = 0;
    if (!pointers.size) controller.setDragging(false);
  });
  region.addEventListener('pointercancel', clear);
  region.addEventListener('lostpointercapture', (e) => {
    if (pointers.has(e.pointerId)) clear();
  });
  region.addEventListener('keydown', (e) => {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => controller.inspect(-0.12, 0),
      ArrowRight: () => controller.inspect(0.12, 0),
      ArrowUp: () => controller.inspect(0, 0.12),
      ArrowDown: () => controller.inspect(0, -0.12),
      '+': () => controller.zoomBy(0.95),
      '=': () => controller.zoomBy(0.95),
      '-': () => controller.zoomBy(1.05),
      Home: () => controller.resetView(),
    };
    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
    }
  });
  return clear;
}
