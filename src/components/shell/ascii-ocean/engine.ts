// Ported from ascii-sharks (https://github.com/stackedlol/ascii-sharks), MIT License, (c) 2026 drewdi.
// See THIRD_PARTY_NOTICES.md. Adapted for El Pilar: ~30 fps cap, pauses when the tab is hidden,
// theme-aware colours from CSS tokens, no click "splash" (the canvas is a passive background),
// and a random time scale so each visit swims at a slightly different pace.
import { AsciiRenderer } from "./renderer";
import { World, type SharkSpec } from "./world";

const STEP = 1 / 60;
const MAX_STEPS = 4;
/** Background detail: ~30 fps is plenty and halves the paint cost. */
const FRAME_MS = 1000 / 30;

export type OceanOptions = {
  sharks: SharkSpec[];
  /** Overrides the area-based fish population. */
  fishCount?: number;
  /** Simulation speed multiplier (1 = upstream). */
  timeScale?: number;
};

/**
 * Wires World + AsciiRenderer to a canvas: fixed-timestep loop, resize,
 * pointer proximity, pausing off-screen / hidden tab, and prefers-reduced-motion.
 */
export class OceanEngine {
  private world: World;
  private renderer: AsciiRenderer;
  private raf = 0;
  private last = 0;
  private lastPaint = 0;
  private acc = 0;
  private visible = true;
  private timeScale: number;
  private reducedMotion: MediaQueryList;
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private themeObserver: MutationObserver;
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement, options: OceanOptions) {
    this.world = new World(options.sharks, options.fishCount);
    this.timeScale = options.timeScale ?? 1;
    this.renderer = new AsciiRenderer(canvas);
    this.renderer.setFontFamily(getComputedStyle(canvas).fontFamily);
    this.readPalette();
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = !!entry?.isIntersecting;
      this.schedule();
    });
    this.intersectionObserver.observe(canvas);
    // Dark mode is a class on <body>: re-read the tokens when it changes.
    this.themeObserver = new MutationObserver(() => {
      this.readPalette();
      if (this.reducedMotion.matches) this.drawStill();
    });
    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    this.reducedMotion.addEventListener("change", this.onMotionPreference);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.onPointerLeave);
    window.addEventListener("blur", this.onPointerLeave);

    this.resize();
    this.schedule();
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.themeObserver.disconnect();
    this.reducedMotion.removeEventListener("change", this.onMotionPreference);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pointermove", this.onPointerMove);
    document.documentElement.removeEventListener("pointerleave", this.onPointerLeave);
    window.removeEventListener("blur", this.onPointerLeave);
  }

  private readPalette() {
    const css = getComputedStyle(this.canvas);
    const ink = css.getPropertyValue("--ink").trim() || "#171717";
    const dot = css.getPropertyValue("--faint").trim() || css.getPropertyValue("--muted").trim() || ink;
    this.renderer.setPalette({ ink, dot });
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.resize(rect.width, rect.height, dpr);
    this.world.resize(rect.width, rect.height, this.renderer.cellWidth, this.renderer.cellHeight);
    if (this.reducedMotion.matches || !this.raf) this.drawStill();
  }

  private schedule() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.disposed || !this.visible || document.hidden || this.reducedMotion.matches) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    if (now - this.lastPaint < FRAME_MS - 2) return;
    this.lastPaint = now;
    const dt = Math.min(0.1, (now - this.last) / 1000) * this.timeScale;
    this.last = now;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < MAX_STEPS) {
      this.world.step(STEP);
      this.acc -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) this.acc = 0;
    this.renderer.render(this.world, dt);
  };

  /** Reduced motion (or before the first frame): let the ecosystem settle, then show a single frame. */
  private drawStill() {
    if (this.world.time < 4) {
      for (let i = 0; i < 240; i++) this.world.step(STEP);
    }
    this.renderer.render(this.world, STEP);
  }

  private onMotionPreference = () => {
    if (this.reducedMotion.matches) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.drawStill();
    } else {
      this.schedule();
    }
  };

  private onVisibility = () => this.schedule();

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const p = this.world.pointer;
    p.x = x;
    p.y = y;
    p.active = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height && e.pointerType !== "touch";
  };

  private onPointerLeave = () => {
    this.world.pointer.active = false;
  };
}
