import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App, { probeTile } from "./App.jsx";

const PROBE_URL = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/16/37260/24214.jpg";
const STATUS_IMAGE = "Satélite ao vivo indisponível. Mostrando a imagem salva da propriedade.";
const STATUS_SOFT = "Não foi possível confirmar o satélite. Mantendo o mapa ao vivo.";
const STATUS_LIMITED_TILES = "Sem imagem da propriedade. Mostrando satélite com detalhe limitado.";
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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  HTMLElement.prototype.getBoundingClientRect = realRect;
  window.history.replaceState({}, "", "/");
});

function fakeImageClass() {
  const images = [];
  class FakeImage {
    constructor() {
      this.naturalWidth = 0;
      this.onload = null;
      this.onerror = null;
      this.src = "";
      images.push(this);
    }
  }
  return { FakeImage, images };
}

describe("probeTile", () => {
  it("fails when the tile image errors", () => {
    const { FakeImage, images } = fakeImageClass();
    let fails = 0;
    probeTile("https://tiles.example/missing.jpg", () => { fails += 1; }, FakeImage);
    const onerror = images[0].onerror;
    onerror();
    onerror();
    expect(fails).toBe(1);
    expect(images[0].src).toBe("https://tiles.example/missing.jpg");
  });

  it("fails when the loaded tile has zero width", () => {
    const { FakeImage, images } = fakeImageClass();
    let fails = 0;
    probeTile("https://tiles.example/empty.jpg", () => { fails += 1; }, FakeImage);
    images[0].naturalWidth = 0;
    images[0].onload();
    expect(fails).toBe(1);
  });

  it("keeps tiles when the probe image has a real width", () => {
    vi.useFakeTimers();
    const { FakeImage, images } = fakeImageClass();
    let fails = 0;
    probeTile("https://tiles.example/ok.jpg", () => { fails += 1; }, FakeImage);
    images[0].naturalWidth = 256;
    images[0].onload();
    vi.advanceTimersByTime(8000);
    expect(fails).toBe(0);
    expect(images[0].src).toBe("https://tiles.example/ok.jpg");
  });

  it("ignores a load that arrives after cancel or after the timeout", () => {
    const { FakeImage, images } = fakeImageClass();
    let fails = 0;
    const cancel = probeTile("https://tiles.example/late.jpg", () => { fails += 1; }, FakeImage);
    const onload = images[0].onload;
    const onerror = images[0].onerror;
    cancel();
    images[0].naturalWidth = 256;
    onload();
    onerror();
    expect(fails).toBe(0);

    vi.useFakeTimers();
    const late = fakeImageClass();
    let timed = 0;
    probeTile("https://tiles.example/slow.jpg", () => { timed += 1; }, late.FakeImage);
    const lateLoad = late.images[0].onload;
    vi.advanceTimersByTime(7999);
    expect(timed).toBe(0);
    vi.advanceTimersByTime(1);
    expect(timed).toBe(1);
    late.images[0].naturalWidth = 256;
    lateLoad();
    expect(timed).toBe(1);
  });
});

