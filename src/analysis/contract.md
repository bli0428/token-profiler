# Analysis API Contract

The analysis layer is the public API for deriving reusable facts from
canonical records. Surfaces should consume these APIs instead of reading raw
events or recomputing analyzer logic.

## Pipeline APIs

Import from `src/analysis/pipeline.ts`.

```ts
function analyzeEvents(events: unknown[]): RunAnalysisSummary;
function exportAnalysisResult(summary: RunAnalysisSummary): RunAnalysisSummary;
function toLegacyAggregateSummary(summary: RunAnalysisSummary): AggregateSummary;
```

`analyzeEvents` is the primary public analysis entry point. It runs the full
pipeline and returns the summary consumed by surfaces.

Import from `src/analysis/aggregate.ts`.

```ts
function aggregateEvents(events: unknown[]): AggregateSummary;
```

Import from `src/analysis/run-data.ts`.

```ts
function prepareRunData(events: unknown[]): PreparedRunData;
```

## Analyzer APIs

```ts
function analyzeExposure(runData: PreparedRunData): ExposureAnalysis;

function analyzeCacheAttribution(
  runData: PreparedRunData,
  artifacts: ArtifactAggregate[],
  requests: RequestSummary[]
): CacheAttributionAnalysis;

function attributeRequestCache(
  request: RequestSummary,
  usage: NonNullable<RequestSummary["usage"]>
): RequestCacheAttributionSummary;

function analyzeRequestAccounting(
  runData: PreparedRunData,
  requests: RequestSummary[]
): RequestAccountingResult;

function analyzeTurnGroups(
  runData: PreparedRunData,
  requestAccounting: RequestAccountingResult,
  legibility: LegibilityAnalysisResult
): TurnGroupAnalysisResult;

function analyzeLegibility(
  artifacts: ArtifactAggregate[],
  requests: RequestSummary[],
  artifactEvents: ArtifactEvent[]
): LegibilityAnalysisResult;

function findArtifactDetail(
  analysis: LegibilityAnalysisResult,
  query: string
): ArtifactDetail | undefined;

function formatArtifactDetail(
  summary: RunAnalysisSummary | AggregateSummary,
  artifactQuery: string
): string;

function analyzeTaskGroups(
  requests: RequestSummary[],
  legibility: LegibilityAnalysisResult
): TaskGroupAnalysisResult;

function analyzePersistence(
  artifacts: ArtifactAggregate[],
  requests: RequestSummary[]
): AnalyzerResult;

function analyzeContextClutter(artifacts: ArtifactAggregate[]): AnalyzerResult;
```

## Helper APIs

```ts
function compareArtifactsByMetric(
  metric: keyof ArtifactAggregate
): (a: ArtifactAggregate, b: ArtifactAggregate) => number;
function compareRequestsByTimestamp(
  a: { timestamp?: string; request_id: string },
  b: { timestamp?: string; request_id: string }
): number;
function stableShortId(value: unknown, length?: number): string;
function compareReadableArtifacts(a: ReadableArtifact, b: ReadableArtifact): number;
function compareTaskGroups(a: TaskGroup, b: TaskGroup): number;

function localAttributionCaveat(analyzer_id?: string): AnalysisCaveat;
function partialDataCaveat(
  code: string,
  message: string,
  analyzer_id: string
): AnalysisCaveat;
function legibilityCaveat(
  code: keyof typeof LEGIBILITY_CAVEATS,
  applies_to?: AnalysisCaveat["applies_to"]
): AnalysisCaveat;

function ratio(numerator: unknown, denominator: unknown): number;
function finiteNumber(value: unknown): number | undefined;
function mergeMetadata(current?: JsonObject, next?: JsonObject): JsonObject;
```

## Public Types

Import from `src/analysis/types.ts`.

- `RunAnalysisSummary`: full analysis result consumed by surfaces.
- `AnalyzerResult`, `AnalyzerAvailability`, and `AnalysisCaveat`: shared
  analyzer result metadata.
- `RequestAccountingResult`, `RequestAccountingRow`, and related request
  accounting types.
- `TurnGroupAnalysisResult`, `TurnGroup`, and related turn-group types.
- `LegibilityAnalysisResult`, `ReadableArtifact`, `ArtifactDetail`, and
  `TaskGroup`.
- `PreparedRunData`, `ExposureAnalysis`, and `CacheAttributionAnalysis`.

## Invariants

- Analysis inputs must be canonical records or core-derived summaries.
- Analyzer output must preserve uncertainty, privacy limits, and caveats
  explicitly.
- Analysis must not depend on adapter internals or raw provider payloads.
- Surfaces must render analyzer outputs and must not recompute analyzer facts.
