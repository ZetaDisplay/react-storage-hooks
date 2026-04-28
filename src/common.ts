import { useState, useEffect, useRef, useMemo } from 'react';

export type StorageObj = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Provide a fallback for storage in environments where it is not available (server-side rendering).
 */
const getSafeStorage = (storage: StorageObj | undefined): StorageObj => {
  const noopStorage: StorageObj = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };

  return storage && typeof storage.getItem === 'function'
    ? storage
    : noopStorage;
};

function fromStorage<T>(value: string | null) {
  return value !== null ? (JSON.parse(value) as T) : null;
}

function readItem<T>(storage: StorageObj, key: string) {
  try {
    const storedValue = storage.getItem(key);
    return fromStorage<T>(storedValue);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return null;
  }
}

function toStorage<T>(value: T | null) {
  return JSON.stringify(value);
}

function writeItem<T>(storage: StorageObj, key: string, value: T | null) {
  try {
    if (value !== null) {
      storage.setItem(key, toStorage<T>(value));
    } else {
      storage.removeItem(key);
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
}

export function useInitialState<S>(
  storage: StorageObj,
  key: string,
  defaultState: S,
) {
  const defaultStateRef = useRef(defaultState);

  const safeStorage = getSafeStorage(storage);

  return useMemo(
    () => readItem<S>(safeStorage, key) ?? defaultStateRef.current,
    [key, safeStorage],
  );
}

export function useStorageWriter<S>(
  storage: StorageObj,
  key: string,
  state: S,
) {
  const [writeError, setWriteError] = useState<Error | undefined>(undefined);

  const safeStorage = getSafeStorage(storage);

  useEffect(() => {
    writeItem<S>(safeStorage, key, state).catch((error) => {
      if (!error || !error.message || error.message !== writeError?.message) {
        setWriteError(error);
      }
    });

    if (writeError) {
      return () => {
        setWriteError(undefined);
      };
    }
  }, [state, key, writeError, storage, safeStorage]);

  return writeError;
}

export function useStorageListener<S>(
  storage: StorageObj,
  key: string,
  defaultState: S,
  onChange: (newValue: S) => void,
) {
  const defaultStateRef = useRef(defaultState);
  const onChangeRef = useRef(onChange);

  const safeStorage = getSafeStorage(storage);

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    onChangeRef.current(
      readItem<S>(safeStorage, key) ?? defaultStateRef.current,
    );
  }, [key, safeStorage, storage]);

  useEffect(() => {
    function onStorageChange(event: StorageEvent) {
      if (event.key === key) {
        onChangeRef.current(
          fromStorage<S>(event.newValue) ?? defaultStateRef.current,
        );
      }
    }

    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener !== 'undefined'
    ) {
      window.addEventListener('storage', onStorageChange);
      return () => {
        window.removeEventListener('storage', onStorageChange);
      };
    }
  }, [key]);
}
