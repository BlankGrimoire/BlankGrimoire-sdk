# Canonical fixtures

Hand-written JSON examples of every contract entity, organized by
`apiVersion` (e.g. `v1/`).

They are published with each SDK release and decoded by the iOS app's
`ContractTests`, guaranteeing that TypeScript output and Swift DTOs stay in sync.

Rules:

- every entity in `@blankgrimoire/types` must have at least one fixture;
- use placeholder data only (`example.org`, `Lorem ipsum`);
- update fixtures in the same PR that changes the contract.