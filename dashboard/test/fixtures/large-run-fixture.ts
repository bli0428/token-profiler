import type { DashboardArtifactRow, RunResponse } from "../../src/api/types";
import apiRealRun from "./api-real/run.json";

export function createLargeRunFixture(count = 1000): RunResponse {
  const base = apiRealRun as RunResponse;
  const categories = ["file", "command", "message", "tool"] as const;
  return {
    ...base,
    data: {
      ...base.data,
      overview: {
        ...base.data.overview,
        scope_label: "Large dashboard fixture"
      },
      artifacts: Array.from({ length: count }, (_, index): DashboardArtifactRow => {
        const category = categories[index % categories.length] ?? "file";
        const task = index % 2 === 0 ? base.data.task_groups[0] : base.data.task_groups[1];
        return {
          artifact_id: `artifact-large-${index}`,
          stable_short_id: `large-${index}`,
          display_name: `Large artifact ${index}`,
          display_category: category,
          task_group_ids: task ? [task.task_group_id] : [],
          preview_state: index % 5 === 0 ? "hidden" : "preview",
          detail_available: true,
          search_text: `large artifact ${index} ${category}`,
          total_exposure: 1000 + index,
          repeated_exposure: index % 200,
          inclusion_count: (index % 10) + 1,
          estimated_cached_input_tokens: index % 300,
          estimated_uncached_input_tokens: 700 + index,
          caveats: []
        };
      }),
      filters: {
        ...base.data.filters,
        categories: [...categories]
      }
    }
  };
}
