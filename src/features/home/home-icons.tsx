/**
 * Icônes inline de la homepage (passe E, 30) — SVG écrits à la main, zéro
 * dépendance (garde-fou CI 28a : aucune lib d'icônes ajoutée). Toutes en
 * `currentColor`, dimensionnées par le parent.
 */

interface IconProps {
  className?: string;
}

const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export function TruckIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} width="22" height="22" className={className}>
      <path d="M2 7h11v9H2z" />
      <path d="M13 10h4l4 3v3h-8z" />
      <circle cx="7" cy="18.5" r="1.5" />
      <circle cx="17.5" cy="18.5" r="1.5" />
    </svg>
  );
}

export function PackageIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} width="22" height="22" className={className}>
      <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
      <path d="M3 8.5v7L12 20l9-4.5v-7" />
      <path d="M12 13v7" />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} width="22" height="22" className={className}>
      <path d="M12 3.5 5 6v5.5c0 4.2 3 7.4 7 9 4-1.6 7-4.8 7-9V6l-7-2.5Z" />
      <path d="M9 12.5l2 2 4-4.5" />
    </svg>
  );
}

export function UndoIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} width="22" height="22" className={className}>
      <path d="M4 10h8a5 5 0 0 1 0 10H9" />
      <path d="M8 5 4 10l4 5" />
    </svg>
  );
}

export function RulerIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} width="20" height="20" className={className}>
      <path d="M3 16 16 3l5 5L8 21z" />
      <path d="m9 10 2 2M12.5 6.5l2 2M6.5 13.5l2 2" />
    </svg>
  );
}

export function LayersIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} width="20" height="20" className={className}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  );
}

export function SparkleIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} width="20" height="20" className={className}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m6 6 2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  );
}

export function FlameIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} width="20" height="20" className={className}>
      <path d="M12 3c1 3-3 4-3 7.5A3.5 3.5 0 0 0 12 14a3 3 0 0 0 3-3c1.5 1.5 2 3 2 4.5A5 5 0 0 1 7 15.5C7 10 12 8 12 3Z" />
    </svg>
  );
}

export function BroomIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} width="20" height="20" className={className}>
      <path d="M20 4 10 14" />
      <path d="M9 13 4 20l3.5-1L9 15.5z" />
      <path d="M11 15 6 20" />
    </svg>
  );
}

export function WaterDropIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} width="18" height="18" className={className}>
      <path d="M12 3c-3 4-6 7.2-6 10.5A6 6 0 0 0 12 21a6 6 0 0 0 6-6.5C18 10.2 15 7 12 3z" />
    </svg>
  );
}

export function QuestionIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} width="18" height="18" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.3 1.8-2.3 3.6" />
      <path d="M12 17.2v.1" />
    </svg>
  );
}

export function PauseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" className={className} aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" className={className} aria-hidden="true">
      <path d="M7 5v14l12-7z" fill="currentColor" />
    </svg>
  );
}
