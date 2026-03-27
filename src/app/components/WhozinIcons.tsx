type IconProps = {
  color?: string;
  size?: number;
  className?: string;
};

function iconProps({ size = 24, className }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    className,
    "aria-hidden": true,
  } as const;
}

export function HomeIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <path
        d="M12 4L4 10V19C4 19.5523 4.44772 20 5 20H9.5C10.0523 20 10.5 19.5523 10.5 19V15C10.5 14.4477 10.9477 14 11.5 14H12.5C13.0523 14 13.5 14.4477 13.5 15V19C13.5 19.5523 13.9477 20 14.5 20H19C19.5523 20 20 19.5523 20 19V10L12 4Z"
        fill={color}
      />
    </svg>
  );
}

export function ExploreIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <circle cx="12" cy="12" r="8" fill={color} />
      <path d="M15.5 8.5L10.5 10.5L8.5 15.5L13.5 13.5L15.5 8.5Z" fill="black" opacity="0.25" />
      <circle cx="12" cy="12" r="1.5" fill="black" opacity="0.25" />
    </svg>
  );
}

export function ActivityIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <rect x="5" y="4" width="14" height="16" rx="5" fill={color} />
      <path
        d="M12 8V12L15 14"
        stroke="black"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.25"
      />
      <circle cx="12" cy="12" r="1.5" fill="black" opacity="0.25" />
    </svg>
  );
}

export function ProfileIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <circle cx="12" cy="9" r="4" fill={color} />
      <path d="M6 20C6 16.6863 8.68629 14 12 14C15.3137 14 18 16.6863 18 20" fill={color} />
    </svg>
  );
}

export function FriendsGoingIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <circle cx="9" cy="9" r="4" fill={color} />
      <circle cx="16" cy="10" r="3" fill={color} opacity="0.6" />
      <path d="M3.5 20C3.5 16.6863 6.18629 14 9.5 14C12.8137 14 15.5 16.6863 15.5 20" fill={color} />
    </svg>
  );
}

export function DensityIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <circle cx="7" cy="7" r="3" fill={color} />
      <circle cx="17" cy="7" r="3" fill={color} />
      <circle cx="7" cy="17" r="3" fill={color} />
      <circle cx="17" cy="17" r="3" fill={color} />
      <circle cx="12" cy="12" r="3.5" fill={color} />
    </svg>
  );
}

export function MutualsIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <circle cx="8.5" cy="10" r="4" fill={color} opacity="0.65" />
      <circle cx="15.5" cy="10" r="4" fill={color} opacity="0.65" />
      <circle cx="12" cy="14.5" r="3.5" fill={color} />
    </svg>
  );
}

export function RSVPIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <rect x="5" y="5" width="14" height="14" rx="5" fill={color} />
      <path
        d="M9 12L11 14L15 10"
        stroke="black"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.25"
      />
    </svg>
  );
}

export function InviteIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <circle cx="9" cy="9" r="4.5" fill={color} />
      <path d="M3.5 20C3.5 16.9624 5.96243 14.5 9 14.5C12.0376 14.5 14.5 16.9624 14.5 20" fill={color} />
      <circle cx="17" cy="17" r="4" fill={color} />
      <path d="M17 15V19M15 17H19" stroke="black" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
    </svg>
  );
}

export function ShareIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <circle cx="12" cy="7" r="3.5" fill={color} />
      <circle cx="7" cy="17" r="3" fill={color} opacity="0.7" />
      <circle cx="17" cy="17" r="3" fill={color} opacity="0.7" />
      <path d="M10.5 9.5L8.5 15M13.5 9.5L15.5 15" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function PrivateIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <path d="M12 4C12 4 8 5.5 8 8.5V11H16V8.5C16 5.5 12 4 12 4Z" fill={color} />
      <rect x="6" y="10" width="12" height="9" rx="4" fill={color} />
    </svg>
  );
}

export function FriendsOnlyIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <circle cx="9" cy="10" r="3.5" fill={color} />
      <circle cx="15" cy="10" r="3.5" fill={color} />
      <circle cx="12" cy="15" r="3" fill={color} />
      <path
        d="M5 8C5 6.34315 6.34315 5 8 5H16C17.6569 5 19 6.34315 19 8V16C19 17.6569 17.6569 19 16 19H8C6.34315 19 5 17.6569 5 16V8Z"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.3"
      />
    </svg>
  );
}

export function VisibilityIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <ellipse cx="12" cy="12" rx="9" ry="6" fill={color} />
      <circle cx="12" cy="12" r="3.5" fill="black" opacity="0.25" />
    </svg>
  );
}

export function EventIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <rect x="4" y="6" width="16" height="14" rx="4" fill={color} />
      <rect x="7" y="3" width="2.5" height="5" rx="1.25" fill={color} />
      <rect x="14.5" y="3" width="2.5" height="5" rx="1.25" fill={color} />
    </svg>
  );
}

export function LocationIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <path
        d="M12 3C8.68629 3 6 5.68629 6 9C6 13.5 12 21 12 21C12 21 18 13.5 18 9C18 5.68629 15.3137 3 12 3Z"
        fill={color}
      />
      <circle cx="12" cy="9" r="2.5" fill="black" opacity="0.3" />
    </svg>
  );
}

export function TimeIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <circle cx="12" cy="12" r="8" fill={color} />
      <path d="M12 7V12L15.5 14" stroke="black" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

export function TrendingIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <circle cx="6" cy="17" r="2.5" fill={color} opacity="0.5" />
      <circle cx="12" cy="13" r="3" fill={color} opacity="0.7" />
      <circle cx="17" cy="8" r="3.5" fill={color} />
      <path
        d="M17 4L17 8L13 8"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HotIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <circle cx="12" cy="12" r="5" fill={color} />
      <circle cx="6" cy="8" r="2" fill={color} opacity="0.6" />
      <circle cx="18" cy="9" r="2" fill={color} opacity="0.6" />
      <circle cx="7" cy="16" r="2" fill={color} opacity="0.6" />
      <circle cx="17" cy="16" r="2" fill={color} opacity="0.6" />
    </svg>
  );
}

export function NewIcon({ color = "currentColor", size = 24, className }: IconProps) {
  return (
    <svg {...iconProps({ size, className })}>
      <rect x="6" y="6" width="12" height="12" rx="4" fill={color} />
      <circle cx="17" cy="7" r="3" fill={color} />
      <circle cx="17" cy="7" r="1.5" fill="black" opacity="0.25" />
    </svg>
  );
}
