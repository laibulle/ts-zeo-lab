export const iterations = readIntegerEnv("UUID_BENCH_ITERATIONS", 100_000);
export const samples = readIntegerEnv("UUID_BENCH_SAMPLES", 7);
export const warmup = readIntegerEnv("UUID_BENCH_WARMUP", 10_000);

export const deterministicRandom = Uint8Array.of(
  0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0xc1, 0xea,
  0x71, 0xb4, 0xef, 0xe1, 0x67, 0x1c, 0x58, 0x36,
);

export const timestampOptions = {
  node: Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab),
  clockseq: 0x1234,
  msecs: new Date("2024-01-01T00:00:00.000Z").getTime(),
  nsecs: 0,
};

export function createCases(uuid) {
  const buffer = new Uint8Array(16);

  return [
    ["v1 string", () => uuid.v1(timestampOptions)],
    ["v1 buffer", () => uuid.v1(timestampOptions, buffer)],
    ["v3 string", () => uuid.v3("www.example.com", uuid.v3.DNS)],
    ["v3 buffer", () => uuid.v3("www.example.com", uuid.v3.DNS, buffer)],
    ["v4 string", () => uuid.v4({ random: deterministicRandom })],
    ["v4 buffer", () => uuid.v4({ random: deterministicRandom }, buffer)],
    ["v5 string", () => uuid.v5("www.example.com", uuid.v5.DNS)],
    ["v5 buffer", () => uuid.v5("www.example.com", uuid.v5.DNS, buffer)],
    ["v6 string", () => uuid.v6(timestampOptions)],
    ["v6 buffer", () => uuid.v6(timestampOptions, buffer)],
    [
      "v7 string",
      () => uuid.v7({ msecs: 0x0190163d8694, seq: 0xaabbccdd, random: deterministicRandom }),
    ],
    [
      "v7 buffer",
      () => uuid.v7({ msecs: 0x0190163d8694, seq: 0xaabbccdd, random: deterministicRandom }, buffer),
    ],
  ];
}

export function createCryptoCases(uuid) {
  const buffer = new Uint8Array(16);

  return [
    ["v4 string", () => uuid.v4()],
    ["v4 buffer", () => uuid.v4(undefined, buffer)],
    ["v7 string", () => uuid.v7()],
    ["v7 buffer", () => uuid.v7(undefined, buffer)],
  ];
}

export function createOperationCases(uuid) {
  const id = "109156be-c4fb-41ea-b1b4-efe1671c5836";
  const bytes = Uint8Array.of(
    0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0x41, 0xea,
    0xb1, 0xb4, 0xef, 0xe1, 0x67, 0x1c, 0x58, 0x36,
  );

  return [
    ["parse", () => uuid.parse(id)],
    ["stringify", () => uuid.stringify(bytes)],
    ["validate", () => uuid.validate(id)],
    ["version", () => uuid.version(id)],
  ];
}

export function runLoop(fn, count) {
  let value;

  for (let index = 0; index < count; index += 1) {
    value = fn();
  }

  return value;
}

export function readIntegerEnv(name, defaultValue) {
  const raw = process.env[name];

  if (raw === undefined) {
    return defaultValue;
  }

  const value = Number.parseInt(raw, 10);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

export function formatNumber(value) {
  return Math.round(value).toLocaleString("en-US");
}

export function pad(value, width) {
  return value.padEnd(width, " ");
}

export function padLeft(value, width) {
  return value.padStart(width, " ");
}
