import type { SubtaskResponse } from "../../shared/types";

interface TodoSubtaskProgressProps {
  subtasks: SubtaskResponse[];
}

function TodoSubtaskProgress({ subtasks }: TodoSubtaskProgressProps) {
  if (subtasks.length === 0) return null;

  const completedCount = subtasks.filter((subtask) => subtask.completed).length;
  return (
    <span
      data-testid="todo-subtask-progress"
      aria-label={`サブタスク ${completedCount}/${subtasks.length}`}
      className="shrink-0"
    >
      ✓ {completedCount}/{subtasks.length}
    </span>
  );
}

export default TodoSubtaskProgress;
