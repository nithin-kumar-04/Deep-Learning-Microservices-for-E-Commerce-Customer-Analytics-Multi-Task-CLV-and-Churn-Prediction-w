import axios from 'axios';

/**
 * Turns an API error into a message that can be shown in the UI.
 * Unknown failures fall back to the caller-provided copy.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;

  if (!error.response) {
    return 'Cannot reach the Velora API. Make sure the backend is running.';
  }

  const status = error.response.status;
  if (status === 404) return 'The requested customer or data was not found.';
  if (status === 413) return 'The request is too large. Try a smaller batch file.';
  if (status === 422) return 'The API could not read that data. Check the values and try again.';
  if (status === 429) return 'Too many requests. Wait a moment and try again.';
  if (status >= 500) return 'The Velora API ran into an error. Please try again.';

  return fallback;
}
