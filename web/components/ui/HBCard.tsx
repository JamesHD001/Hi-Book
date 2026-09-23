import type { HTMLAttributes } from "react";

export default function HBCard({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`hb-card ${className}`} {...props} />;
}
