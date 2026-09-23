import logoAsset from "@/assets/julius-sarich-logo.png.asset.json";

export function BrandLogo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="Julius Sarich"
      className={`${className} rounded-md bg-background object-contain`}
    />
  );
}