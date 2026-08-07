# Core

The core layer owns canonical storage, identity, privacy, hashing, tokenization,
and capture primitives.

Use this layer when you need the project's shared canonical types or helpers
that sit between adapters and analyzers.

For large captures, use the store's async JSONL reader. It emits only complete
newline-terminated canonical records, so a concurrent append does not turn a
partial trailing line into an event.

For boundary rules and allowed inputs/outputs, see [contract.md](contract.md).

Large-run readers use the store's streaming JSONL API. The store also keeps the
local, privacy-safe session catalog used to make dashboard startup independent
of historical event-log size.
