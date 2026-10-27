import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OPERATOR_STILL, OPERATOR_STILL_BOUNDS } from "../data/farmSnapshot.js";
import { HiveMap } from "./index.js";

const TILE = 256;
const MAP_W = 900;
const MAP_H = 520;

const realRect = HTMLElement.prototype.getBoundingClientRect;

function sizedRect() {
  return {
    width: MAP_W,
    height: MAP_H,
    top: 0,
    left: 0,
    right: MAP_W,
    bottom: MAP_H,
    x: 0,
    y: 0,
    toJSON() { return {}; },
  };
}

/** Web Mercator project matching HiveMap (zoom-0 256 square). */
function project(lat, lng) {
  const s = Math.sin((lat * Math.PI) / 180);
  return {
    x: (TILE * (lng + 180)) / 360,
    y: TILE * (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)),
  };
}

/** Exact still fit zoom: pad 0, no −0.5 slack (operator zoom-out floor). */
function fitStillZoom(bounds, w, h) {
  const [[south, west], [north, east]] = bounds;
  const nw = project(north, west);
  const se = project(south, east);
  const bw = Math.max(se.x - nw.x, 1e-9);
  const bh = Math.max(se.y - nw.y, 1e-9);
  return Math.log2(Math.min(w / bw, h / bh));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  HTMLElement.prototype.getBoundingClientRect = realRect;
});

describe("still minZoom floor", () => {
  it("locks Afastar at fitView(still bounds, map size) with no −0.5 slack", () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: String(query).includes("prefers-reduced-motion"),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() { return false; },
    }));

    const hive = {
      code: "12",
      lat: -25.76215,
      lng: -49.18905,
      status: "stable",
    };
    const { container } = render(
      <HiveMap
        hives={[hive]}
        basemap={{
          image: OPERATOR_STILL.image,
          bounds: OPERATOR_STILL.bounds,
          attribution: OPERATOR_STILL.attribution,
        }}
        height={MAP_H}
      />,
    );

    const out = screen.getByRole("button", { name: "Afastar" });
    const into = screen.getByRole("button", { name: "Aproximar" });
    expect(into.disabled).toBe(false);

    for (let i = 0; i < 12; i++) {
      if (out.disabled) break;
      act(() => {
        fireEvent.click(out);
      });
    }

    expect(out.disabled).toBe(true);
    expect(into.disabled).toBe(false);

    const img = container.querySelector(".bb-map__image");
    expect(img).toBeTruthy();
    const imgW = parseFloat(img.style.width);
    const imgH = parseFloat(img.style.height);
    // Covering scale ≈ 1: limiting edge fills the map; the other may letterbox.
    const cover = Math.max(imgW / MAP_W, imgH / MAP_H);
    expect(cover).toBeGreaterThan(0.98);
    expect(cover).toBeLessThan(1.02);

    const expected = fitStillZoom(OPERATOR_STILL_BOUNDS, MAP_W, MAP_H);
    // Image screen size at z is worldSpan * 2^z; recover z from limiting dim.
    const [[south, west], [north, east]] = OPERATOR_STILL_BOUNDS;
    const nw = project(north, west);
    const se = project(south, east);
    const worldW = se.x - nw.x;
    const worldH = se.y - nw.y;
    const zFromW = Math.log2(imgW / worldW);
    const zFromH = Math.log2(imgH / worldH);
    expect(zFromW).toBeCloseTo(expected, 2);
    expect(zFromH).toBeCloseTo(expected, 2);
    // Old floor was expected − 0.5; ensure we did not stop half a level looser.
    expect(zFromW).toBeGreaterThan(expected - 0.2);
  });
});
