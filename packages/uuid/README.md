# @ts-zero/uuid

Zero-dependency UUID utilities for TypeScript, focused on RFC9562 conformance, high security, measured performance, and aggressive tree-shaking.

The public contract is intentionally close to the popular `uuid` package:

- `v1()`
- `v1ToV6(uuid)`
- `v3(name, namespace)`
- `v4()`
- `v5(name, namespace)`
- `v6()`
- `v6ToV1(uuid)`
- `v7()`
- `validate(value)`
- `version(value)`
- `parse(value)`
- `stringify(bytes)`
- `NIL`
- `MAX`
- `DNS`
- `URL`
- `OID`
- `X500`

Like `uuid`, this package validates version 8 UUIDs but does not expose a `v8()` generator because RFC9562 leaves version 8 for vendor-specific layouts.

## Conformance

This package follows RFC9562 UUID layouts:

- variant bits are set to `10`;
- version bits are set for generated UUID versions `1`, `3`, `4`, `5`, `6`, and `7`;
- UUIDv6 reorders the UUIDv1 timestamp while preserving clock sequence and node fields;
- UUIDv7 uses a 48-bit Unix millisecond timestamp plus a seeded counter/random layout for the remaining bits;
- UUIDv8 is validation-only because its 122 custom bits are implementation specific.

The API is intentionally close to `uuid@14` for the supported surface.

## Tree-Shaking

This package is ESM-only and declares `sideEffects: false`.

The implementation is designed so bundlers can eliminate unused exports aggressively. Prefer named imports:

```ts
import { v7 } from "@ts-zero/uuid";
```

For format-only usage, prefer the dedicated subpath. It contains no UUID generators, no hashing algorithms, and no random generator state:

```ts
import { parse, stringify, validate, version } from "@ts-zero/uuid/format";
```

For generator-specific bundles, use version subpaths:

```ts
import { v1 } from "@ts-zero/uuid/v1";
import { v3 } from "@ts-zero/uuid/v3";
import { v4 } from "@ts-zero/uuid/v4";
import { v5 } from "@ts-zero/uuid/v5";
import { v6 } from "@ts-zero/uuid/v6";
import { v7 } from "@ts-zero/uuid/v7";
```

Namespace constants are also available from a focused subpath:

```ts
import { DNS, URL } from "@ts-zero/uuid/namespaces";
```

Avoid namespace imports in application bundles when bundle size matters:

```ts
import * as uuid from "@ts-zero/uuid";
```

Internal code should keep top-level work limited to immutable lookup tables and constants required by exported functions.

### Tree-Checking Rules

The target is top-tier tree-shaking behavior:

- importing `v4` should not require consumers to retain namespace hashing code for `v3`/`v5`;
- importing `validate` should not require consumers to retain generators;
- format-only consumers should import from `@ts-zero/uuid/format`;
- generator-specific consumers should import from subpaths such as `@ts-zero/uuid/v4` or `@ts-zero/uuid/v7`;
- importing namespace UUID generators should not force crypto-backed random generation paths when unused;
- public examples should use named imports;
- new helpers must be evaluated for whether they couple unrelated algorithms into the same retained graph;
- any future split into internal modules should favor dead-code elimination while keeping security-critical code auditable.

### Audit Status

- UUIDv1: implemented with Gregorian timestamp, clock sequence, and node fields. Default node IDs are random and multicast-marked.
- UUIDv3: implemented as namespace UUID with MD5 for compatibility.
- UUIDv4: implemented with 122 random bits from `crypto.getRandomValues`.
- UUIDv5: implemented as namespace UUID with SHA-1 for compatibility.
- UUIDv6: implemented as UUIDv1 timestamp reorder, preserving clock sequence and node fields.
- UUIDv7: implemented with a Unix millisecond timestamp, a seeded 32-bit counter, and remaining random bits.
- UUIDv8: validation-only; no generator is exposed.

Non-goals:

- UUIDv2 is intentionally not implemented.
- UUIDv8 generation is intentionally not implemented without a package-specific custom layout.
- Hash functions used for v3/v5 are compatibility primitives, not general-purpose cryptographic APIs.

## Security

- Entropy comes only from `globalThis.crypto.getRandomValues`.
- There is no `Math.random` fallback.
- If secure randomness is unavailable, generation throws.
- Default v1/v6 node IDs are random and multicast-marked to avoid leaking MAC addresses.
- Invalid versions, variants, timestamps, sequence values, and malformed UUID strings fail closed.
- Internal v7 counter rollover throws instead of knowingly emitting a non-monotone rollover value.
- UUIDv4 is the recommended version when UUIDs are used in a security-sensitive context where time leakage is undesirable.

Timestamp UUIDs can reveal creation time and ordering. Do not treat UUIDs as secrets.

## Usage

```ts
import { v4, validate, version } from "@ts-zero/uuid";

const id = v4();

validate(id); // true
version(id); // 4
```

## Benchmark

```sh
npm run bench:uuid
```

The benchmark is intentionally dependency-free. You can tune it with:

```sh
UUID_BENCH_ITERATIONS=250000 UUID_BENCH_SAMPLES=9 UUID_BENCH_WARMUP=25000 npm run bench:uuid
```

To compare against the reference `uuid` package without adding it to this repository:

```sh
npm run bench:uuid:compare
```

This installs `uuid` into a temporary directory outside the repo. Use `UUID_REFERENCE_VERSION` to pin another version, or `UUID_REFERENCE_ROOT` to reuse a local reference install.

## Release Readiness

Run the package release gate from the repository root:

```sh
npm run check
```

The gate covers build, deterministic fixtures, malformed input rejection, buffer offsets, public subpath resolution, tree-checking smoke tests, deterministic fuzz invariants, secure-crypto failure behavior, and `npm pack --dry-run`.
