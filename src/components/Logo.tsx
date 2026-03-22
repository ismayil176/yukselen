export function Logo({ size = 44 }: { size?: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-full bg-white ring-1 ring-black/10 shadow-sm"
      style={{ width: size, height: size }}
    >
      <img
        src="/logo.jpg"
        alt="Logo"
        width={size}
        height={size}
        className="h-full w-full scale-[1.06] object-cover"
      />
    </div>
  );
}
