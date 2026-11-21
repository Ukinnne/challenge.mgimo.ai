export default function Logo({ size = 36, bg = '#0F5C78' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill={bg} />
      <path
        d="M8 40c8-10 14-10 20 0s12 10 20 0 8-6 8-6"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="44" cy="20" r="6" fill="#F2B21A" />
    </svg>
  )
}