"use client";

/*
 * Subtle ASCII background: sharks hunting small fish schools, drawn as glyphs on a canvas.
 * Technique and simulation ported from ascii-sharks by drewdi
 * (https://github.com/stackedlol/ascii-sharks, MIT License). See THIRD_PARTY_NOTICES.md.
 */
import { useEffect, useRef } from "react";
import { OceanEngine, type OceanOptions } from "./engine";
import type { SharkKind } from "./world";

const KINDS: SharkKind[] = ["classic", "hammerhead", "zebra", "tiger", "greathammer", "mako", "thresher", "nurse"];

/** A different scene on every load: species, how many, sizes, fish population and pace. */
function randomScene(width: number, height: number): OceanOptions {
  const count = [1, 2, 2, 3][Math.floor(Math.random() * 4)]!;
  const same = Math.random() < 0.4;
  const first = KINDS[Math.floor(Math.random() * KINDS.length)]!;
  const sizes = [1, 0.78, 0.66];
  const sharks = Array.from({ length: count }, (_, i) => ({
    kind: same ? first : i === 0 ? first : KINDS[Math.floor(Math.random() * KINDS.length)]!,
    size: sizes[i]! * (0.92 + Math.random() * 0.12),
  }));
  // Fewer fish than upstream's hero: this is a quiet background.
  const area = Math.max(1, (width * height) / 9000);
  const fishCount = Math.round(Math.min(220, Math.max(50, area)) * (0.6 + Math.random() * 0.5));
  return { sharks, fishCount, timeScale: 0.7 + Math.random() * 0.35 };
}

export function AsciiOcean({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: OceanEngine | null = null;
    try {
      engine = new OceanEngine(canvas, randomScene(window.innerWidth, window.innerHeight));
    } catch {
      // No 2D canvas: the background simply stays empty.
    }
    return () => engine?.destroy();
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={`ascii-ocean${className ? ` ${className}` : ""}`} />;
}
