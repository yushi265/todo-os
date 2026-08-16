export type JsonBodyResult = { ok: true; data: unknown } | { ok: false };

/**
 * JSON body を読み取り、構文エラーをサービスの入力不正として扱う。
 * Hono の onError まで例外を伝播させず、各ルートで400を返せるようにする。
 */
export async function parseJsonBody(request: Request): Promise<JsonBodyResult> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false };
  }
}
