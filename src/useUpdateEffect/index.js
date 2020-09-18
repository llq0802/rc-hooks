import { useEffect, useRef } from 'react';

const useUpdateEffect = (fn, deps = []) => {
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
    } else {
      return fn();
    }
  }, deps);
};

export default useUpdateEffect;