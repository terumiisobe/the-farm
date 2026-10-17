import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App, { probeTile } from "./App.jsx";

const PROBE_URL = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/16/37624/23813.jpg";
const STATUS_IMAGE = "Satélite ao vivo indisponível. Mostrando a imagem salva da propriedade.";
const STATUS_SOFT = "Não foi possível confirmar o satélite. Mantendo o mapa ao vivo.";
const STATUS_LIMITED_TILES = "Sem imagem da propriedade. Mostrando satélite com detalhe limitado.";
const WHATSAPP_NAME = "WhatsApp (abre o WhatsApp em uma nova aba)";
const API = {
  kind: "api",
  url: "https://api.test/v1/meliponarios/10",
  userId: "1",
};
const STILL_BOUNDS = [
  [-25.762684, -49.189889],
  [-25.761622, -49.188210],
];
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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  HTMLElement.prototype.getBoundingClientRect = realRect;
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

function withFakeImage(run) {
  const { FakeImage, images } = fakeImageClass();
  const realImage = globalThis.Image;
  globalThis.Image = FakeImage;
  return Promise.resolve()
    .then(() => run(images))
    .finally(() => {
      globalThis.Image = realImage;
    });
}

function snapshotResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
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

function apiFarm(name, hives = [{
  code: "12",
  lat: -25.762152999999998,
  lng: -49.189049499999996,
  status: "stable",
}]) {
  return {
    farmName: name,
    address: "",
    updatedAt: null,
    hives,
  };
}

async function renderApiFarm(name, images) {
  vi.stubGlobal("fetch", async () => snapshotResponse(apiFarm(name)));
  const view = render(<App source={API} />);
  await screen.findByRole("heading", { level: 1, name });
  return view;
}

async function forceEox(images) {
  const still = images.find((img) => img.src === "/assets/farm-basemap.png");
  expect(still).toBeTruthy();
  const fail = still.onerror;
  expect(typeof fail).toBe("function");
  act(() => {
    fail();
  });
  act(() => {
    fail();
  });
}

