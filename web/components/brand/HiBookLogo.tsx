import type { SVGProps } from "react";

type HiBookLogoProps = SVGProps<SVGSVGElement> & {
  compact?: boolean;
};

export default function HiBookLogo({ compact = false, ...props }: HiBookLogoProps) {
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label={compact ? "Hi!Book" : undefined} {...props}>
      <path d="M8 7.5h32A4.5 4.5 0 0 1 44.5 12v17A4.5 4.5 0 0 1 40 33.5H25.5L16 41v-7.5H8A4.5 4.5 0 0 1 3.5 29V12A4.5 4.5 0 0 1 8 7.5Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M14 24.5c4.5-7 9.5-7 14 0 2.5 3.8 5 3.8 6.5 0" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="14" cy="24.5" r="3" fill="currentColor" />
      <circle cx="28" cy="24.5" r="3" fill="currentColor" />
      <circle cx="34.5" cy="24.5" r="3" fill="currentColor" />
      {!compact && <path d="M36.5 12.5v8" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />}
    </svg>
  );
}
