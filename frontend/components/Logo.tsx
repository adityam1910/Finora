export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-display text-xl font-extrabold">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <rect width="28" height="28" rx="8" fill="#2747f5" />
        <path d="M8 20V8h10M8 14h7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="20" cy="19" r="2.2" fill="#f5a524" />
      </svg>
      <span className={light ? "text-white" : "text-ink"}>Finora</span>
    </span>
  );
}
