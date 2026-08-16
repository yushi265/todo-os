import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TodoSubtaskProgress from "./TodoSubtaskProgress";

describe("TodoSubtaskProgress", () => {
  it("shows the completed count and total count", () => {
    render(
      <TodoSubtaskProgress
        subtasks={[
          {
            id: 1,
            todoId: 10,
            title: "done",
            completed: true,
            createdAt: "2026-08-01T00:00:00.000Z",
            updatedAt: "2026-08-01T00:00:00.000Z",
          },
          {
            id: 2,
            todoId: 10,
            title: "open",
            completed: false,
            createdAt: "2026-08-01T00:00:00.000Z",
            updatedAt: "2026-08-01T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByLabelText("サブタスク 1/2")).toHaveTextContent("✓ 1/2");
  });

  it("renders nothing when there are no subtasks", () => {
    const { container } = render(<TodoSubtaskProgress subtasks={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
