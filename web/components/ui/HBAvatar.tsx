import Image from "next/image";

type HBAvatarProps = {
  src?: string | null;
  alt: string;
  fallback?: string;
  size?: number;
};

export default function HBAvatar({ src, alt, fallback="?", size=40 }: HBAvatarProps) {
  if (!src) return <span className="hb-avatar" style={{ width:size, height:size }} aria-label={alt}>{fallback.slice(0,1).toUpperCase()}</span>;
  return <Image className="hb-avatar" src={src} alt={alt} width={size} height={size} />;
}
