import { renderHook, act } from '@testing-library/react';
import useSafeState from '..';

describe('useSafeState', () => {
  const setUp = (initialState) =>
    renderHook(() => {
      const [state, setState] = useSafeState(initialState);

      return {
        state,
        setState
      };
    });

  it('initialState', () => {
    const { result } = setUp(0);

    expect(result.current.state).toBe(0);
  });

  it('update state', () => {
    const { result } = setUp(0);

    act(() => {
      result.current.setState(5);
    });

    expect(result.current.state).toBe(5);
  });

  it('not update when unmounted', () => {
    const { result, unmount } = setUp(0);

    unmount();
    act(() => {
      result.current.setState(5);
    });

    expect(result.current.state).toBe(0);
  });

  it('type', () => {
    const { result, unmount } = renderHook(() => {
      return useSafeState(0);
    });

    unmount();
    act(() => {
      result.current[1](5);
    });

    expect(result.current[0]).toBe(0);
  });
});
