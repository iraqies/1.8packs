import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef } from "react";

const MAX_TILT = 4.5;
const EASE = 0.12;
const REST = { rx: 0, ry: 0, mx: 0.5, my: 0.5 };

export const cardTiltStyle = {
  "--rx": "0deg",
  "--ry": "0deg",
  "--mx": "50%",
  "--my": "50%",
} as CSSProperties;

export const cardTiltClass =
  "[transform:perspective(1400px)_rotateX(var(--rx))_rotateY(var(--ry))]";

export function useCardTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const frame = useRef(0);
  const box = useRef({ left: 0, top: 0, width: 1, height: 1 });
  const current = useRef({ ...REST });
  const target = useRef({ ...REST });

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function write() {
    const el = ref.current;
    if (!el) return;
    const { rx, ry, mx, my } = current.current;
    el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(mx * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(my * 100).toFixed(1)}%`);
  }

  function tick() {
    const c = current.current;
    const t = target.current;
    c.rx += (t.rx - c.rx) * EASE;
    c.ry += (t.ry - c.ry) * EASE;
    c.mx += (t.mx - c.mx) * EASE;
    c.my += (t.my - c.my) * EASE;
    write();
    const settled = Math.abs(t.rx - c.rx) < 0.02 && Math.abs(t.ry - c.ry) < 0.02;
    if (settled) {
      frame.current = 0;
      return;
    }
    frame.current = requestAnimationFrame(tick);
  }

  function aim() {
    if (frame.current) return;
    frame.current = requestAnimationFrame(tick);
  }

  function onPointerEnter(event: ReactPointerEvent<T>) {
    const rect = event.currentTarget.getBoundingClientRect();
    box.current = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  function onPointerMove(event: ReactPointerEvent<T>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { left, top, width, height } = box.current;
    const nx = Math.min(1, Math.max(0, (event.clientX - left) / width));
    const ny = Math.min(1, Math.max(0, (event.clientY - top) / height));
    target.current = {
      rx: -(ny * 2 - 1) * MAX_TILT,
      ry: (nx * 2 - 1) * MAX_TILT,
      mx: nx,
      my: ny,
    };
    aim();
  }

  function onPointerLeave() {
    target.current = { ...REST };
    aim();
  }

  return {
    ref,
    style: cardTiltStyle,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
  };
}
