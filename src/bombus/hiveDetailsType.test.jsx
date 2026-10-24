import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BotLink, HiveDetails, HiveMap } from "./index.js";

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
  vi.restoreAllMocks();
});

function px(value) {
  return Number.parseFloat(value);
}

function contentLeft(el) {
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return rect.left + (Number.parseFloat(style.paddingLeft) || 0);
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

describe("HiveDetails type scale and status layout", () => {
  it("places Block B under Block A, not inside the title/code column", () => {
    const { container } = render(<HiveDetails hive={hive} today="2024-09-10" onClose={() => {}} />);
    const title = container.querySelector(".bb-details__title");
    const statusRow = container.querySelector(".bb-details__status");
    const list = container.querySelector(".bb-details__list");
    const badge = container.querySelector(".bb-details__status .bb-badge");

    expect(title).toBeTruthy();
    expect(statusRow).toBeTruthy();
    expect(list).toBeTruthy();
    expect(badge).toBeTruthy();
    expect(title.contains(badge)).toBe(false);
    expect(statusRow.contains(badge)).toBe(true);
    expect(statusRow.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(badge.textContent).toContain("Estável");
  });

  it("does not put the badge beside the code in the title stack", () => {
    const { container } = render(<HiveDetails hive={hive} today="2024-09-10" />);
    const title = container.querySelector(".bb-details__title");
    const code = container.querySelector(".bb-details__code");
    const badge = container.querySelector(".bb-badge");

    expect(badge).toBeTruthy();
    expect(title.contains(badge)).toBe(false);
    expect(code.parentElement.contains(badge)).toBe(false);
    expect(getComputedStyle(title).display).toBe("flex");
    expect(badge.parentElement.classList.contains("bb-details__status")).toBe(true);
  });

  it("left-aligns the status chip with body labels", () => {
    const { container } = render(<HiveDetails hive={hive} today="2024-09-10" />);
    const panel = container.querySelector(".bb-details");
    const statusRow = container.querySelector(".bb-details__status");
    const list = container.querySelector(".bb-details__list");
    const dt = container.querySelector(".bb-details__row dt");
    const title = container.querySelector(".bb-details__title");

    // Same panel inset: Block B is a sibling of the list under .bb-details, not under the icon+code column.
    expect(statusRow.parentElement).toBe(panel);
    expect(list.parentElement).toBe(panel);
    expect(title.contains(statusRow)).toBe(false);
    expect(px(getComputedStyle(statusRow).marginLeft) || 0).toBe(0);
    expect(px(getComputedStyle(statusRow).paddingLeft) || 0).toBe(0);
    expect(px(getComputedStyle(list).paddingLeft) || 0).toBe(0);
    expect(px(getComputedStyle(dt).marginLeft) || 0).toBe(0);
    expect(px(getComputedStyle(dt).paddingLeft) || 0).toBe(0);

    // jsdom has no layout engine; model shared inset + assert content-box left matches within 1px.
    const inset = 24;
    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this === panel) {
        return { width: 320, height: 400, top: 0, left: 0, right: 320, bottom: 400, x: 0, y: 0, toJSON() { return {}; } };
      }
      if (this === statusRow || this === dt) {
        return {
          width: 200,
          height: 20,
          top: this === statusRow ? 48 : 96,
          left: inset,
          right: inset + 200,
          bottom: this === statusRow ? 68 : 116,
          x: inset,
          y: this === statusRow ? 48 : 96,
          toJSON() { return {}; },
        };
      }
      return { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() { return {}; } };
    };

    expect(Math.abs(contentLeft(statusRow) - contentLeft(dt))).toBeLessThanOrEqual(1);
  });

  it("meets details type minima and never uses bb-badge--sm", () => {
    const { container } = render(<HiveDetails hive={hive} today="2024-09-10" />);
    const eyebrow = container.querySelector(".bb-details__eyebrow");
    const code = container.querySelector(".bb-details__code");
    const badge = container.querySelector(".bb-details__status .bb-badge");
    const dt = container.querySelector(".bb-details__row dt");
    const dd = container.querySelector(".bb-details__row dd");
    const notesLabel = container.querySelector(".bb-details__notes-label");
    const notes = container.querySelector(".bb-details__notes");

    expect(px(getComputedStyle(eyebrow).fontSize)).toBeGreaterThanOrEqual(16);
    expect(px(getComputedStyle(eyebrow).lineHeight)).toBeGreaterThanOrEqual(20);
    expect(px(getComputedStyle(code).fontSize)).toBeGreaterThanOrEqual(28);
    expect(px(getComputedStyle(code).lineHeight)).toBeGreaterThanOrEqual(32);
    expect(px(getComputedStyle(badge).fontSize)).toBeGreaterThanOrEqual(16);
    expect(px(getComputedStyle(badge).lineHeight)).toBeGreaterThanOrEqual(20);
    expect(px(getComputedStyle(dt).fontSize)).toBeGreaterThanOrEqual(16);
    expect(px(getComputedStyle(dd).fontSize)).toBeGreaterThanOrEqual(18);
    expect(px(getComputedStyle(notesLabel).fontSize)).toBeGreaterThanOrEqual(16);
    expect(px(getComputedStyle(notes).fontSize)).toBeGreaterThanOrEqual(18);
    expect(px(getComputedStyle(notes).lineHeight)).toBeGreaterThanOrEqual(26);

    expect(badge.classList.contains("bb-badge--sm")).toBe(false);
    expect(badge.className).toMatch(/bb-status--stable/);
    expect(badge.textContent).toContain("Estável");
  });

  it("keeps out-of-scope map chrome sizes unchanged", () => {
    HTMLElement.prototype.getBoundingClientRect = sizedMapRect;
    const { container } = render(
      <HiveMap
        hives={[hive]}
        basemap={basemap}
        maxZoom={18}
        height={600}
        initialSelected="1"
        title="Fazenda"
      />,
    );

    const markerCode = container.querySelector(".bb-marker__code");
    const legendChip = container.querySelector(".bb-legend-chip");
    const scale = container.querySelector(".bb-map__scale");
    const ctl = container.querySelector(".bb-map__ctl");

    expect(markerCode).toBeTruthy();
    expect(legendChip).toBeTruthy();
    expect(scale).toBeTruthy();
    expect(ctl).toBeTruthy();

    expect(px(getComputedStyle(markerCode).fontSize)).toBe(12);
    expect(px(getComputedStyle(legendChip).fontSize)).toBe(17);
    expect(px(getComputedStyle(scale).fontSize)).toBe(12);
    expect(getComputedStyle(ctl).width).toBe("40px");
    expect(getComputedStyle(ctl).height).toBe("40px");
  });

  // Pre-a11y BotLink baseline (main): title 17/22 — details CSS must not enlarge WhatsApp.
  it("keeps BotLink WhatsApp title at previous size", () => {
    const { container } = render(<BotLink href="https://wa.me/1" title="WhatsApp" />);
    const title = container.querySelector(".bb-botlink__title");
    expect(title).toBeTruthy();
    expect(px(getComputedStyle(title).fontSize)).toBe(17);
    expect(px(getComputedStyle(title).lineHeight)).toBe(22);
    expect(getComputedStyle(container.querySelector(".bb-botlink")).minHeight).toBe("44px");
  });

  it("keeps Fechar callable when onClose is passed", () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(
      <HiveDetails hive={hive} today="2024-09-10" onClose={onClose} />,
    );
    fireEvent.click(getByLabelText("Fechar detalhes"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
