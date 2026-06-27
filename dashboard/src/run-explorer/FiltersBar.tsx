import type { DashboardViewState } from "../state/view-state";

type Props = {
  categories: string[];
  state: DashboardViewState;
  onChange: (next: Partial<DashboardViewState>) => void;
};

export function FiltersBar({ categories, state, onChange }: Props) {
  return (
    <div className="filters-bar">
      <label>
        Search
        <input value={state.searchQuery} onChange={(event) => onChange({ searchQuery: event.target.value })} />
      </label>
      <label>
        Category
        <select value={state.categoryFilter} onChange={(event) => onChange({ categoryFilter: event.target.value })}>
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sort
        <select value={state.sortKey} onChange={(event) => onChange({ sortKey: event.target.value as DashboardViewState["sortKey"] })}>
          <option value="total_exposure">Total exposure</option>
          <option value="repeated_exposure">Repeated exposure</option>
          <option value="inclusion_count">Inclusions</option>
          <option value="estimated_cached_input_tokens">Cached estimate</option>
          <option value="estimated_uncached_input_tokens">Uncached estimate</option>
          <option value="display_name">Name</option>
          <option value="display_category">Category</option>
        </select>
      </label>
      <button
        type="button"
        onClick={() => onChange({ sortDirection: state.sortDirection === "asc" ? "desc" : "asc" })}
        aria-label="Toggle sort direction"
      >
        {state.sortDirection === "asc" ? "Ascending" : "Descending"}
      </button>
    </div>
  );
}
