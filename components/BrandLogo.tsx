import Image from "next/image";

type BrandLogoProps = {
  white?: boolean;
  horizontal?: boolean;
  compact?: boolean;
};

export default function BrandLogo({
  white = false,
  horizontal = true,
  compact = false,
}: BrandLogoProps) {
  const src = horizontal
    ? white
      ? "/capdcoop-logo-white.png"
      : "/capdcoop-logo-horizontal.png"
    : white
    ? "/capdcoop-logo-white.png"
    : "/capdcoop-logo.png";

  return (
    <Image
      src={src}
      alt="CAPDCOOP"
      width={compact ? 180 : 300}
      height={compact ? 60 : 110}
      priority
      className={
        compact
          ? "h-14 w-auto object-contain"
          : "h-24 w-auto object-contain"
      }
    />
  );
}