import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import example from "./example-farm.json";

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
});
