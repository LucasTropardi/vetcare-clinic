import logo from "../../assets/brand/logo-vetcare.png";

type Props = {
  height?: number;
  alt?: string;
  className?: string;
};

export function BrandLogo({ height = 28, alt = "VetCare", className }: Props) {
  return (
    <img
      src={logo}
      alt={alt}
      height={height}
      style={{
        height,
        width: "auto",
        display: "block",
        userSelect: "none",
      }}
      className={className}
      draggable={false}
    />
  );
}
