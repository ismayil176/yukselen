export function GirlNotebookIllustration({ className = "" }: { className?: string }) {
  // Custom SVG illustration (no external assets)
  return (
    <svg
      viewBox="0 0 640 520"
      className={className}
      role="img"
      aria-label="Qız əlində dəftər illüstrasiyası"
    >
      <defs>
        <linearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F5F3FF" />
          <stop offset="1" stopColor="#EDE9FE" />
        </linearGradient>
        <linearGradient id="blob" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C4B5FD" stopOpacity="0.9" />
          <stop offset="1" stopColor="#A78BFA" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B1B3F" />
          <stop offset="1" stopColor="#1F1630" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* background card */}
      <rect x="20" y="20" width="600" height="480" rx="28" fill="url(#cardBg)" />

      {/* decorative blobs */}
      <path
        d="M540 120c40 40 50 110 10 150s-120 30-160-10-30-120 10-160 100-20 140 20Z"
        fill="url(#blob)"
        opacity="0.9"
      />
      <path
        d="M180 420c-50 20-120-10-140-60s20-110 70-130 110 10 130 60-10 110-60 130Z"
        fill="url(#blob)"
        opacity="0.45"
      />

      {/* notebook */}
      <g filter="url(#softShadow)">
        <rect x="390" y="250" width="170" height="210" rx="18" fill="#FFFFFF" />
        <rect x="405" y="270" width="140" height="10" rx="5" fill="#DDD6FE" />
        <rect x="405" y="295" width="120" height="10" rx="5" fill="#E9D5FF" />
        <rect x="405" y="320" width="135" height="10" rx="5" fill="#DDD6FE" />
        <rect x="405" y="345" width="110" height="10" rx="5" fill="#E9D5FF" />
        <rect x="405" y="370" width="130" height="10" rx="5" fill="#DDD6FE" />
        <rect x="405" y="395" width="105" height="10" rx="5" fill="#E9D5FF" />
        <rect x="390" y="250" width="14" height="210" rx="7" fill="#A78BFA" />
      </g>

      {/* girl */}
      <g filter="url(#softShadow)">
        {/* body */}
        <path
          d="M250 405c10-70 55-105 120-105s110 35 120 105c2 14-7 27-21 27H271c-14 0-23-13-21-27Z"
          fill="#7C3AED"
          opacity="0.92"
        />
        {/* neck */}
        <path d="M340 268c0 16-13 30-30 30s-30-14-30-30v-30h60v30Z" fill="#F7C7A5" />
        {/* face */}
        <path
          d="M310 110c52 0 92 43 86 98-5 54-43 90-86 90s-81-36-86-90c-6-55 34-98 86-98Z"
          fill="#FAD0B3"
        />
        {/* hair */}
        <path
          d="M205 175c5-55 45-95 105-95 58 0 100 38 110 90 5 26 0 55-10 75-3-26-19-47-42-55-18-6-39-4-58-11-24-9-41-28-47-49-5 12-21 28-42 35-10 4-18 7-16 10Z"
          fill="url(#hair)"
        />
        <path
          d="M246 195c-20 20-28 55-18 90-18-18-30-44-32-74-2-24 2-41 14-58 9-12 21-21 34-27-9 28-3 52 2 69Z"
          fill="url(#hair)"
          opacity="0.95"
        />

        {/* eyes */}
        <circle cx="280" cy="205" r="6" fill="#2B1B3F" />
        <circle cx="340" cy="205" r="6" fill="#2B1B3F" />
        <path d="M270 230c14 12 34 12 48 0" fill="none" stroke="#B45309" strokeWidth="5" strokeLinecap="round" opacity="0.5" />

        {/* arms holding notebook */}
        <path
          d="M265 330c-18-10-40 0-50 18-10 18-2 43 18 54l40 22 18-33-26-16c-8-5-11-15-6-23l6-9Z"
          fill="#FAD0B3"
        />
        <path
          d="M400 338c18-10 40 0 50 18 10 18 2 43-18 54l-46 26-18-33 32-18c8-5 11-15 6-23l-6-9Z"
          fill="#FAD0B3"
        />
        {/* sleeves */}
        <path d="M250 327c22-30 58-46 96-46s74 16 96 46l-26 22c-16-20-41-32-70-32s-54 12-70 32l-26-22Z" fill="#6D28D9" />
      </g>

      {/* small sparkles */}
      <g opacity="0.8">
        <path d="M90 120l8 18 18 8-18 8-8 18-8-18-18-8 18-8 8-18Z" fill="#A78BFA" />
        <path d="M520 420l6 14 14 6-14 6-6 14-6-14-14-6 14-6 6-14Z" fill="#C4B5FD" />
      </g>
    </svg>
  );
}
