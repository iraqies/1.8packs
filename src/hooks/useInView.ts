import { useEffect, useRef, useState } from "react";

interface Options {
  /** Fraction of the element that must be visible before it counts as shown. */
  threshold?: number;
  /** Shrinks the viewport so elements trigger slightly before the edge. */
  rootMargin?: string;
  /** Keep the shown state after the element scrolls back out. */
  once?: boolean;
}

export function useInView<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.16,
  rootMargin = "0px 0px -8% 0px",
  once = true,
}: Options = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}
