import type { DashboardTaskGroup } from "../api/types";

type Props = {
  taskGroups: DashboardTaskGroup[];
  selectedTaskGroupId?: string;
  onSelect: (taskGroupId: string | undefined) => void;
};

export function TaskGroups({ taskGroups, selectedTaskGroupId, onSelect }: Props) {
  return (
    <nav className="task-groups" aria-label="Task groups">
      <button className={!selectedTaskGroupId ? "is-selected" : ""} type="button" onClick={() => onSelect(undefined)}>
        All tasks
      </button>
      {taskGroups.map((task) => (
        <button
          className={task.task_group_id === selectedTaskGroupId ? "is-selected" : ""}
          key={task.task_group_id}
          type="button"
          onClick={() => onSelect(task.task_group_id)}
        >
          <span>{task.display_name}</span>
          <span>{task.artifact_count}</span>
        </button>
      ))}
    </nav>
  );
}
