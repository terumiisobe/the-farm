import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HiveMap } from "./index.js";

const basemap = {
  tiles: "https://tiles.example/{z}/{y}/{x}.jpg",
  minZoom: 0,
  maxZoom: 18,
  attribution: "Example attribution",
};

const realRect = HTMLElement.prototype.getBoundingClientRect;

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

afterEach(() => {
  cleanup();
  HTMLElement.prototype.getBoundingClientRect = realRect;
});

describe("HiveMap marker code badges", () => {
  it("shows a code pill on every visible hive, even when pins are closer than the old 40px gap", () => {
    HTMLElement.prototype.getBoundingClientRect = sizedMapRect;
    // Nearly identical lat/lng → screen distance well under the former labelMinGap of 40px.
    const hives = [
      { code: "7", lat: -25.76215, lng: -49.18905, status: "stable" },
      { code: "8", lat: -25.76216, lng: -49.18906, status: "attention" },
      { code: "9", lat: -25.76217, lng: -49.18907, status: "critical" },
    ];

    const { container } = render(
      <HiveMap hives={hives} basemap={basemap} maxZoom={18} height={600} zoom={16} center={[-25.76215, -49.18905]} />,
    );

    const markers = container.querySelectorAll(".bb-marker");
    expect(markers.length).toBe(3);
    markers.forEach((marker) => {
      const code = marker.querySelector(".bb-marker__code");
      expect(code).toBeTruthy();
      expect(code.textContent).toMatch(/^[789]$/);
    });
    expect(container.querySelectorAll(".bb-marker__code")).toHaveLength(3);
  });
});
