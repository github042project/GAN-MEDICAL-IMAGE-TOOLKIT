/** The amber-and-cyan "G|D" mark used in the nav, favicon and closing page. */
export function Monogram({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`} aria-hidden="true">
      <span className="text-gen">G</span>
      <span className="mx-0.5 text-bone/50">|</span>
      <span className="text-disc">D</span>
    </span>
  );
}
