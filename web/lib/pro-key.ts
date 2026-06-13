// Only <date>/<slug>/pro.(html|pdf) is ever a valid Pro object key. This blocks
// path traversal (../), query strings, and any non-Pro file from being requested.
const PRO_KEY_RE = /^\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]+\/pro\.(html|pdf)$/;

export function isValidProKey(key: string): boolean {
  return PRO_KEY_RE.test(key);
}
