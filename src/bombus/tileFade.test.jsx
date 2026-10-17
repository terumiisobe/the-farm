import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HiveMap } from "./index.js";

const hive = { code: "1", lat: -23.9474, lng: -46.9868, status: "stable" };
const basemap = {
  tiles: "https://tiles.example/{z}/{y}/{x}.jpg",
  minZoom: 0,
  maxZoom: 18,
  attribution: "Example attribution",
};

afterEach(() => {
  cleanup();
  HTMLElement.prototype.getBoundingClientRect = realRect;
});

const realRect = HTMLElement.prototype.getBoundingClientRect;

function sizedRect() {
  return {
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON() { return {}; },
  };
}

describe("satellite tile fade", () => {
  it("keeps a tile hidden until it loads, then shows it", () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    const { container } = render(
      <HiveMap hives={[hive]} basemap={basemap} maxZoom={18} height={600} />,
    );
    const tile = container.querySelector(".bb-map__tile");
    expect(tile.className).toBe("bb-map__tile");
    expect(getComputedStyle(tile).opacity).toBe("0");

    act(() => {
      tile.dispatchEvent(new Event("load"));
    });

    expect(tile.classList.contains("is-loaded")).toBe(true);
    expect(getComputedStyle(tile).opacity).toBe("1");
  });

  it("shows tiles at full opacity with no fade when motion is reduced", () => {
    const joined = [...document.querySelectorAll("style")].map((node) => node.textContent).join("\n");
    expect(joined).toContain(
      "@media (prefers-reduced-motion: reduce) {\n  .bb-btn, .bb-marker__icon, .bb-botlink { transition: none; }\n  .bb-map__tile, .bb-map__tile.is-loaded { opacity: 1; transition: none; }\n}",
    );
  });
});
