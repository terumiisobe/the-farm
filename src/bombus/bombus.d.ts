/** Bombus — types as documentation. Global: window.Bombus (classic script; needs window.React / ReactDOM 18). */

export type HiveStatus = "stable" | "developing" | "recovering" | "lost" | "sold";

/** Per-status overrides for label/description (e.g. another language). Glyphs and colours stay fixed. */
export type StatusOverrides = Partial<Record<HiveStatus, { label?: string; description?: string }>>;

export interface Hive {
  /** The hive's number, as the backend issues it (e.g. "12"). Numbers only — no section prefix. Unique per farm. */
  code: string | number;
  lat: number;
  lng: number;
  status: HiveStatus;
  /** Section id, matching Section.id (e.g. "B"). Shown as the outline on the map and the "Setor" row in details — never in the code. */
  section?: string;
  /** Overrides the "Setor <section>" label in the details panel. */
  sectionName?: string;
  /** Common name, pt-BR (e.g. "Mandaçaia"). */
  species?: string;
  /** Latin binomial, shown in italics (e.g. "Melipona quadrifasciata"). */
  scientificName?: string;
  /** Box model (e.g. "Caixa INPA"). */
  box?: string;
  /** When the hive was added, ISO date YYYY-MM-DD — shown as "Adicionada em". */
  addedAt?: string;
  /** Older name for addedAt; read when addedAt is missing. */
  installed?: string;
  /** ISO date YYYY-MM-DD — shown as "Última revisão em" with "há N dias". */
  lastInspection?: string;
  /** Free text — shown under "Notas" ("Sem notas." when empty). */
  notes?: string;
}

export interface Section {
  id: string;
  name?: string;
  /** Closed ring of [lat, lng] pairs. */
  polygon: [number, number][];
}

export interface Basemap {
  /** A georeferenced north-up image (e.g. a satellite or drone capture). */
  image?: string;
  /** [[south, west], [north, east]] of the image. Required with image. */
  bounds?: [[number, number], [number, number]];
  /** XYZ tile template, e.g. "https://…/{z}/{y}/{x}". Needs a host the page is allowed to load from. */
  tiles?: string;
  minZoom?: number;
  maxZoom?: number;
  attribution?: string;
  alt?: string;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = pastel-yellow fill + fine ink outline + soft lift; one per view. */
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
  /** Leading icon node; with no children the button becomes a square icon button (give it aria-label). */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export interface StatusBadgeProps {
  status: HiveStatus;
  /** Replaces the default pt-BR label. */
  label?: string;
  size?: "md" | "sm";
  statuses?: StatusOverrides;
  className?: string;
}

export interface HiveMarkerProps {
  /** Hive number, e.g. "12". */
  code: string | number;
  status: HiveStatus;
  species?: string;
  selected?: boolean;
  /** Show the code pill under the box. Default true. */
  showLabel?: boolean;
  /** Icon size in px. Default 30. */
  size?: number;
  onClick?: () => void;
  /** Positioning: the marker is position:absolute, centred on left/top. */
  style?: React.CSSProperties;
  ariaLabel?: string;
  statuses?: StatusOverrides;
  className?: string;
}

export interface HiveDetailsProps {
  hive: Hive;
  /** Shows a close button when given. */
  onClose?: () => void;
  /** "Today" for the relative date, ISO; defaults to the viewer's clock. */
  today?: string;
  statuses?: StatusOverrides;
  /** Small label above the number. Default "Colmeia". */
  codeLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

export interface HiveMapProps {
  hives: Hive[];
  sections?: Section[];
  basemap?: Basemap;
  /** Shown at the top of the legend (e.g. the farm's name). */
  title?: string;
  /** Height in px or any CSS length. Default 520. Width follows the container. */
  height?: number | string;
  /** Initial view; default fits all hives and sections. */
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  /** Default 21. */
  maxZoom?: number;
  /** Hide code pills below this zoom (selected hive always labelled). Default: always shown. */
  labelMinZoom?: number;
  /** A hive's code pill is hidden while another hive is closer than this on screen (zoom in to see it). Default 40. */
  labelMinGap?: number;
  /** Padding in px around the fitted hives. Default 48. */
  fitPadding?: number;
  /** Hive number selected on load. */
  initialSelected?: string | number;
  /** Read-only notification of the selection (null when closed). The map never edits hives. */
  onSelect?: (hive: Hive | null) => void;
  /** List statuses with zero hives in the legend too. */
  showEmptyStatuses?: boolean;
  statuses?: StatusOverrides;
  today?: string;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

export interface BotLinkProps {
  /** The bot's WhatsApp link, e.g. "https://wa.me/55XXXXXXXXXXX". The whole strip is this link; it opens in a new tab. */
  href: string;
  /** Default "Gerencie suas colmeias pelo WhatsApp". */
  title?: string;
  className?: string;
}

export declare function Button(props: ButtonProps): JSX.Element;
export declare function StatusBadge(props: StatusBadgeProps): JSX.Element;
export declare function HiveMarker(props: HiveMarkerProps): JSX.Element;
export declare function HiveDetails(props: HiveDetailsProps): JSX.Element | null;
export declare function HiveMap(props: HiveMapProps): JSX.Element;
/** A pill-shaped link out to the WhatsApp bot. The app has no chat; this only links out. */
export declare function BotLink(props: BotLinkProps): JSX.Element;
/** The brand hive box as inline SVG, always saturated yellow (hive-lid, hive-body, ink outline). Status is shown beside it, never on it. */
export declare function HiveIcon(props: { size?: number; className?: string }): JSX.Element;
/** Inline hive code chip, mono on vanilla. */
export declare function Code(props: { children: React.ReactNode }): JSX.Element;
export declare const STATUSES: Record<HiveStatus, { key: HiveStatus; label: string; glyph: string; description: string }>;
export declare const STATUS_ORDER: HiveStatus[];
