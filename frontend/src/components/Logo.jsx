export default function Logo({ size = 36, bg = '#285653' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill={bg} />
      <path d="M11 11.5h9.2c5.2 0 8.8 3.2 8.8 8.5s-3.6 8.5-8.8 8.5H11z" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M16 16.5h4.2c2.3 0 3.8 1.2 3.8 3.5s-1.5 3.5-3.8 3.5H16z" fill="none" stroke="#d9bd7e" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}