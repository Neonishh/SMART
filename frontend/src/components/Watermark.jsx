export default function Watermark({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`st-watermark select-none ${className}`}
      style={{ fontSize: "clamp(320px, 42vw, 680px)" }}
    >
      ST
    </span>
  );
}