describe("App", () => {
  it("paints the farm still and does not request EOX tiles", () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    window.history.replaceState({}, "", "/?farm=still");
    const { FakeImage, images } = fakeImageClass();
    const realImage = globalThis.Image;
    globalThis.Image = FakeImage;
    try {
      const { container } = render(<App />);
      const still = container.querySelector(".bb-map__image");

      expect(still.getAttribute("src")).toBe("/assets/farm-basemap.jpg");
      expect(container.querySelector(".bb-map__tile")).toBeNull();
      expect(screen.getByRole("status").textContent).toBe("");
      expect(images.map((img) => img.src)).toEqual(["/assets/farm-basemap.jpg"]);
    } finally {
      globalThis.Image = realImage;
    }
  });

  it("falls back to EOX once when the still fails before it decodes", () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    window.history.replaceState({}, "", "/?farm=still");
    const { FakeImage, images } = fakeImageClass();
    const realImage = globalThis.Image;
    globalThis.Image = FakeImage;
    try {
      const { container } = render(<App />);
      const fail = images[0].onerror;
      expect(container.querySelector(".bb-map__image").getAttribute("src")).toBe("/assets/farm-basemap.jpg");

      act(() => {
        fail();
      });
      act(() => {
        fail();
      });

      expect(container.querySelector(".bb-map__image")).toBeNull();
      expect(container.querySelector(".bb-map__tile").src).toContain("tiles.maps.eox.at");
      expect(screen.getByRole("status").textContent).toBe(STATUS_LIMITED_TILES);
    } finally {
      globalThis.Image = realImage;
    }
  });

  it("falls back to EOX when the still decodes with no pixels", () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    window.history.replaceState({}, "", "/?farm=still");
    const { FakeImage, images } = fakeImageClass();
    const realImage = globalThis.Image;
    globalThis.Image = FakeImage;
    try {
      const { container } = render(<App />);

      act(() => {
        images[0].naturalWidth = 0;
        images[0].onload();
      });

      expect(container.querySelector(".bb-map__image")).toBeNull();
      expect(container.querySelector(".bb-map__tile").src).toContain("tiles.maps.eox.at");
      expect(screen.getByRole("status").textContent).toBe(STATUS_LIMITED_TILES);
    } finally {
      globalThis.Image = realImage;
    }
  });

  it("stays on the still after it has decoded", () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    window.history.replaceState({}, "", "/?farm=still");
    const { FakeImage, images } = fakeImageClass();
    const realImage = globalThis.Image;
    globalThis.Image = FakeImage;
    try {
      const { container } = render(<App />);
      const fail = images[0].onerror;

      act(() => {
        images[0].naturalWidth = 800;
        images[0].onload();
      });
      act(() => {
        fail();
      });

      expect(container.querySelector(".bb-map__image").getAttribute("src")).toBe("/assets/farm-basemap.jpg");
      expect(container.querySelector(".bb-map__tile")).toBeNull();
      expect(screen.getByRole("status").textContent).toBe("");
    } finally {
      globalThis.Image = realImage;
    }
  });

  it("paints EOX tiles when the farm omits a still", () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    const { FakeImage, images } = fakeImageClass();
    const realImage = globalThis.Image;
    globalThis.Image = FakeImage;
    try {
      const { container } = render(<App />);

      expect(container.querySelector(".bb-map__tile").src).toContain("tiles.maps.eox.at");
      expect(container.querySelector(".bb-map__image")).toBeNull();
      expect(screen.getByRole("status").textContent).toBe(STATUS_LIMITED_TILES);
      expect(images.some((img) => img.src.includes("tiles.maps.eox.at"))).toBe(true);
      expect(images.some((img) => img.src === "/assets/farm-basemap.jpg")).toBe(false);
    } finally {
      globalThis.Image = realImage;
    }
  });

  it("keeps live tiles and shows the soft-fail line when the zoom-16 probe errors", () => {
    const { FakeImage, images } = fakeImageClass();
    const realImage = globalThis.Image;
    globalThis.Image = FakeImage;
    try {
      const { container } = render(<App />);
      expect(images.map((img) => img.src)).toEqual([PROBE_URL]);
      expect(screen.getByRole("status").textContent).toBe(STATUS_LIMITED_TILES);

      act(() => {
        images[0].onerror();
      });

      expect(screen.getByRole("status").textContent).toBe(STATUS_SOFT);
      expect(container.querySelector(".bb-map__image")).toBeNull();
      expect(images.map((img) => img.src)).toEqual([PROBE_URL]);
    } finally {
      globalThis.Image = realImage;
    }
  });

  it("keeps painted tiles up when the probe fails", () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    const { FakeImage, images } = fakeImageClass();
    const realImage = globalThis.Image;
    globalThis.Image = FakeImage;
    try {
      const { container } = render(<App />);
      const tile = container.querySelector(".bb-map__tile");
      Object.defineProperty(tile, "complete", { value: true });
      Object.defineProperty(tile, "naturalWidth", { value: 256 });

      act(() => {
        images[0].onerror();
      });

      expect(screen.getByRole("status").textContent).toBe(STATUS_SOFT);
      expect(container.querySelector(".bb-map__image")).toBeNull();
      expect(container.querySelector(".bb-map__tile").src).toContain("tiles.maps.eox.at");
    } finally {
      globalThis.Image = realImage;
    }
  });

  it("shows the saved farm image when every tile has already failed", () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    const { FakeImage, images } = fakeImageClass();
    const realImage = globalThis.Image;
    globalThis.Image = FakeImage;
    try {
      const { container } = render(<App />);
      for (const tile of container.querySelectorAll(".bb-map__tile")) {
        Object.defineProperty(tile, "complete", { value: true });
        Object.defineProperty(tile, "naturalWidth", { value: 0 });
      }

      act(() => {
        images[0].onerror();
      });

      expect(screen.getByRole("status").textContent).toBe(STATUS_IMAGE);
      expect(container.querySelector(".bb-map__image").getAttribute("src")).toBe("/assets/farm-basemap.jpg");
      expect(container.querySelector(".bb-map__tile")).toBeNull();
    } finally {
      globalThis.Image = realImage;
    }
  });
});
