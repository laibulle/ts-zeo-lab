import type { UUID } from "./types.js";

const HEX: string[] = Array.from({ length: 256 }, (_, index) =>
  index.toString(16).padStart(2, "0"),
);

export function unsafeStringify(bytes: ArrayLike<number>, offset = 0): UUID {
  const id = (
    HEX[bytes[offset] ?? 0] +
    HEX[bytes[offset + 1] ?? 0] +
    HEX[bytes[offset + 2] ?? 0] +
    HEX[bytes[offset + 3] ?? 0] +
    "-" +
    HEX[bytes[offset + 4] ?? 0] +
    HEX[bytes[offset + 5] ?? 0] +
    "-" +
    HEX[bytes[offset + 6] ?? 0] +
    HEX[bytes[offset + 7] ?? 0] +
    "-" +
    HEX[bytes[offset + 8] ?? 0] +
    HEX[bytes[offset + 9] ?? 0] +
    "-" +
    HEX[bytes[offset + 10] ?? 0] +
    HEX[bytes[offset + 11] ?? 0] +
    HEX[bytes[offset + 12] ?? 0] +
    HEX[bytes[offset + 13] ?? 0] +
    HEX[bytes[offset + 14] ?? 0] +
    HEX[bytes[offset + 15] ?? 0]
  );

  return id as UUID;
}
