import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const HELP = `使い方:
  pnpm todo:add --title "TODOのタイトル" [オプション]

必須環境変数（Cloudflare Access Service Token）:
  TODO_OS_URL
  TODO_OS_ACCESS_CLIENT_ID
  TODO_OS_ACCESS_CLIENT_SECRET

オプション:
  --description "説明"
  --priority HIGH|MEDIUM|LOW
  --due-date YYYY-MM-DD
  --tag-id <正の整数>  複数指定可
  --help`;

const PRIORITIES = new Set(["HIGH", "MEDIUM", "LOW"]);
const DUE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function optionValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} の値が必要です`);
  }
  return value;
}

export function parseArgs(argv) {
  const options = { tagIds: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case "--help":
        return { help: true, tagIds: [] };
      case "--title":
        options.title = optionValue(argv, index, argument);
        index += 1;
        break;
      case "--description":
        options.description = optionValue(argv, index, argument);
        index += 1;
        break;
      case "--priority":
        options.priority = optionValue(argv, index, argument);
        index += 1;
        break;
      case "--due-date":
        options.dueDate = optionValue(argv, index, argument);
        index += 1;
        break;
      case "--tag-id": {
        const tagId = Number(optionValue(argv, index, argument));
        if (!Number.isInteger(tagId) || tagId <= 0) {
          throw new Error("--tag-id は正の整数で指定してください");
        }
        options.tagIds.push(tagId);
        index += 1;
        break;
      }
      default:
        throw new Error(`不明なオプションです: ${argument}`);
    }
  }

  return options;
}

function validateOptions(options) {
  if (!options.title || options.title.trim().length === 0) {
    throw new Error("--title は1〜200文字で指定してください");
  }
  if (options.title.trim().length > 200) {
    throw new Error("--title は1〜200文字で指定してください");
  }
  if (options.priority && !PRIORITIES.has(options.priority)) {
    throw new Error(
      "--priority は HIGH、MEDIUM、LOW のいずれかで指定してください",
    );
  }
  if (options.dueDate && !DUE_DATE_PATTERN.test(options.dueDate)) {
    throw new Error("--due-date は YYYY-MM-DD 形式で指定してください");
  }
}

export function buildRequest(options, env = process.env) {
  validateOptions(options);
  const tagIds = options.tagIds ?? [];

  const baseUrl = env.TODO_OS_URL?.trim();
  if (!baseUrl) throw new Error("TODO_OS_URL を設定してください");
  try {
    new URL(baseUrl);
  } catch {
    throw new Error("TODO_OS_URL は有効なURLで指定してください");
  }

  const clientId = env.TODO_OS_ACCESS_CLIENT_ID?.trim();
  const clientSecret = env.TODO_OS_ACCESS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "TODO_OS_ACCESS_CLIENT_ID と TODO_OS_ACCESS_CLIENT_SECRET を両方設定してください",
    );
  }

  const body = { title: options.title.trim() };
  if (options.description !== undefined) {
    body.description = options.description || null;
  }
  if (options.priority) body.priority = options.priority;
  if (options.dueDate) body.dueDate = options.dueDate;
  if (tagIds.length > 0) body.tagIds = tagIds;

  return {
    url: new URL("/api/todos", baseUrl).toString(),
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Access-Client-Id": clientId,
        "CF-Access-Client-Secret": clientSecret,
      },
      body: JSON.stringify(body),
    },
  };
}

export async function addTodo(options, env = process.env, fetchImpl = fetch) {
  const request = buildRequest(options, env);
  const response = await fetchImpl(request.url, request.init);
  const rawBody = await response.text();
  let payload;
  try {
    payload = rawBody ? JSON.parse(rawBody) : undefined;
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : `HTTP ${response.status}`;
    throw new Error(`TODOの追加に失敗しました: ${message}`);
  }

  return payload;
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      console.log(HELP);
      return;
    }
    const todo = await addTodo(options, env);
    console.log(JSON.stringify(todo, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
