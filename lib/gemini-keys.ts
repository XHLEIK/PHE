export function getGeminiKeyPool(): string[] {
  const keys: string[] = [];
  
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  if (process.env.GEMINI_API_KEY1) keys.push(process.env.GEMINI_API_KEY1);
  if (process.env.GEMINI_API_KEY2) keys.push(process.env.GEMINI_API_KEY2);
  if (process.env.GEMINI_API_KEY3) keys.push(process.env.GEMINI_API_KEY3);
  if (process.env.GEMINI_API_KEY4) keys.push(process.env.GEMINI_API_KEY4);
  if (process.env.GEMINI_API_KEY5) keys.push(process.env.GEMINI_API_KEY5);
  if (process.env.GEMINI_API_KEY6) keys.push(process.env.GEMINI_API_KEY6);
  if (process.env.GEMINI_API_KEY7) keys.push(process.env.GEMINI_API_KEY7);
  if (process.env.GEMINI_API_KEY8) keys.push(process.env.GEMINI_API_KEY8);
  if (process.env.GEMINI_API_KEY9) keys.push(process.env.GEMINI_API_KEY9);
  if (process.env.GEMINI_API_KEY10) keys.push(process.env.GEMINI_API_KEY10);

  // In Node.js environment, also check dynamically
  try {
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('GEMINI_API_KEY') && typeof value === 'string' && value.trim().length > 0) {
        keys.push(value.trim());
      }
    }
  } catch (e) {
    // Ignore in Edge runtimes if Object.entries acts up
  }

  return Array.from(new Set(keys)).filter(k => k.length > 0);
}

export async function fetchWithGeminiKeyRotation(
  urlBuilder: (key: string) => string,
  optionsOptions: Omit<RequestInit, 'signal'>, 
  timeoutMs: number = 30000
): Promise<Response> {
  const keys = getGeminiKeyPool();
  if (keys.length === 0) {
    throw new Error('No GEMINI_API_KEYs configured in environment.');
  }

  let attempt = 0;
  let lastResponse: Response | null = null;
  let lastError: Error | null = null;
  const maxAttempts = keys.length; // Try each key once

  while (attempt < maxAttempts) {
    const currentKey = keys[attempt];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const url = urlBuilder(currentKey);
      const res = await fetch(url, { ...optionsOptions, signal: controller.signal });
      clearTimeout(timeoutId);
      
      // If quota exceeded, forbidden, or service unavailable, retry with next key
      if (res.status === 429 || res.status === 403 || res.status === 503) {
        console.warn(`[GEMINI] Key limit hit (status ${res.status}). Switching to key ${attempt + 2}/${keys.length}...`);
        lastResponse = res;
        attempt++;
        continue;
      }
      
      return res;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      lastError = err as Error;
      
      if (err instanceof Error && err.name === 'AbortError') {
         console.warn(`[GEMINI] Request timed out. Trying next key if available...`);
         attempt++;
         continue;
      }
      // If it's another network error, just fail or continue?
      attempt++;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error('All Gemini API keys failed.');
}
