/** Propagate a disconnected download request and bound time spent proxying exports. */
export function exportRequestSignal(requestSignal: AbortSignal): AbortSignal {
  return AbortSignal.any([requestSignal, AbortSignal.timeout(30_000)]);
}
