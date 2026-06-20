import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  DNS,
  MAX,
  NIL,
  OID,
  URL as URL_NAMESPACE,
  X500,
  parse,
  stringify,
  v1,
  v1ToV6,
  v3,
  v4,
  v5,
  v6,
  v6ToV1,
  v7,
  validate,
  version,
} from "../dist/index.js";

describe("@ts-zero/uuid", () => {
  it("validates nil and max UUIDs", () => {
    assert.equal(validate(NIL), true);
    assert.equal(validate(MAX), true);
    assert.equal(validate(MAX.toUpperCase()), true);
    assert.equal(version(NIL), 0);
    assert.equal(version(MAX), 15);
  });

  it("rejects malformed UUID strings", () => {
    assert.equal(validate("109156be-c4fb-41ea-71b4-efe1671c5836"), false);
    assert.equal(validate("109156be-c4fb-91ea-b1b4-efe1671c5836"), false);
    assert.equal(validate("109156be-c4fb-41ea-b1b4-efe1671c583x"), false);
    assert.equal(validate("109156bec4fb41eab1b4efe1671c5836"), false);
    assert.equal(validate("000000000000000000000000000000000000"), false);
    assert.equal(validate("ffffffffffffffffffffffffffffffffffff"), false);
    assert.equal(validate("109156be-c4fb-41ea-b1b4-efe1671c5836 "), false);
  });

  it("exports RFC namespace UUID constants", () => {
    assert.equal(DNS, "6ba7b810-9dad-11d1-80b4-00c04fd430c8");
    assert.equal(URL_NAMESPACE, "6ba7b811-9dad-11d1-80b4-00c04fd430c8");
    assert.equal(OID, "6ba7b812-9dad-11d1-80b4-00c04fd430c8");
    assert.equal(X500, "6ba7b814-9dad-11d1-80b4-00c04fd430c8");
    assert.equal(v3.DNS, DNS);
    assert.equal(v5.URL, URL_NAMESPACE);
  });

  it("creates deterministic v1 UUIDs", () => {
    const id = v1({
      node: Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab),
      clockseq: 0x1234,
      msecs: new Date("2011-11-01T00:00:00.000Z").getTime(),
      nsecs: 5678,
    });

    assert.equal(id, "710b962e-041c-11e1-9234-0123456789ab");
    assert.equal(validate(id), true);
    assert.equal(version(id), 1);
  });

  it("creates deterministic namespace UUIDs", () => {
    assert.equal(v3("www.example.com", v3.DNS), "5df41881-3aed-3515-88a7-2f4a814cf09e");
    assert.equal(v5("www.example.com", v5.DNS), "2ed6657d-e927-568b-95e1-2665a8aea6a2");
    assert.equal(version(v3("www.example.com", DNS)), 3);
    assert.equal(version(v5("www.example.com", DNS)), 5);
    assert.equal(v3(Uint8Array.from([0x61, 0x62, 0x63]), parse(DNS)), v3("abc", DNS));
    assert.equal(v5(Uint8Array.from([0x61, 0x62, 0x63]), parse(URL_NAMESPACE)), v5("abc", URL_NAMESPACE));
  });

  it("creates valid v4 UUIDs", () => {
    const id = v4({
      random: [
        0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0xc1, 0xea,
        0x71, 0xb4, 0xef, 0xe1, 0x67, 0x1c, 0x58, 0x36,
      ],
    });

    assert.equal(id, "109156be-c4fb-41ea-b1b4-efe1671c5836");
    assert.equal(validate(id), true);
    assert.equal(version(id), 4);
  });

  it("creates deterministic v6 UUIDs and converts between v1 and v6", () => {
    const options = {
      node: Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab),
      clockseq: 0x1234,
      msecs: new Date("2011-11-01T00:00:00.000Z").getTime(),
      nsecs: 5678,
    };
    const v1Id = "710b962e-041c-11e1-9234-0123456789ab";
    const v6Id = "1e1041c7-10b9-662e-9234-0123456789ab";

    assert.equal(v6(options), v6Id);
    assert.equal(v1ToV6(v1Id), v6Id);
    assert.equal(v6ToV1(v6Id), v1Id);
    assert.equal(version(v6Id), 6);
  });

  it("creates valid v7 UUIDs", () => {
    const id = v7({
      msecs: 0x0190163d8694,
      seq: 0xaabbccdd,
      random: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    });

    assert.equal(id, "0190163d-8694-7aab-af33-760b0c0d0e0f");
    assert.equal(validate(id), true);
    assert.equal(version(id), 7);
  });

  it("rejects invalid timestamp and sequence options", () => {
    assert.throws(() => v1({ nsecs: 10_000 }), /10M UUIDs\/sec/);
    assert.throws(() => v1({ clockseq: 0x4000 }), /Invalid clockseq/);
    assert.throws(() => v7({ msecs: -1 }), /Invalid unix milliseconds/);
    assert.throws(() => v7({ seq: 0x1_0000_0000 }), /Invalid seq/);
  });

  it("validates v8 UUIDs without exposing a v8 generator", async () => {
    const module = await import("../dist/index.js");

    assert.equal(validate("00000000-0000-8000-8000-000000000000"), true);
    assert.equal(version("00000000-0000-8000-8000-000000000000"), 8);
    assert.equal("v8" in module, false);
  });

  it("round-trips parse and stringify", () => {
    const id = "109156be-c4fb-41ea-b1b4-efe1671c5836";

    assert.deepEqual(
      Array.from(parse(id)),
      [
        0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0x41, 0xea,
        0xb1, 0xb4, 0xef, 0xe1, 0x67, 0x1c, 0x58, 0x36,
      ],
    );
    assert.equal(stringify(parse(id)), id);
    assert.deepEqual(parse(id.toUpperCase()), parse(id));
  });

  it("exposes a generator-free format subpath for tree-shaking", async () => {
    const format = await import("../dist/format.js");
    const formatSource = readFileSync(new URL("../dist/format.js", import.meta.url), "utf8");

    assert.equal(format.validate("109156be-c4fb-41ea-b1b4-efe1671c5836"), true);
    assert.equal(format.stringify(format.parse("109156be-c4fb-41ea-b1b4-efe1671c5836")), "109156be-c4fb-41ea-b1b4-efe1671c5836");
    assert.equal("v4" in format, false);
    assert.equal("v7" in format, false);
    assert.equal(formatSource.includes("getRandomValues"), false);
    assert.equal(formatSource.includes("function md5"), false);
    assert.equal(formatSource.includes("function sha1"), false);
  });

  it("exposes version-specific subpaths for tree-shaking", async () => {
    const v4Module = await import("../dist/v4.js");
    const v7Module = await import("../dist/v7.js");
    const v4Source = readFileSync(new URL("../dist/v4.js", import.meta.url), "utf8");

    assert.equal(v4Module.v4({ random: new Uint8Array(16).fill(0xff) }), "ffffffff-ffff-4fff-bfff-ffffffffffff");
    assert.equal(version(v7Module.v7({ msecs: 0x0190163d8694, seq: 0, random: new Uint8Array(16) })), 7);
    assert.equal("v7" in v4Module, false);
    assert.equal(v4Source.includes("function md5"), false);
    assert.equal(v4Source.includes("function sha1"), false);
  });

  it("resolves public package subpaths", async () => {
    const root = await import("@ts-zero/uuid");
    const format = await import("@ts-zero/uuid/format");
    const v4Module = await import("@ts-zero/uuid/v4");
    const v7Module = await import("@ts-zero/uuid/v7");

    assert.equal(root.validate(NIL), true);
    assert.equal(format.validate(NIL), true);
    assert.equal(typeof v4Module.v4, "function");
    assert.equal(typeof v7Module.v7, "function");
  });

  it("rejects stringify bytes with invalid version or variant bits", () => {
    const invalidVersion = parse("109156be-c4fb-41ea-b1b4-efe1671c5836");
    const invalidVariant = parse("109156be-c4fb-41ea-b1b4-efe1671c5836");

    invalidVersion[6] = 0x91;
    invalidVariant[8] = 0x71;

    assert.throws(() => stringify(invalidVersion), /Stringified UUID is invalid/);
    assert.throws(() => stringify(invalidVariant), /Stringified UUID is invalid/);
  });

  it("can write generated bytes into a caller buffer", () => {
    const buffer = new Uint8Array(20);
    const result = v4({ random: new Uint8Array(16).fill(0xff) }, buffer, 2);

    assert.equal(result, buffer);
    assert.equal(stringify(buffer, 2), "ffffffff-ffff-4fff-bfff-ffffffffffff");
  });

  it("supports buffer offsets for all generators", () => {
    const options = {
      node: Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab),
      clockseq: 0x1234,
      msecs: new Date("2011-11-01T00:00:00.000Z").getTime(),
      nsecs: 5678,
    };
    const cases = [
      ["710b962e-041c-11e1-9234-0123456789ab", (buffer, offset) => v1(options, buffer, offset)],
      ["5df41881-3aed-3515-88a7-2f4a814cf09e", (buffer, offset) => v3("www.example.com", DNS, buffer, offset)],
      [
        "109156be-c4fb-41ea-b1b4-efe1671c5836",
        (buffer, offset) =>
          v4(
            {
              random: [
                0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0xc1, 0xea,
                0x71, 0xb4, 0xef, 0xe1, 0x67, 0x1c, 0x58, 0x36,
              ],
            },
            buffer,
            offset,
          ),
      ],
      ["2ed6657d-e927-568b-95e1-2665a8aea6a2", (buffer, offset) => v5("www.example.com", DNS, buffer, offset)],
      ["1e1041c7-10b9-662e-9234-0123456789ab", (buffer, offset) => v6(options, buffer, offset)],
      [
        "0190163d-8694-7aab-af33-760b0c0d0e0f",
        (buffer, offset) =>
          v7(
            {
              msecs: 0x0190163d8694,
              seq: 0xaabbccdd,
              random: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            },
            buffer,
            offset,
          ),
      ],
    ];

    for (const [expected, write] of cases) {
      const buffer = new Uint8Array(24).fill(0xee);
      const result = write(buffer, 4);

      assert.equal(result, buffer);
      assert.equal(stringify(buffer, 4), expected);
      assert.deepEqual(Array.from(buffer.slice(0, 4)), [0xee, 0xee, 0xee, 0xee]);
      assert.deepEqual(Array.from(buffer.slice(20)), [0xee, 0xee, 0xee, 0xee]);
    }
  });

  it("rejects invalid random byte inputs", () => {
    assert.throws(() => v4({ random: [1, 2, 3] }), /Expected at least 16 random bytes/);
    assert.throws(() => v4({ random: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 256] }), /Invalid byte/);
    assert.throws(() => v3("name", [1, 2, 3]), /Expected at least 16 bytes/);
  });

  it("holds UUID invariants over deterministic fuzz samples", () => {
    const rng = createDeterministicRng(0x5eed1234);

    for (let index = 0; index < 512; index += 1) {
      const random = randomBytes(rng, 16);
      const v4Id = v4({ random });
      const v7Id = v7({
        msecs: index,
        seq: nextUint32(rng),
        random: randomBytes(rng, 16),
      });

      assert.equal(validate(v4Id), true);
      assert.equal(validate(v7Id), true);
      assert.equal(version(v4Id), 4);
      assert.equal(version(v7Id), 7);
      assert.equal((parse(v4Id)[8] & 0xc0) >>> 6, 2);
      assert.equal((parse(v7Id)[8] & 0xc0) >>> 6, 2);
      assert.equal(stringify(parse(v4Id)), v4Id);
      assert.equal(stringify(parse(v7Id)), v7Id);
    }
  });

  it("fails closed when secure crypto is unavailable", () => {
    const moduleUrl = new URL("../dist/index.js", import.meta.url).href;
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `
          import assert from "node:assert/strict";
          Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
          const { v4 } = await import(${JSON.stringify(moduleUrl)});
          assert.throws(() => v4(), /crypto\\.getRandomValues is unavailable/);
        `,
      ],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
});

function createDeterministicRng(seed) {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
}

function nextUint32(rng) {
  return rng() >>> 0;
}

function randomBytes(rng, count) {
  const bytes = new Uint8Array(count);
  let value = 0;

  for (let index = 0; index < count; index += 1) {
    if (index % 4 === 0) {
      value = nextUint32(rng);
    }

    bytes[index] = (value >>> ((index % 4) * 8)) & 0xff;
  }

  return bytes;
}
