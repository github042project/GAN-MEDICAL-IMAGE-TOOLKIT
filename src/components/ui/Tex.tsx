import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';

interface TexProps {
  math: string;
  display?: boolean;
  className?: string;
  /** Allow \htmlClass for interactive term highlighting. */
  trust?: boolean;
}

/** Render a LaTeX string with KaTeX (static, no runtime layout cost). */
export function Tex({ math, display = false, className = '', trust = false }: TexProps) {
  const html = useMemo(
    () =>
      katex.renderToString(math, {
        displayMode: display,
        throwOnError: false,
        output: 'htmlAndMathml',
        trust: trust ? (ctx) => ctx.command === '\\htmlClass' : false,
        strict: trust ? 'ignore' : 'warn',
      }),
    [math, display, trust],
  );
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
