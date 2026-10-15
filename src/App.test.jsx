import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App, { probeTile } from "./App.jsx";

const PROBE_URL = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/18/149041/96857.jpg";
const STATUS_IMAGE = "Satélite ao vivo indisponível. Mostrando a imagem salva da propriedade.";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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
  it("shows the saved-image line after the startup tile errors and does not probe again", () => {
    const { FakeImage, images } = fakeImageClass();
    const realImage = globalThis.Image;
    globalThis.Image = FakeImage;
    try {
      render(<App />);
      expect(images.map((img) => img.src)).toEqual([PROBE_URL]);
      expect(screen.getByRole("status").textContent).toBe("");

      act(() => {
        images[0].onerror();
      });

      expect(screen.getByRole("status").textContent).toBe(STATUS_IMAGE);
      expect(images.map((img) => img.src)).toEqual([PROBE_URL]);
    } finally {
      globalThis.Image = realImage;
    }
  });
});
