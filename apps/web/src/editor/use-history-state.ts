import { useCallback, useState } from 'react';

const HISTORY_LIMIT = 100;

interface HistoryState<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
}

export function useHistoryState<T extends object>(createInitialState: () => T) {
  const [history, setHistory] = useState<HistoryState<T>>(() => ({
    past: [],
    present: createInitialState(),
    future: [],
  }));

  const setState = useCallback((update: (current: T) => T) => {
    setHistory((current) => {
      const next = update(current.present);

      if (Object.is(next, current.present)) {
        return current;
      }

      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1);

      if (previous === undefined) {
        return current;
      }

      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const next = current.future[0];

      if (next === undefined) {
        return current;
      }

      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1),
      };
    });
  }, []);

  return {
    state: history.present,
    setState,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
