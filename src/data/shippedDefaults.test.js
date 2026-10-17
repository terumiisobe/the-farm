import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import example from "./example-farm.json";
import stillFarm from "./mock-still-farm.json";

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
  it("keeps the sample address empty and out of street form", () => {
    expect(example.address).toBe("");
    expect(STREET.test("Rua Exemplo 10")).toBe(true);

    const paths = [join(root, "README.md"), ...productFiles(join(root, "src"))];
    const hits = paths.filter((path) => STREET.test(readFileSync(path, "utf8")));
    expect(hits).toEqual([]);
  });

  it("ships the default example on the operator still box with EOX as fallback", () => {
    expect(example.address).toBe("");
    expect(example.basemap.image).toBe("/assets/farm-basemap.png");
    expect(example.basemap.satellite.tiles).toContain("tiles.maps.eox.at");
    expect(example.basemap.fallback.image).toBe("/assets/farm-basemap.png");
    expect(stillFarm.address).toBe("");
    expect(stillFarm.basemap.image).toBe("/assets/farm-basemap.png");

    for (const farm of [example, stillFarm]) {
      const [[south, west], [north, east]] = farm.basemap.bounds;
      expect(south).toBeLessThan(north);
      expect(west).toBeLessThan(east);
      expect(farm.hives.length).toBeGreaterThan(0);
      for (const hive of farm.hives) {
        expect(hive.lat).toBeGreaterThanOrEqual(south);
        expect(hive.lat).toBeLessThanOrEqual(north);
        expect(hive.lng).toBeGreaterThanOrEqual(west);
        expect(hive.lng).toBeLessThanOrEqual(east);
      }
    }
  });
});
