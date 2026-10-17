/** Equatorial metres per degree of latitude (WGS84 spherical approx). */
export const METERS_PER_DEGREE = 111320;

/**
 * Ground size of a [[south, west], [north, east]] box in metres.
 * East-west uses cos(mid-latitude); north-south is pure meridian arc.
 *
 * @param {[[number, number], [number, number]]} bounds
 * @returns {{ northSouthM: number, eastWestM: number }}
 */
export function groundSpanMeters(bounds) {
  const [[south, west], [north, east]] = bounds;
  const midLatRad = ((south + north) / 2) * Math.PI / 180;
  return {
    northSouthM: Math.abs(north - south) * METERS_PER_DEGREE,
    eastWestM: Math.abs(east - west) * METERS_PER_DEGREE * Math.cos(midLatRad),
  };
}

/**
 * Metres per CSS pixel for a still/sample image painted across `bounds` at HiveMap zoom `z`.
 * Matches HiveMap: world units are Web Mercator on a 256-unit zoom-0 square, screen scale 2^z.
 *
 * @param {[[number, number], [number, number]]} bounds
 * @param {number} z
 */
export function metersPerPixelForBounds(bounds, z) {
  const TILE = 256;
  const [[south, west], [north, east]] = bounds;
  const projectX = (lng) => TILE * (lng + 180) / 360;
  const screenW = Math.max((projectX(east) - projectX(west)) * 2 ** z, 1e-9);
  return groundSpanMeters(bounds).eastWestM / screenW;
}
