export default function Watermark({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`st-watermark select-none ${className}`}
      style={{ fontSize: "clamp(220px, 32vw, 520px)" }}
    >
      ST
    </span>
  );
}
