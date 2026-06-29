# Contract: Turn Drilldown Dashboard Model

## Scope

This contract describes the logical dashboard API model needed by the surface. It is not a Codex provider payload schema.

## Run Detail

```ts
type DashboardRun = {
  run_id: string;
  turns: DashboardTurnGroup[];
  artifact_details: Record<string, DashboardArtifactDetail>;
  privacy: DashboardPrivacyState;
  caveats: DashboardCaveat[];
};
```

## Turn Group

```ts
type DashboardTurnGroup = {
  turn_id: string;
  display_title: string;
  title_source:
    | "user_preview"
    | "safe_summary"
    | "fallback"
    | "turn_id";
  grouping_source:
    | "direct_turn_id"
    | "missing_turn_id"
    | "fallback";
  confidence: "complete" | "partial" | "fallback";
  request_ids: string[];
  requests: DashboardTurnRequest[];
  privacy: DashboardPrivacyState;
  caveats: DashboardCaveat[];
};
```

## Turn Request

```ts
type DashboardTurnRequest = {
  request_id: string;
  display_title: string;
  title_source:
    | "assistant_preview"
    | "action_label"
    | "turn_title"
    | "request_id";
  chronology_index: number;
  artifact_inclusions: DashboardRequestArtifactInclusion[];
  availability: DashboardRequestAvailability;
  usage?: DashboardRequestUsage;
  caveats: DashboardCaveat[];
};
```

## Contract Notes

- `display_title` is never a stable key.
- `turn_id` and `request_id` are stable keys for expansion and selection.
- `grouping_source` tells the dashboard whether the turn grouping is direct or fallback.
- `title_source` tells the dashboard how much confidence to communicate in a label.
- Artifact details remain artifact-owned and are looked up by `artifact_id`.
- `turns` is the primary run-detail drilldown contract; any request accounting used to populate request children is mapped explicitly rather than exposed as a competing request-first hierarchy for compatibility.
