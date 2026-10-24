import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Dashboard from "./Dashboard.jsx";
import "./app.css";

const WHATSAPP_URL = "https://wa.me/5511999999999";
const NEW_TAB_NAME = "WhatsApp (abre o WhatsApp em uma nova aba)";

const sections = [
  {
    id: "A",
    name: "Norte",
    polygon: [
      [-23.55, -46.64],
      [-23.54, -46.64],
      [-23.54, -46.62],
    ],
  },
];

function readyView(basemapStatus = null) {
  return {
    phase: "ready",
    farm: {
      name: "Meliponário Isobe",
      address: "",
      updatedAt: null,
      hives: [{ code: "12", lat: -23.55, lng: -46.63, status: "stable" }],
      offMap: [],
      sections,
    },
    basemap: { attribution: "Imagem de satélite: exemplo" },
    basemapStatus,
  };
}

function show(view = readyView()) {
  return render(<Dashboard view={view} whatsappUrl={WHATSAPP_URL} onRetry={() => {}} />);
}

afterEach(() => {
  cleanup();
});

describe("Dashboard", () => {
  it("shows the farm name and one header WhatsApp link on a fluid map", () => {
    const { container } = show();
    const header = screen.getByRole("banner");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Meliponário Isobe");
    expect(header.textContent.replace(/\s+/g, "")).toBe("MeliponárioIsobeWhatsApp");
    expect(container.querySelector('img[src="/assets/bombus-bee-transparent.png"]')).toBeNull();

    const links = container.querySelectorAll("a.wa-header");
    expect(Array.from(links).map((link) => link.getAttribute("href"))).toEqual([WHATSAPP_URL]);
    expect(header.contains(links[0])).toBe(true);

    const map = container.querySelector(".bb-map");
    expect(map.style.height).toBe("100%");
    expect(map.parentElement.contains(links[0])).toBe(false);
    expect(container.querySelector(".map-build")).toBeNull();
  });

  it("names the WhatsApp control as a new tab and keeps a 44 by 44 hit target", () => {
    show();
    const link = screen.getByRole("link", { name: NEW_TAB_NAME });

    expect(link.getAttribute("href")).toBe(WHATSAPP_URL);
    expect(link.getAttribute("target")).toBe("_blank");

    const style = getComputedStyle(link);
    expect(style.minWidth).toBe("44px");
    expect(style.minHeight).toBe("44px");
  });

  // Farm name: 20/24 under .top; band stays 68px. WhatsApp stays 17/22.
  it("keeps a readable farm name in the 68px header and WhatsApp at previous title size", () => {
    const { container } = show();
    const top = container.querySelector("header.top");
    const farmName = container.querySelector(".top h1");
    const wa = container.querySelector("a.wa-header");
    const waTitle = container.querySelector(".wa-header .bb-botlink__title");

    expect(top).toBeTruthy();
    expect(farmName).toBeTruthy();
    expect(wa).toBeTruthy();
    expect(waTitle).toBeTruthy();

    expect(getComputedStyle(top).minHeight).toBe("68px");

    const farmStyle = getComputedStyle(farmName);
    expect(farmStyle.fontSize).toBe("20px");
    expect(farmStyle.lineHeight).toBe("24px");

    const waTitleStyle = getComputedStyle(waTitle);
    expect(waTitleStyle.fontSize).toBe("17px");
    expect(waTitleStyle.lineHeight).toBe("22px");

    const waStyle = getComputedStyle(wa);
    expect(waStyle.minHeight).toBe("44px");
  });

  it("keeps an empty basemap status before the map until a failure line is set", () => {
    const failure = "Satélite ao vivo indisponível. Mostrando a imagem salva da propriedade.";
    const { rerender, container } = show();
    const status = screen.getByRole("status");
    const map = container.querySelector(".bb-map");

    expect(status.textContent).toBe("");
    expect(map.previousElementSibling).toBe(status);
    expect(map.nextElementSibling).toBeNull();
    expect(container.querySelector(".map-build")).toBeNull();

    rerender(<Dashboard view={readyView(failure)} whatsappUrl={WHATSAPP_URL} onRetry={() => {}} />);

    expect(screen.getByRole("status")).toBe(status);
    expect(status.textContent).toBe(failure);
    expect(container.querySelector(".map-build")).toBeNull();
  });

  it("uses a dark green letterbox behind the map surface", () => {
    const { container } = show();
    const stage = container.querySelector(".map-stage");
    const map = container.querySelector(".bb-map");

    expect(getComputedStyle(stage).backgroundColor).toBe("rgb(18, 31, 24)");
    expect(getComputedStyle(map).backgroundColor).toBe("rgb(18, 31, 24)");
  });

  it("hides page scroll on the dashboard shell", () => {
    const { container } = show();
    const page = container.querySelector(".page");

    expect(getComputedStyle(page).overflow).toBe("hidden");
    expect(getComputedStyle(document.documentElement).overflow).toBe("hidden");
    expect(getComputedStyle(document.body).overflow).toBe("hidden");
  });
});
