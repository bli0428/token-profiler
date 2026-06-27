import { DashboardController } from "./DashboardController";

export function DashboardShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Token Profiler Dashboard</h1>
          <p>Local context exposure explorer</p>
        </div>
      </header>
      <DashboardController />
    </div>
  );
}
