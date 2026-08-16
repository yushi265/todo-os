import type { ErrorResponse } from "../../shared/types";

type ApiErrorFactory<E extends Error> = (status: number, message: string) => E;

async function toApiError<E extends Error>(
  response: Response,
  createError: ApiErrorFactory<E>,
): Promise<E> {
  try {
    const body = (await response.json()) as ErrorResponse;
    return createError(
      response.status,
      body.error || `HTTP ${response.status}`,
    );
  } catch {
    return createError(response.status, `HTTP ${response.status}`);
  }
}

async function requestResponse<E extends Error>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  createError: ApiErrorFactory<E>,
): Promise<Response> {
  const response =
    init === undefined ? await fetch(input) : await fetch(input, init);
  if (!response.ok) {
    throw await toApiError(response, createError);
  }
  return response;
}

export async function requestJson<T, E extends Error>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  createError: ApiErrorFactory<E>,
): Promise<T> {
  const response = await requestResponse(input, init, createError);
  return (await response.json()) as T;
}

export async function requestVoid<E extends Error>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  createError: ApiErrorFactory<E>,
): Promise<void> {
  await requestResponse(input, init, createError);
}
