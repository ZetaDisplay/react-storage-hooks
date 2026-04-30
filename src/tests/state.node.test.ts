/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';

import { useStorageState } from '..';
import { storageLikeObject } from './utils';

it('returns default state', () => {
  const { result } = renderHook(() =>
    useStorageState(storageLikeObject, 'key', { value: 0 }),
  );

  const [state] = result.current;
  expect(state).toStrictEqual({ value: 0 });
});

it('returns default state (lazy initialization)', () => {
  const { result } = renderHook(() =>
    useStorageState(storageLikeObject, 'key', () => ({ value: 0 })),
  );

  const [state] = result.current;
  expect(state).toStrictEqual({ value: 0 });
});

it('returns default state when storage is undefined', () => {
  const { result } = renderHook(() =>
    useStorageState(undefined as unknown as Storage, 'key', { value: 0 }),
  );

  const [state] = result.current;
  expect(state).toStrictEqual({ value: 0 });
});

it('returns default state when storage has no getItem method', () => {
  const invalidStorage = { setItem: () => {}, removeItem: () => {} };

  const { result } = renderHook(() =>
    useStorageState(invalidStorage as unknown as Storage, 'key', { value: 0 }),
  );

  const [state] = result.current;
  expect(state).toStrictEqual({ value: 0 });
});

it('handles null state with undefined storage without error', () => {
  const { result } = renderHook(() =>
    useStorageState<{ value: number } | null>(
      undefined as unknown as Storage,
      'key',
      { value: 0 },
    ),
  );

  const [, setState] = result.current;
  act(() => setState(null));

  // Should not throw - noopStorage handles it
  expect(result.current[2]).toBeUndefined();
});
