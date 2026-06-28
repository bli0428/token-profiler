# Research: Request-First Dashboard

## Decision: Consume spec 014 request accounting as the only source of request facts

**Rationale**: The dashboard is a surface. Provider totals, chronology, cache attribution, session identity confidence, and artifact attribution belong to analyzer/API contracts. Rendering those fields directly preserves the architecture boundary and keeps browser behavior consistent with CLI/API validation.

**Alternatives considered**: Reconstruct request totals from artifact rows in the browser. Rejected because it would duplicate analyzer logic, confuse provider-reported totals with estimates, and violate the surface boundary.

## Decision: Keep the left session list and enrich rows with contract-supplied identity and token signals

**Rationale**: The user starts by choosing the expensive session. Keeping the existing navigation avoids disorienting workflow changes while adding the Codex-facing identity and completeness diagnostics needed to distinguish one-to-one, probable, and unknown mappings.

**Alternatives considered**: Replace sessions with a global request list. Rejected because it loses session context and conflicts with the requested left-pane workflow.

## Decision: Make chronological requests the default selected-run center pane

**Rationale**: Users need to inspect how cost evolves through a session and identify the expensive request before reading artifacts. Chronological ordering also aligns with provider request order and makes partial historical data easier to understand.

**Alternatives considered**: Keep aggregate artifact ranking as the default and add request filters. Rejected because it preserves the current artifact-first mental model and hides request-level provider totals.

## Decision: Use expansion rows for request-scoped artifact contributors

**Rationale**: Expansion keeps the request-first scan dense while allowing users to inspect the likely contributors for expensive requests. Nested artifact rows can show local estimates and caveats without implying they are authoritative provider totals.

**Alternatives considered**: Open a separate request detail route for every request. Rejected for initial scope because the selected-run workflow can be completed in one pane, and the full run payload already contains request rows.

## Decision: Preserve artifact detail as a secondary drilldown

**Rationale**: Existing artifact detail still helps explain context composition. Keeping it available from request inclusions maintains continuity while removing aggregate artifact tables as the default center-pane workflow.

**Alternatives considered**: Remove artifact detail from the dashboard. Rejected because request-scoped estimates often need a detail path for artifact metadata and existing safe previews.

## Decision: Add explicit unsupported, empty, partial, and unavailable states

**Rationale**: Older fixtures and partial captures may lack request accounting. The dashboard should make that limitation visible and avoid silently falling back to artifact-first views or displaying zeros for missing provider metrics.

**Alternatives considered**: Hide request sections when data is absent. Rejected because absence itself is diagnostic and hiding it makes historical runs look broken or misleadingly cheap.

## Decision: Test keyboard expansion and responsive readability as feature behavior

**Rationale**: Request rows combine many metrics and nested artifact controls. Keyboard and narrow-width coverage protects the core workflow from becoming visually dense but difficult to operate.

**Alternatives considered**: Rely only on snapshot/contract tests. Rejected because this feature changes interaction and layout, not only data shape.
