/**
 * Lane-coloured horse silhouette used on the betting cards.
 * The body is drawn in the horse's assigned lane colour, the hooves take the
 * darker silks tone, and the lane number rides in a small badge so the runner
 * stays identifiable at a glance. Odds are not shown anywhere — each horse has
 * an equal chance of winning.
 */
export default function HorseSilhouette({ color, silks, number, size = 30 }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size * 0.76 }}
    >
      <svg viewBox="0 0 40 30" width="100%" height="100%" aria-hidden="true">
        <g fill={color}>
          {/* tail */}
          <path d="M9.8 10.8 C6.2 11.6 4.6 14 5.3 17.8 C7.6 14.7 8.6 13.2 10.9 12.3 Z" />
          {/* body */}
          <ellipse cx="19" cy="15" rx="10" ry="6" />
          {/* hind far leg */}
          <path d="M9.6 19 L11.4 19 L11 27 L9.9 27 Z" />
          {/* hind near leg */}
          <path d="M13 19.2 L15.8 19.2 L15.2 28 L13.6 28 Z" />
          {/* neck */}
          <path d="M25.4 11.2 L30.4 4.2 L34.6 6.6 L29.2 12.6 Z" />
          {/* head */}
          <ellipse cx="34.4" cy="4.8" rx="3.6" ry="2.3" transform="rotate(-24 34.4 4.8)" />
          {/* ear */}
          <path d="M32.2 3.4 L33.3 0.9 L34.5 3.2 Z" />
          {/* front far leg */}
          <path d="M21.2 19.6 L23 19.6 L22.5 27.4 L21.4 27.4 Z" />
          {/* front near leg */}
          <path d="M24 19.2 L26.6 19.2 L25.9 28 L24.4 28 Z" />
        </g>
        {/* hooves in the darker silks tone */}
        <g fill={silks} opacity="0.85">
          <path d="M9.9 27 L11 27 L11 28.4 L9.9 28.4 Z" />
          <path d="M13.6 28 L15.2 28 L15.2 29.4 L13.6 29.4 Z" />
          <path d="M21.4 27.4 L22.5 27.4 L22.5 28.8 L21.4 28.8 Z" />
          <path d="M24.4 28 L25.9 28 L25.9 29.4 L24.4 29.4 Z" />
        </g>
      </svg>
      <span
        className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full text-[9px] font-black leading-none text-white ring-2 ring-white"
        style={{ width: 14, height: 14, backgroundColor: silks }}
      >
        {number}
      </span>
    </span>
  );
}