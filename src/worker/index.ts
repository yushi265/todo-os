import { Hono } from "hono";
import todosRoute from "./routes/todos";
import type { ErrorResponse } from "../shared/types";

const app = new Hono<{ Bindings: Env }>();

app.route("/api/todos", todosRoute);

app.onError((err, c) => {
  console.error(err);
  return c.json(
    { error: "Internal server error" } satisfies ErrorResponse,
    500,
  );
});

export default app;
