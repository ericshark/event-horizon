import { JourneyController } from './controller';
/** Pointer ownership belongs only to the scene; controls and dialogs remain native. */
export function inspectionInput(
  region: HTMLElement,
  controller: JourneyController,
  onChange?: () => void,
) {
  const pointers = new Map<number, { x: number; y: number }>();
  let separation = 0,
    previousTime = 0,
    downX = 0,
    downY = 0,
    moved = false,
    lastTap = 0,
    tapX = 0,
    tapY = 0,
    pinched = false;
  const clear = () => {
    pointers.clear();
    separation = 0;
    lastTap = 0;
    controller.setDragging(false);
    controller.fling(0, 0);
  };
  region.addEventListener('pointerdown', (e) => {
    if (controller.snapshot().playback !== 'observing') return;
    if (!pointers.size) {
      downX = e.clientX;
      downY = e.clientY;
      moved = false;
      pinched = false;
    } else {
      pinched = true;
      lastTap = 0;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (e.isTrusted) region.setPointerCapture(e.pointerId);
    controller.setDragging(true);
    previousTime = e.timeStamp;
    separation = 0;
  });
  region.addEventListener('pointermove', (e) => {
    const previous = pointers.get(e.pointerId);
    if (!previous) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) moved = true;
    const dx = (previous.x - e.clientX) * 0.006,
      dy = (e.clientY - previous.y) * 0.006;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      controller.inspect(dx, dy);
      const dt = Math.max(0.016, (e.timeStamp - previousTime) / 1000);
      controller.fling(dx / dt, dy / dt);
      previousTime = e.timeStamp;
      onChange?.();
    } else {
      const [a, b] = [...pointers.values()],
        next = Math.hypot(a.x - b.x, a.y - b.y);
      if (separation && next) controller.zoomBy(separation / next);
      separation = next;
      onChange?.();
    }
  });
  region.addEventListener('pointerup', (e) => {
    if (
      e.pointerType === 'touch' &&
      !moved &&
      !pinched &&
      pointers.size === 1
    ) {
      if (
        lastTap &&
        e.timeStamp - lastTap < 350 &&
        Math.hypot(e.clientX - tapX, e.clientY - tapY) < 30
      ) {
        controller.toggleZoom();
        onChange?.();
        lastTap = 0;
      } else {
        lastTap = e.timeStamp;
        tapX = e.clientX;
        tapY = e.clientY;
      }
    } else lastTap = 0;
    pointers.delete(e.pointerId);
    separation = 0;
    if (!pointers.size) controller.setDragging(false);
  });
  region.addEventListener('dblclick', (e) => {
    if (controller.snapshot().playback !== 'observing') return;
    e.preventDefault();
    controller.toggleZoom();
    onChange?.();
  });
  region.addEventListener('pointercancel', clear);
  region.addEventListener('lostpointercapture', (e) => {
    if (pointers.has(e.pointerId)) clear();
  });
  region.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => controller.inspect(-0.12, 0),
      ArrowRight: () => controller.inspect(0.12, 0),
      ArrowUp: () => controller.inspect(0, 0.12),
      ArrowDown: () => controller.inspect(0, -0.12),
      '+': () => controller.zoomBy(0.95),
      '=': () => controller.zoomBy(0.95),
      '-': () => controller.zoomBy(1.05),
      _: () => controller.zoomBy(1.05),
      Home: () => controller.resetView(),
      '0': () => controller.resetView(),
    };
    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
      onChange?.();
    }
  });
  return clear;
}
