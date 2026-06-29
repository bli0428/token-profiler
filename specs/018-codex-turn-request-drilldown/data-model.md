# Data Model: Codex Turn Request Drilldown

## CanonicalRequestTurnIdentity

Provider-neutral request-level turn fact persisted for new captures. This is a request fact, not an artifact annotation.

**Fields**
- `run_id`: local run/session id.
- `request_id`: proxy request id.
- `turn_id`: canonical turn grouping key when directly observed.
- `turn_identity_source`: `direct_turn_id`, `missing`, or `malformed`.
- `turn_started_at`: optional normalized timestamp when the source provides one.
- `caveats`: explanations for missing or malformed identity.

**Relationships**
- One request has zero or one direct turn identity.
- One turn identity may contain many requests.
- Turn identity is separate from session, response, request, artifact, and cache identities.

**Validation rules**
- `turn_id` must never be derived from user text, prompt cache key, or artifact naming.
- Missing turn identity must remain explicit and must not be converted to a capture-time fallback id.
- Provider-specific source field names must not appear in analyzer-facing contracts.

## TurnGroup

Analyzer output representing one turn in a run.

**Fields**
- `turn_id`: stable turn group key. Direct turn ids use canonical turn identity; fallback groups use an explicit generated fallback key.
- `display_title`: privacy-aware user-readable title.
- `title_source`: `user_preview`, `safe_summary`, `fallback`, or `turn_id`.
- `grouping_source`: `direct_turn_id`, `missing_turn_id`, or `fallback`.
- `confidence`: `complete`, `partial`, or `fallback`.
- `request_ids`: child request ids in chronological order.
- `artifact_ids`: artifact ids included by child requests.
- `metrics`: optional rollups derived from child requests.
- `privacy`: state explaining whether preview/raw content is available.
- `caveats`: limitations and fallback explanations.

**Relationships**
- A run has many turn groups.
- A turn group has one or more requests unless the data is partial.
- A turn group references artifacts through child request inclusions.

**Validation rules**
- Direct turn groups are ordered by first child request chronology or `turn_started_at` when available.
- Fallback turn groups must not be labeled as direct Codex turn groups.
- Replayed user-message artifacts do not create duplicate turn groups.

## TurnRequest

Request presentation row nested under a turn.

**Fields**
- `request_id`: stable request key.
- `display_title`: privacy-aware user-readable request title.
- `title_source`: `assistant_preview`, `action_label`, `turn_title`, or `request_id`.
- `chronology_index`: request order within the run.
- `availability`: existing request accounting availability.
- `usage`: existing provider usage when reported.
- `artifact_inclusions`: existing request artifact inclusions.
- `caveats`: request-level caveats.

**Relationships**
- One turn request belongs to one turn group.
- One turn request references many artifact inclusions.
- Request metrics come from request accounting.

**Validation rules**
- Assistant previews are preferred over tool/action labels.
- Action labels are used only when assistant previews are unavailable.
- Request ids are last-resort titles.

## ArtifactDetail

Existing artifact detail model used as the deepest drilldown level.

**Fields**
- Existing identity, metrics, persistence, command, patch, content, privacy, tool link, and caveat fields.

**Relationships**
- Artifact details are looked up by `artifact_id`.
- Request artifact inclusions reference artifact details without changing artifact ownership.

**Validation rules**
- Artifact rendering remains governed by existing privacy state.
- Artifact content availability must not influence turn grouping identity.

## DashboardRunTurnView

Dashboard API view model for run detail.

**Fields**
- `run_id`
- `turns`
- request metrics needed by turn children
- existing `artifact_details`
- existing `privacy`
- existing `caveats`

**Relationships**
- `turns` is the primary drilldown hierarchy.
- request accounting remains an analyzer input or internal source for mapped request metrics.
- `artifact_details` remains keyed by artifact id.

**Validation rules**
- Dashboard clients render `turns` directly.
- Dashboard clients do not reconstruct turns from raw request/artifact fields.
- Dashboard clients do not depend on a separate request-first response shape for compatibility.
