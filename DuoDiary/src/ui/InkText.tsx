import { useEffect, useRef, useState } from 'react';

/**
 * Handwriting that draws itself.
 *
 * SVG <text> honours stroke-dasharray, so outlining the glyphs in a script face
 * and running the dash offset to zero makes the letters appear stroke-first, the
 * way a nib lays ink. The fill then bleeds in behind it. No font-to-path build
 * step, no library, and it stays selectable text for a screen reader.
 */
export function InkText({
  children, size = 64, duration = 2.6, delay = 0.2, className = '', color = 'rgb(var(--gold))', onDone,
}: {
  children: string;
  size?: number;
  duration?: number;
  delay?: number;
  className?: string;
  color?: string;
  onDone?: () => void;
}) {
  const textRef = useRef<SVGTextElement>(null);
  const [length, setLength] = useState(1200);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const node = textRef.current;
    if (!node) return;
    // measure once the webfont has actually landed, or the dash length is wrong
    const measure = () => {
      try { setLength(node.getComputedTextLength() * 3.4 || 1200); } catch { /* not laid out yet */ }
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    const fill = window.setTimeout(() => { setFilled(true); onDone?.(); }, (delay + duration * 0.72) * 1000);
    return () => clearTimeout(fill);
  }, [children, delay, duration, onDone]);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${Math.max(320, children.length * size * 0.52)} ${size * 1.7}`}
      role="img"
      aria-label={children}
      style={{ overflow: 'visible', width: '100%' }}
    >
      <text
        ref={textRef}
        x="4"
        y={size * 1.12}
        fontFamily="Caveat, cursive"
        fontSize={size}
        fill={color}
        stroke={color}
        strokeWidth={1.05}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          fillOpacity: filled ? 1 : 0,
          transition: `fill-opacity ${duration * 0.5}s ease-out`,
          strokeDasharray: length,
          strokeDashoffset: length,
          animation: `write ${duration}s cubic-bezier(.25,.6,.3,1) ${delay}s forwards`,
        }}
      >
        {children}
      </text>
    </svg>
  );
}
