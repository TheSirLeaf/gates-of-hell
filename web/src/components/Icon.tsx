const PATHS = {
  flame: 'M12 3c.8 3-2.5 4.5-2.5 8a2.5 2.5 0 0 0 5 0c0-1-.4-1.8-.9-2.6 2.8 1.6 4.9 4.2 4.9 7.1a6.5 6.5 0 0 1-13 0c0-3.6 2.8-5.4 3.8-8.1.7.7 1.5 1 2.2-.2z',
  sound: 'M4 9v6h4l5 4V5L8 9H4z M16.5 9a4 4 0 0 1 0 6 M19 6.5a8 8 0 0 1 0 11',
  mute: 'M4 9v6h4l5 4V5L8 9H4z M17 9l5 6 M22 9l-5 6',
  sheet: 'M6 3h8l5 5v13H6z M14 3v5h5 M9 13h7 M9 17h7',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M5 17a3 3 0 0 1 3-3h11',
  anvil: 'M3 6h13a5 5 0 0 1 5 5v1h-5l-1 3h2v3H7v-3h2l1-3H3z',
  skull: 'M12 3a8 8 0 0 0-8 8c0 3 1.6 4.6 3 5.4V20h10v-3.6c1.4-.8 3-2.4 3-5.4a8 8 0 0 0-8-8z M9 12.5h.01 M15 12.5h.01 M10 20v-2.5 M14 20v-2.5',
  swords: 'M14.5 17.5L3 6V3h3l11.5 11.5 M13 19l6-6 M16 16l4 4 M19 21l2-2 M14.5 6.5L18 3h3v3l-3.5 3.5',
  chat: 'M4 5h16v11H9l-5 4z',
  dice: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M8 8h.01 M16 8h.01 M12 12h.01 M8 16h.01 M16 16h.01',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  users: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1 M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M21 20v-1a4 4 0 0 0-3-3.9 M16 4.1a3.5 3.5 0 0 1 0 6.8',
  logout: 'M9 4H5v16h4 M16 8l4 4-4 4 M20 12H9',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  plus: 'M12 5v14 M5 12h14',
  close: 'M6 6l12 12 M18 6L6 18',
  lock: 'M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  support: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z M5.6 5.6l3.9 3.9 M14.5 14.5l3.9 3.9 M18.4 5.6l-3.9 3.9 M9.5 14.5l-3.9 3.9',
  bell: 'M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z M10 20a2 2 0 0 0 4 0',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  check: 'M5 12.5l5 5 9-11',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  back: 'M15 5l-7 7 7 7',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  send: 'M4 12l16-8-6 17-3-7z M11 14l9-10',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
