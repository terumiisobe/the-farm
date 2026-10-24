import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HiveDetails, HiveMap } from "./index.js";

const hive = {
  code: "1",
  lat: -23.9474,
  lng: -46.9868,
  status: "stable",
  addedAt: "2024-08-14",
  lastInspection: "2024-09-01",
  notes: "Colônia forte.",
};

const basemap = {
  tiles: "https://tiles.example/{z}/{y}/{x}.jpg",
  minZoom: 0,
  maxZoom: 18,
  attribution: "Example attribution",
};

const realRect = HTMLElement.prototype.getBoundingClientRect;

afterEach(() => {
  cleanup();
  HTMLElement.prototype.getBoundingClientRect = realRect;
});

function px(value) {
  return Number.parseFloat(value);
}

function sizedMapRect() {
  return {
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON() {
      return {};
    },
  };
}

describe("header + legend type scale", () => {
  it("sizes sole legend count as primary head when title is omitted", () => {
    HTMLElement.prototype.getBoundingClientRect = sizedMapRect;
    const { container } = render(
      <HiveMap hives={[hive]} basemap={basemap} maxZoom={18} height={600} />,
    );

    const legend = container.querySelector(".bb-map__legend");
    const title = container.querySelector(".bb-map__title");
    const count = container.querySelector(".bb-map__count");
    const chip = container.querySelector(".bb-legend-chip");
    const chipN = container.querySelector(".bb-legend-chip__n");

    expect(legend).toBeTruthy();
    expect(title).toBeNull();
    expect(count).toBeTruthy();
    expect(chip).toBeTruthy();
    expect(chipN).toBeTruthy();

    expect(getComputedStyle(legend).maxWidth).toBe("280px");

    const countStyle = getComputedStyle(count);
    expect(px(countStyle.fontSize)).toBeGreaterThanOrEqual(20);
    expect(px(countStyle.lineHeight)).toBeGreaterThanOrEqual(26);
    expect(Number.parseInt(countStyle.fontWeight, 10)).toBeGreaterThanOrEqual(600);
    expect(countStyle.color).not.toBe(getComputedStyle(chipN).color);

    expect(px(getComputedStyle(chip).fontSize)).toBeGreaterThanOrEqual(17);
    expect(px(getComputedStyle(chip).lineHeight)).toBeGreaterThanOrEqual(22);
    expect(px(getComputedStyle(chipN).fontSize)).toBeGreaterThanOrEqual(16);
    expect(px(getComputedStyle(chipN).lineHeight)).toBeGreaterThanOrEqual(20);
  });

  it("demotes count under title to secondary size", () => {
    HTMLElement.prototype.getBoundingClientRect = sizedMapRect;
    const { container } = render(
      <HiveMap
        hives={[hive]}
        basemap={basemap}
        maxZoom={18}
        height={600}
        title="Fazenda"
      />,
    );

    const title = container.querySelector(".bb-map__title");
    const count = container.querySelector(".bb-map__count");

    expect(title).toBeTruthy();
    expect(count).toBeTruthy();
    expect(title.nextElementSibling).toBe(count);

    expect(px(getComputedStyle(title).fontSize)).toBeGreaterThanOrEqual(20);
    expect(px(getComputedStyle(title).lineHeight)).toBeGreaterThanOrEqual(26);

    const countStyle = getComputedStyle(count);
    expect(px(countStyle.fontSize)).toBeGreaterThanOrEqual(16);
    expect(px(countStyle.lineHeight)).toBeGreaterThanOrEqual(20);
    expect(px(countStyle.fontSize)).toBeLessThan(20);
  });

  it("keeps details type floors and other map chrome unchanged", () => {
    HTMLElement.prototype.getBoundingClientRect = sizedMapRect;
    const { container: mapContainer } = render(
      <HiveMap
        hives={[hive]}
        basemap={basemap}
        maxZoom={18}
        height={600}
        initialSelected="1"
      />,
    );
    const markerCode = mapContainer.querySelector(".bb-marker__code");
    const scale = mapContainer.querySelector(".bb-map__scale");
    const ctl = mapContainer.querySelector(".bb-map__ctl");

    expect(px(getComputedStyle(markerCode).fontSize)).toBe(12);
    expect(px(getComputedStyle(scale).fontSize)).toBe(12);
    expect(getComputedStyle(ctl).width).toBe("40px");
    expect(getComputedStyle(ctl).height).toBe("40px");

    const { container } = render(<HiveDetails hive={hive} today="2024-09-10" onClose={() => {}} />);
    const eyebrow = container.querySelector(".bb-details__eyebrow");
    const code = container.querySelector(".bb-details__code");
    const badge = container.querySelector(".bb-details__status .bb-badge");
    const dt = container.querySelector(".bb-details__row dt");
    const dd = container.querySelector(".bb-details__row dd");
    const notesLabel = container.querySelector(".bb-details__notes-label");
    const notes = container.querySelector(".bb-details__notes");

    // Mid-band details (still above pre-#7; not tip 16/28/18).
    expect(px(getComputedStyle(eyebrow).fontSize)).toBe(14);
    expect(px(getComputedStyle(code).fontSize)).toBe(26);
    expect(px(getComputedStyle(badge).fontSize)).toBe(14);
    expect(badge.classList.contains("bb-badge--sm")).toBe(false);
    expect(px(getComputedStyle(dt).fontSize)).toBe(14);
    expect(px(getComputedStyle(dd).fontSize)).toBe(16);
    expect(px(getComputedStyle(notesLabel).fontSize)).toBe(14);
    expect(px(getComputedStyle(notes).fontSize)).toBe(16);
    expect(px(getComputedStyle(notes).lineHeight)).toBe(24);
  });
});
