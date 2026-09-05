import React, { useEffect, useRef, useState } from 'react';
import { BICHON_RUN_FRAMES, BICHON_VIEWBOX } from './bichonRunFrames';

export interface BichonSpinnerProps {
  /** Rendered size in px (square). Default 64. */
  size?: number | string;
  /**
   * Controlled frame index (0–7). When provided, the component shows exactly this
   * frame and does not auto-play. Omit for automatic looping.
   */
  frame?: number;
  /** Playback speed in frames per second. Default 12.5 (= 0.64s per loop). */
  fps?: number;
  /** Alternative to fps: full loop duration in seconds. Overrides fps when set. */
  loopDuration?: number;
  /** Pause/resume auto-play without unmounting. Default true. */
  playing?: boolean;
  /** Outline / face color. Default "#000000". */
  lineColor?: string;
  /** Body fill color. Default "#FFFFFF". Use "none" for outline-only. */
  fillColor?: string;
  /** Flip horizontally so the dog runs to the RIGHT. Default false (runs left). */
  flip?: boolean;
  /** Called every time the displayed frame changes (auto-play only). */
  onFrameChange?: (frame: number) => void;
  /** Accessible label. Default "Loading". Pass "" to hide from screen readers. */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

const FRAME_COUNT = BICHON_RUN_FRAMES.length;

export function BichonSpinner({
  size = 64,
  frame,
  fps = 12.5,
  loopDuration,
  playing = true,
  lineColor = '#000000',
  fillColor = '#FFFFFF',
  flip = false,
  onFrameChange,
  label = 'Loading',
  className,
  style,
}: BichonSpinnerProps) {
  const isControlled = typeof frame === 'number';
  const [autoFrame, setAutoFrame] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const frameRef = useRef(0);

  const frameInterval = loopDuration
    ? (loopDuration * 1000) / FRAME_COUNT
    : 1000 / Math.max(fps, 0.001);

  useEffect(() => {
    if (isControlled || !playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    lastTickRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - lastTickRef.current;
      if (elapsed >= frameInterval) {
        const steps = Math.floor(elapsed / frameInterval);
        lastTickRef.current += steps * frameInterval;
        frameRef.current = (frameRef.current + steps) % FRAME_COUNT;
        setAutoFrame(frameRef.current);
        onFrameChange?.(frameRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isControlled, playing, frameInterval, onFrameChange]);

  const index = isControlled
    ? ((Math.round(frame!) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT
    : autoFrame;
  const current = BICHON_RUN_FRAMES[index];

  return (
    <svg
      viewBox={`0 0 ${BICHON_VIEWBOX} ${BICHON_VIEWBOX}`}
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={className}
      style={{ display: 'inline-block', overflow: 'visible', ...style }}
    >
      <g transform={flip ? `translate(${BICHON_VIEWBOX} 0) scale(-1 1)` : undefined}>
        <path fill={fillColor} d={current.fill} />
        <path fill={lineColor} fillRule="evenodd" d={current.line} />
      </g>
    </svg>
  );
}

export default BichonSpinner;
