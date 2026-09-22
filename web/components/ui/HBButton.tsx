import type { ButtonHTMLAttributes } from "react";

type HBButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary" | "destructive" | "brand";
};

export default function HBButton({ variant="primary", className="", ...props }: HBButtonProps) {
  return <button className={`hb-button hb-button--${variant} ${className}`} {...props} />;
}
