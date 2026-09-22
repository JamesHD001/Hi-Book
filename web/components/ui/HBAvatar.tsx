import Image from "next/image";

const avatarSizes = [24, 32, 40, 48, 56, 64, 80, 96] as const;

type HBAvatarProps = {
  src?: string | null;
  alt: string;
  fallback?: string;
  size?: number;
};

export default function HBAvatar({ src, alt, fallback="?", size=40 }: HBAvatarProps) {
  const resolvedSize = avatarSizes.includes(size as (typeof avatarSizes)[number])
    ? size
    : 40;
  const className = `hb-avatar hb-avatar--${resolvedSize}`;

  if (!src) {
    return (
      <span className={className} role="img" aria-label={alt}>
        {fallback.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return <Image className={className} src={src} alt={alt} width={resolvedSize} height={resolvedSize} />;
}
