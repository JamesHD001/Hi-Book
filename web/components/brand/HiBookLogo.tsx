import Image, { type ImageProps } from "next/image";
import appIcon from "../../icons/hibook-app-icon.png";
import completeLogo from "../../icons/hibook-complete-logo.png";

type HiBookLogoProps = Omit<ImageProps, "alt" | "src"> & {
  compact?: boolean;
};

export default function HiBookLogo({
  compact = false,
  className = "",
  ...props
}: HiBookLogoProps) {
  return (
    <Image
      src={compact ? appIcon : completeLogo}
      alt=""
      className={`object-contain ${className}`}
      {...props}
    />
  );
}
