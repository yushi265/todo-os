import type { CreateTodoInput, UpdateTodoInput } from "../../shared/schemas";
import type { TodoResponse } from "../../shared/types";

export function todoToUpdateInput(todo: TodoResponse): UpdateTodoInput {
  return {
    title: todo.title,
    description: todo.description,
    status: todo.status,
    priority: todo.priority,
    dueDate: todo.dueDate,
    tagIds: todo.tags.map((tag) => tag.id),
  };
}

export function todoToCreateInput(todo: TodoResponse): CreateTodoInput {
  return {
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    dueDate: todo.dueDate,
    tagIds: todo.tags.map((tag) => tag.id),
  };
}

export function orderTodosByIds(
  todos: TodoResponse[],
  orderedIds: readonly number[],
): TodoResponse[] {
  const positions = new Map(orderedIds.map((id, index) => [id, index]));
  return [...todos].sort(
    (left, right) =>
      (positions.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (positions.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function isDataInOptimisticOrder(
  data: TodoResponse[],
  optimisticOrderIds: readonly number[],
): boolean {
  const dataIds = data.map((todo) => todo.id);
  const expectedIds = optimisticOrderIds.filter((id) => dataIds.includes(id));
  return (
    expectedIds.length === dataIds.length &&
    expectedIds.every((id, index) => id === dataIds[index])
  );
}
