import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Dashboard from "./Dashboard.jsx";
import "./app.css";

const WHATSAPP_URL = "https://wa.me/5511999999999";
const NEW_TAB_NAME = "WhatsApp (abre o WhatsApp em uma nova aba)";

const farm = {
  farmName: "Meliponário Isobe",
  hives: [{ code: "12", lat: -23.55, lng: -46.63, status: "stable" }],
  sections: [
    {
      id: "A",
      name: "Norte",
      polygon: [
        [-23.55, -46.64],
        [-23.54, -46.64],
        [-23.54, -46.62],
      ],
    },
  ],
  basemap: { attribution: "Imagem de satélite: exemplo" },
  whatsappUrl: WHATSAPP_URL,
};

afterEach(() => {
  cleanup();
});

describe("Dashboard", () => {
  it("shows the farm name and one header WhatsApp link on a fluid map", () => {
    const { container } = render(<Dashboard {...farm} />);
    const header = screen.getByRole("banner");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Meliponário Isobe");
    expect(header.textContent.replace(/\s+/g, "")).toBe("MeliponárioIsobeWhatsApp");
    expect(container.querySelector('img[src="/assets/bombus-bee-transparent.png"]')).toBeNull();

    const links = container.querySelectorAll("a.bb-botlink");
    expect(Array.from(links).map((link) => link.getAttribute("href"))).toEqual([WHATSAPP_URL]);
    expect(header.contains(links[0])).toBe(true);

    const map = container.querySelector(".bb-map");
    expect(map.style.height).toBe("100%");
    expect(map.nextElementSibling).toBeNull();
    expect(map.parentElement.contains(links[0])).toBe(false);
  });

  it("names the WhatsApp control as a new tab and keeps a 44 by 44 hit target", () => {
    render(<Dashboard {...farm} />);
    const link = screen.getByRole("link", { name: NEW_TAB_NAME });

    expect(link.getAttribute("href")).toBe(WHATSAPP_URL);
    expect(link.getAttribute("target")).toBe("_blank");

    const style = getComputedStyle(link);
    expect(style.minWidth).toBe("44px");
    expect(style.minHeight).toBe("44px");
  });

  it("hides page scroll on the dashboard shell", () => {
    const { container } = render(<Dashboard {...farm} />);
    const page = container.querySelector(".page");

    expect(getComputedStyle(page).overflow).toBe("hidden");
    expect(getComputedStyle(document.documentElement).overflow).toBe("hidden");
    expect(getComputedStyle(document.body).overflow).toBe("hidden");
  });
});
