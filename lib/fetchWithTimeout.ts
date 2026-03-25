const DEFAULT_TIMEOUT_MS = 10_000;

export default async function fetchWithTimeout(
  url: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options ?? {};

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("La solicitud tardó demasiado. Intentá de nuevo.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
