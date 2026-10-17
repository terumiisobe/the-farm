import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Dashboard, { STILL_BUILD } from "./Dashboard.jsx";
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

    const links = container.querySelectorAll("a.wa-header");
    expect(Array.from(links).map((link) => link.getAttribute("href"))).toEqual([WHATSAPP_URL]);
    expect(header.contains(links[0])).toBe(true);

    const map = container.querySelector(".bb-map");
    expect(map.style.height).toBe("100%");
    expect(map.parentElement.contains(links[0])).toBe(false);
    expect(container.querySelector(".map-build").textContent).toBe(STILL_BUILD);
    expect(STILL_BUILD).toBe("still-v4");
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

  it("keeps an empty basemap status before the map until a failure line is set", () => {
    const { rerender, container } = render(<Dashboard {...farm} />);
    const status = screen.getByRole("status");
    const map = container.querySelector(".bb-map");
    const failure = "Satélite ao vivo indisponível. Mostrando a imagem salva da propriedade.";

    expect(status.textContent).toBe("");
    expect(map.previousElementSibling).toBe(status);
    expect(map.nextElementSibling.className).toBe("map-build");
    expect(map.nextElementSibling.textContent).toBe(STILL_BUILD);

    rerender(<Dashboard {...farm} basemapStatus={failure} />);

    expect(screen.getByRole("status")).toBe(status);
    expect(status.textContent).toBe(failure);
    expect(container.querySelector(".bb-map").nextElementSibling.textContent).toBe(STILL_BUILD);
  });

  it("hides page scroll on the dashboard shell", () => {
    const { container } = render(<Dashboard {...farm} />);
    const page = container.querySelector(".page");

    expect(getComputedStyle(page).overflow).toBe("hidden");
    expect(getComputedStyle(document.documentElement).overflow).toBe("hidden");
    expect(getComputedStyle(document.body).overflow).toBe("hidden");
  });
});
