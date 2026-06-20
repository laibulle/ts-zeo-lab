export function assertByte(byte: number | undefined, index: number): asserts byte is number {
  if (byte === undefined || !Number.isInteger(byte) || byte < 0 || byte > 255) {
    throw new TypeError(`Invalid byte at index ${index}`);
  }
}

export function copyArrayLike(bytes: ArrayLike<number>, count: number): Uint8Array {
  if (bytes.length < count) {
    throw new TypeError(`Expected at least ${count} bytes`);
  }

  const output = new Uint8Array(count);

  for (let index = 0; index < count; index += 1) {
    const byte = bytes[index];

    assertByte(byte, index);
    output[index] = byte;
  }

  return output;
}

export function assertTargetBuffer(target: Uint8Array, offset: number, count: number): void {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new RangeError(`Invalid offset: ${offset}`);
  }

  if (target.length - offset < count) {
    throw new RangeError("Target buffer is too small");
  }
}

export function copyBytes(source: Uint8Array, target: Uint8Array, offset: number): void {
  assertTargetBuffer(target, offset, source.length);

  target.set(source, offset);
}

export function assertUint(value: number, max: number, name: string): void {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(`Invalid ${name}: ${value}`);
  }
}

export function concat(left: Uint8Array, right: Uint8Array): Uint8Array {
  const output = new Uint8Array(left.length + right.length);

  output.set(left, 0);
  output.set(right, left.length);

  return output;
}
