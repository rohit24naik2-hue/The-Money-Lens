import { useEffect, useState } from "react";
import { DATA_MUTATED_EVENT } from "./events.js";

// Runs `loader()` on mount and whenever any store mutation fires the
// DATA_MUTATED_EVENT window event, so views stay in sync without refreshes.
export function useLiveData(loader) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const run = () => {
      loader()
        .then((d) => alive && setData(d))
        .catch((e) => alive && setError(e));
    };
    run();
    window.addEventListener(DATA_MUTATED_EVENT, run);
    return () => {
      alive = false;
      window.removeEventListener(DATA_MUTATED_EVENT, run);
    };
  }, [loader]);

  return [data, error];
}
