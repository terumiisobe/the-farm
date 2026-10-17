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

  it("keeps the sharp still inside its own box and leaves the example farm on EOX", () => {
    expect(example.basemap.image).toBeUndefined();
    expect(example.address).toBe("");
    expect(stillFarm.address).toBe("");
    expect(stillFarm.basemap.image).toBe("/assets/farm-basemap.jpg");
    expect(stillFarm.basemap.satellite.tiles).toContain("tiles.maps.eox.at");
    expect(stillFarm.basemap.fallback.image).toBe("/assets/farm-basemap.jpg");

    const [[south, west], [north, east]] = stillFarm.basemap.bounds;
    expect(south).toBeLessThan(north);
    expect(west).toBeLessThan(east);
    expect(stillFarm.hives.length).toBeGreaterThan(0);
    for (const hive of stillFarm.hives) {
      expect(hive.lat).toBeGreaterThanOrEqual(south);
      expect(hive.lat).toBeLessThanOrEqual(north);
      expect(hive.lng).toBeGreaterThanOrEqual(west);
      expect(hive.lng).toBeLessThanOrEqual(east);
    }
  });
});
