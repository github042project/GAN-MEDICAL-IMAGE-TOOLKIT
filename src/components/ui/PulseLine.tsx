interface PulseLineProps {
  /** Seconds for one pulse to cross the line. */
  duration?: number;
  delay?: number;
  className?: string;
}

/** Thin amber-to-cyan line with a light pulse travelling left to right. */
export function PulseLine({ duration = 2.6, delay = 0, className = '' }: PulseLineProps) {
  return (
    <div aria-hidden="true" className={`relative h-[3px] overflow-hidden ${className}`}>
      <div className="absolute inset-x-0 top-px h-px bg-gradient-to-r from-gen/60 to-disc/60" />
      <div
        className="absolute inset-0"
        style={{ animation: `pulse-travel ${duration}s cubic-bezier(.5,0,.5,1) ${delay}s infinite` }}
      >
        <div className="absolute right-0 top-1/2 h-[3px] w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-gen-glow to-disc-glow" />
      </div>
    </div>
  );
}