describe("App", () => {
  it("fails closed without API env instead of shipping a mock farm", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchImpl);
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Bombus");
    expect(screen.getByRole("alert").textContent).toBe("Não foi possível carregar as colmeias agora.");
    expect(fetchImpl.mock.calls).toEqual([]);
  });

  it("paints the operator still for an API farm that omits basemap", async () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    return withFakeImage(async (images) => {
      const { container } = await renderApiFarm("Sítio Sem Still", images);
      expect(container.querySelector(".bb-map__image").getAttribute("src")).toBe("/assets/farm-basemap.png");
      expect(container.querySelector(".bb-map__tile")).toBeNull();
      expect(screen.getByRole("status").textContent).toBe("");
      expect(images.map((img) => img.src)).toContain("/assets/farm-basemap.png");
    });
  });

  it("falls back to EOX once when the still fails before it decodes", async () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    return withFakeImage(async (images) => {
      const { container } = await renderApiFarm("Sítio Still Fail", images);
      expect(container.querySelector(".bb-map__image").getAttribute("src")).toBe("/assets/farm-basemap.png");

      await forceEox(images);

      expect(container.querySelector(".bb-map__image")).toBeNull();
      expect(container.querySelector(".bb-map__tile").src).toContain("tiles.maps.eox.at");
      expect(screen.getByRole("status").textContent).toBe(STATUS_LIMITED_TILES);
    });
  });

  it("stays on the still after it has decoded", async () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    return withFakeImage(async (images) => {
      const { container } = await renderApiFarm("Sítio Still Ok", images);
      const still = images.find((img) => img.src === "/assets/farm-basemap.png");
      const fail = still.onerror;

      act(() => {
        still.naturalWidth = 800;
        still.onload();
      });
      act(() => {
        fail();
      });

      expect(container.querySelector(".bb-map__image").getAttribute("src")).toBe("/assets/farm-basemap.png");
      expect(container.querySelector(".bb-map__tile")).toBeNull();
      expect(screen.getByRole("status").textContent).toBe("");
    });
  });

  it("paints the API still when basemap.image and bounds are present", async () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    return withFakeImage(async (images) => {
      vi.stubGlobal("fetch", async () => snapshotResponse({
        ...apiFarm("Sítio Still"),
        basemap: {
          image: "/assets/farm-basemap.png",
          bounds: STILL_BOUNDS,
          attribution: "Imagem da propriedade",
        },
      }));
      const { container } = render(<App source={API} />);

      expect(await screen.findByRole("heading", { level: 1, name: "Sítio Still" })).toBeTruthy();
      expect(container.querySelector(".bb-map__image").getAttribute("src")).toBe("/assets/farm-basemap.png");
      expect(container.querySelector(".bb-map__tile")).toBeNull();
      expect(screen.getByRole("status").textContent).toBe("");
      expect(images.map((img) => img.src)).toContain("/assets/farm-basemap.png");
    });
  });

  it("keeps live tiles and shows the soft-fail line when the zoom-16 probe errors", async () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    return withFakeImage(async (images) => {
      const { container } = await renderApiFarm("Sítio EOX", images);
      await forceEox(images);

      expect(images.some((img) => img.src === PROBE_URL)).toBe(true);
      expect(screen.getByRole("status").textContent).toBe(STATUS_LIMITED_TILES);

      const probe = images.find((img) => img.src === PROBE_URL);
      act(() => {
        probe.onerror();
      });

      expect(screen.getByRole("status").textContent).toBe(STATUS_SOFT);
      expect(container.querySelector(".bb-map__image")).toBeNull();
      expect(container.querySelector(".bb-map__tile").src).toContain("tiles.maps.eox.at");
    });
  });

  it("keeps painted tiles up when the probe fails", async () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    return withFakeImage(async (images) => {
      const { container } = await renderApiFarm("Sítio EOX", images);
      await forceEox(images);
      const tile = container.querySelector(".bb-map__tile");
      Object.defineProperty(tile, "complete", { value: true });
      Object.defineProperty(tile, "naturalWidth", { value: 256 });

      const probe = images.find((img) => img.src === PROBE_URL);
      act(() => {
        probe.onerror();
      });

      expect(screen.getByRole("status").textContent).toBe(STATUS_SOFT);
      expect(container.querySelector(".bb-map__image")).toBeNull();
      expect(container.querySelector(".bb-map__tile").src).toContain("tiles.maps.eox.at");
    });
  });

  it("shows the saved farm image when every tile has already failed", async () => {
    HTMLElement.prototype.getBoundingClientRect = sizedRect;
    return withFakeImage(async (images) => {
      const { container } = await renderApiFarm("Sítio EOX", images);
      await forceEox(images);
      for (const tile of container.querySelectorAll(".bb-map__tile")) {
        Object.defineProperty(tile, "complete", { value: true });
        Object.defineProperty(tile, "naturalWidth", { value: 0 });
      }

      const probe = images.find((img) => img.src === PROBE_URL);
      act(() => {
        probe.onerror();
      });

      expect(screen.getByRole("status").textContent).toBe(STATUS_IMAGE);
      expect(container.querySelector(".bb-map__image").getAttribute("src")).toBe("/assets/farm-basemap.png");
      expect(container.querySelector(".bb-map__tile")).toBeNull();
    });
  });

  it("shows a loading notice and keeps WhatsApp in the header while the request is pending", () => {
    vi.stubGlobal("fetch", () => new Promise(() => {}));
    render(<App source={API} />);
    const header = screen.getByRole("banner");
    const status = screen.getByRole("status");
    const link = screen.getByRole("link", { name: WHATSAPP_NAME });

    expect(status.textContent).toBe("Carregando colmeias…");
    expect(header.contains(status)).toBe(false);
    expect(header.contains(link)).toBe(true);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Bombus");
    expect(link.getAttribute("href")).toBe("https://wa.me/");
  });

  it("keeps WhatsApp reachable when the farm is missing and does not offer a retry", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));
    render(<App source={API} />);

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Não encontramos este meliponário ou você não tem acesso a ele.",
    );
    expect(screen.getByRole("link", { name: WHATSAPP_NAME }).getAttribute("href")).toBe("https://wa.me/");
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Bombus");
  });

  it("keeps WhatsApp reachable when the caller is not authorized", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 401 }));
    render(<App source={API} />);

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Não foi possível confirmar seu acesso a este meliponário.",
    );
    expect(screen.getByRole("link", { name: WHATSAPP_NAME }).getAttribute("href")).toBe("https://wa.me/");
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).toBeNull();
  });

  it("offers a retry when the farm cannot be loaded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let calls = 0;
    vi.stubGlobal("fetch", async () => {
      calls += 1;
      throw new TypeError("offline");
    });
    render(<App source={API} />);

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Não foi possível carregar as colmeias agora.",
    );
    expect(screen.getByRole("link", { name: WHATSAPP_NAME }).getAttribute("href")).toBe("https://wa.me/");
    expect(calls).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Não foi possível carregar as colmeias agora.",
    );
    expect(calls).toBe(2);
  });

  it("shows the farm name from a 200 snapshot", () => {
    return withFakeImage(async () => {
      let seen;
      vi.stubGlobal("fetch", async (url, init) => {
        seen = { url, headers: init.headers };
        return snapshotResponse({
          farmName: "Sítio Norte",
          address: "",
          updatedAt: null,
          hives: [{
            code: "12",
            lat: -25.761895097774243,
            lng: -49.189356741758246,
            status: "stable",
          }],
        });
      });
      render(<App source={API} />);

      expect((await screen.findByRole("heading", { level: 1, name: "Sítio Norte" })).textContent).toBe("Sítio Norte");
      expect(screen.getByText("1 colmeia").textContent).toBe("1 colmeia");
      expect(screen.getByRole("link", { name: WHATSAPP_NAME }).getAttribute("href")).toBe("https://wa.me/");
      expect(screen.queryByRole("alert")).toBeNull();
      expect(seen).toEqual({
        url: "https://api.test/v1/meliponarios/10",
        headers: { "X-User-Id": "1", Accept: "application/json" },
      });
    });
  });

  it("shows an empty yard as a map", () => {
    return withFakeImage(async () => {
      vi.stubGlobal("fetch", async () => snapshotResponse({
        farmName: "Sítio Vazio",
        address: "",
        updatedAt: null,
        hives: [],
      }));
      render(<App source={API} />);

      expect((await screen.findByRole("heading", { level: 1, name: "Sítio Vazio" })).textContent).toBe("Sítio Vazio");
      expect(screen.getByText("0 colmeias").textContent).toBe("0 colmeias");
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.queryByText("Carregando colmeias…")).toBeNull();
    });
  });
});
