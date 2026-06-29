import { useState } from "react";

// Run `reset` during render whenever `key` changes — the React-sanctioned alternative to
// `useEffect(() => reset(), [deps])` for "adjust some state when inputs change" (e.g. snap a
// paginated list back to the first page when the filters change). It avoids the extra cascading
// render an effect causes (and the react-hooks/set-state-in-effect rule) by comparing against the
// previous key and resetting synchronously during render — React re-renders immediately with the
// reset applied, before anything paints.
// https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
export function useResetOnChange(key: string, reset: () => void): void {
  const [prev, setPrev] = useState(key);
  if (key !== prev) {
    setPrev(key);
    reset();
  }
}
