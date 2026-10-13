// Bombus design system — one import for the whole app.
//   import { HiveMap, BotLink, StatusBadge } from "./bombus";
// Files in this folder come from the Bombus design system; update them by copying
// the new versions over (tokens.css is generated from tokens.json).
import "./tokens.css";
import "./bundle.css";
import "./react-global.js"; // must run before bundle.js
import "./bundle.js";       // defines window.Bombus

const B = window.Bombus;

export const {
  Button, StatusBadge, HiveMarker, HiveDetails, HiveMap, BotLink,
  HiveIcon, Glyph, Code, STATUSES, STATUS_ORDER,
} = B;
export default B;
