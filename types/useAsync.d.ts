type AsyncFn = (...args: any) => Promise;

type Params = any[];
type FormatResultReturn = any;

interface AsyncParams {
  autoRun?: boolean;
  initialData?: any;
  defaultParams?: any;
  formatResult?: (data: any) => FormatResultReturn;
  onSuccess?: (data: any, params?: Params) => void;
  onError?: (error: any, params?: Params) => void;
  cacheKey?: string;
  cacheTime?: number;
  loadingDelay?: number;
  pollingInterval?: number;
  refreshOnWindowFocus?: boolean;
  focusTimespan?: number;
  debounceInterval?: number;
  throttleInterval?: number;
}

type NewData = any;
type MutateParamMethod = (oldData: any) => NewData;
type MutateParams = NewData | MutateParamMethod;

interface AsyncResult {
  data: any;
  error: any;
  loading: boolean;
  params: any[];
  run: (...args: any) => Promise;
  cancel: () => void;
  refresh: () => Promise;
  mutate: (MutateParams) => void;
}

declare const useAsync: (asyncFn: AsyncFn, options?: AsyncParams) => AsyncResult;

export default useAsync;
