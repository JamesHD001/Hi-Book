import type { InputHTMLAttributes } from "react";

export default function HBInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`hb-input ${className}`} {...props} />;
}
