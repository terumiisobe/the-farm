import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import example from "./example-farm.json";
import { OPERATOR_STILL, OPERATOR_STILL_BOUNDS, readFarmSource } from "./farmSnapshot.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const STREET = /\b(Rua|Avenida|Av\.|Rodovia|Alameda|Travessa|Estrada)\b/i;

function productFiles(dir, found = []) {
  for (const name of readdirSync(dir)) {
    if (name === "bombus") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      productFiles(path, found);
      continue;
    }
    if (/\.test\.(js|jsx)$/.test(name)) continue;
    if (/\.(js|jsx|css|json|md)$/.test(name)) found.push(path);
  }
  return found;
}

describe("shipped defaults", () => {
  it("keeps the fixture address empty and out of street form", () => {
    expect(example.address).toBe("");
    expect(STREET.test("Rua Exemplo 10")).toBe(true);

    const paths = [join(root, "README.md"), ...productFiles(join(root, "src"))];
    const hits = paths.filter((path) => STREET.test(readFileSync(path, "utf8")));
    expect(hits).toEqual([]);
  });

  it("ships the operator still defaults and does not default the app to a mock farm", () => {
    expect(OPERATOR_STILL.image).toBe("/assets/farm-basemap.png");
    expect(OPERATOR_STILL.bounds).toEqual(OPERATOR_STILL_BOUNDS);
    expect(OPERATOR_STILL_BOUNDS).toEqual([
      [-25.762684, -49.189889],
      [-25.761622, -49.188210],
    ]);
    expect(example.basemap.image).toBe("/assets/farm-basemap.png");
    expect(example.basemap.bounds).toEqual([
      [-25.762684, -49.189889],
      [-25.761622, -49.188210],
    ]);
    expect(example.basemap.satellite.tiles).toContain("tiles.maps.eox.at");
    expect(readFarmSource({})).toEqual({
      kind: "misconfigured",
      problem: "VITE_API_BASE_URL is required",
    });
  });

  it("does not ship mock farm harness files or the old JPEG placeholder", () => {
    const data = readdirSync(join(root, "src/data"));
    expect(data).not.toContain("mock-still-farm.json");
    expect(data).not.toContain("mock-eox-farm.json");
    const assets = readdirSync(join(root, "public/assets"));
    expect(assets).toContain("farm-basemap.png");
    expect(assets).not.toContain("farm-basemap.jpg");
  });
});
