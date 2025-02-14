import { renderHook, act } from '@testing-library/react';
import useIsMounted from '..';

describe('useIsMounted', () => {
  it('work', () => {
    const { unmount, result } = renderHook(() => {
      const isMounted = useIsMounted();
      return {
        isMounted
      };
    });

    expect(result.current.isMounted.current).toBe(true);

    act(() => {
      unmount();
    });
    expect(result.current.isMounted.current).toBe(false);
  });
});
