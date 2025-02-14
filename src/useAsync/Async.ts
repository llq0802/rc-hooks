import { DebouncedFunc } from 'lodash';
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
import { isDocumentVisible } from '../utils';
import { getCache, setCache } from '../utils/cache';
import limit from '../utils/limit';
import subscribeVisible from '../utils/windowVisible';
import subscribeFocus from '../utils/windowFocus';

// 注意区分两种情况：
// 同一个实例的run执行多次，只运行最后一次？通过内部的counter
// 不同实例的run各执行一次，只运行一次异步，同时执行所有实例的成功回调？通过传入相同的cacheKey

// Promise 缓存
const promiseCache: {
  [key: string]: Promise<any> | undefined;
} = {};

// 运行异步方法 ，支持缓存 Promise
// 处理多个 key 的 Promise ，只执行第一个，返回Promise
const runAsyncCache = <T extends ((...args: any[]) => Promise<any>) = (() => Promise<any>)>(async: T, key?: string) => {
  // 如果有缓存，标识有相同key的异步正在请求中
  if (key && promiseCache[key]) {
    return promiseCache[key] as ReturnType<T>;
  }

  if (key) {
    promiseCache[key] = async()
      .then((res) => {
        delete promiseCache[key];
        return res;
      })
      .catch((err) => {
        delete promiseCache[key];
        return Promise.reject(err);
      });

    return promiseCache[key] as ReturnType<T>;
  }

  return async() as ReturnType<T>;
};

type InternalOptions<R = any, P extends any[] = any[]> = {
  cacheKey?: string;
  cacheTime: number;
  persisted: boolean;
  formatResult?: (res: any, params: P) => R;
  onSuccess?: (res: R, params: P) => void;
  onError?: (err: Error, params: P) => void;
  onFinally?: () => void;
  onBefore?: (params: P) => void;
  debounceInterval?: number;
  throttleInterval?: number;
  pollingInterval?: number;
  pollingWhenHidden: boolean;
  refreshOnWindowFocus: boolean;
  focusTimespan: number;
};

export type Options<R = any, P extends any[] = any[]> = Partial<InternalOptions<R, P>>;

export type AsyncFunction<R = any, P extends any[] = any[]> = (...args: P) => Promise<R>;

class Async<R = any, P extends any[] = any[]> {
  private async: AsyncFunction<R, P>;
  private debounce: DebouncedFunc<AsyncFunction<R, P>> | undefined;
  private throttle: DebouncedFunc<AsyncFunction<R, P>> | undefined;
  private unsubscribes: (() => void)[];
  private options: InternalOptions<R, P>;

  constructor(async: AsyncFunction<R, P>, options: Options<R, P>) {
    this.async = async;
    this.options = {
      cacheTime: 5 * 60 * 1000,
      persisted: false,
      pollingWhenHidden: true,
      refreshOnWindowFocus: false,
      focusTimespan: 5000,
      ...options
    };

    // 取消订阅列表
    this.unsubscribes = [];

    this.init();
  }

  // 初始化
  private init() {
    const { pollingInterval, refreshOnWindowFocus, focusTimespan } = this.options;

    // 延迟执行
    this.updateDebounce();

    // 订阅页面显示时触发轮询
    if (pollingInterval) {
      this.unsubscribes.push(subscribeVisible(this.rePolling.bind(this)));
    }

    // 订阅屏幕聚焦时请求
    if (refreshOnWindowFocus) {
      const limitRefresh = limit(this.refresh.bind(this), focusTimespan);
      this.unsubscribes.push(subscribeFocus(limitRefresh));
    }
  }

  // 内部缓存参数
  private params: any = [];

  // 更新延迟执行
  private updateDebounce() {
    const { debounceInterval, throttleInterval } = this.options;
    this.debounce =
      typeof debounceInterval === 'number' && debounceInterval > 0
        ? debounce(this._run, debounceInterval)
        : undefined;
    this.throttle =
      typeof throttleInterval === 'number' && throttleInterval > 0
        ? throttle(this._run, throttleInterval)
        : undefined;
  }

  // 标识页面获取焦点时是否触发轮询
  private pollingWhenVisibleFlag = false;

  // 轮询定时器
  private pollingTimer: any = null;

  // 轮询
  private rePolling() {
    if (this.pollingWhenVisibleFlag) {
      this.pollingWhenVisibleFlag = false;
      this.refresh();
    }
  }

  // 内部标记当前执行计数，防止同一个实例执行多次run 或 不执行取消后的run
  private counter = 1;

  private afterUpdateOptions(prevOptions: Options<R, P>, nextOptions: Partial<Options<R, P>> = {}) {
    // 可能取消延迟
    if (
      ('debounceInterval' in nextOptions &&
        nextOptions.debounceInterval !== prevOptions.debounceInterval) ||
      ('throttleInterval' in nextOptions &&
        nextOptions.throttleInterval !== prevOptions.throttleInterval)
    ) {
      this.updateDebounce();
    }
  }

  // 更新配置
  updateOptions(options: Partial<Options<R, P>>) {
    const prevOptions = this.options;
    const nextOptions = {
      ...this.options,
      ...options
    };
    this.options = nextOptions;
    this.afterUpdateOptions(prevOptions, nextOptions);
  }

  // 发起请求
  // 不返回Promise，只支持 onSuccess 或 onError 回调处理，避免多个实例同时调用 run 导致部分 Promise 没有触发问题
  private _run(...args: P) {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
    }

    // 防止执行取消的异步结果
    // 触发多次run，只有执行最后一次异步结果
    const count = this.counter;
    this.params = args;
    const {
      cacheKey,
      cacheTime,
      persisted,
      formatResult,
      onSuccess,
      onError,
      onFinally,
      onBefore,
      pollingWhenHidden,
      pollingInterval
    } = this.options;

    onBefore?.(args);

    return new Promise<R>((resolve, reject) => {
      if (cacheKey && persisted) {
        // 持久化数据
        const cacheData = getCache<R>(cacheKey);
        // 有缓存数据
        if (cacheData && count === this.counter) {
          Promise.resolve().then(() => {
            onSuccess?.(cacheData, args);
            resolve(cacheData);
          }).finally(() => {
            onFinally?.();
          });
          return;
        }
      }

      // 没有持久化的缓存数据，如果有缓存key将共享异步返回的Promise
      runAsyncCache(() => this.async(...args), cacheKey)
        .then((res) => {
          if (count === this.counter) {
            const fmtRes = typeof formatResult === 'function' ? formatResult(res, args) : res;
            if (cacheKey) {
              setCache(cacheKey, fmtRes, cacheTime);
            }
            onSuccess?.(fmtRes, args);
            resolve(fmtRes);
          }
        })
        .catch((err) => {
          if (count === this.counter) {
            onError?.(err, args);
            reject(err);
          }
        })
        .finally(() => {
          if (count === this.counter) {
            onFinally?.();

            if (pollingInterval) {
              if (!isDocumentVisible() && !pollingWhenHidden) {
                this.pollingWhenVisibleFlag = true;
                return;
              }
              this.pollingTimer = setTimeout(() => {
                this.run(...args);
              }, pollingInterval);
            }
          }
        });
    });
  }

  // 执行异步
  run(...args: P) {
    if (this.debounce) {
      this.debounce(...args);
      return Promise.resolve(null);
    }
    if (this.throttle) {
      this.throttle(...args);
      return Promise.resolve(null);
    }

    this.counter += 1;
    return this._run(...args);
  }

  // 使用之前参数，重新执行异步
  refresh() {
    return this.run(...this.params);
  }

  // 取消请求
  cancel() {
    if (this.debounce) {
      this.debounce.cancel();
    }

    if (this.throttle) {
      this.throttle.cancel();
    }

    // 取消轮询定时器
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }

    this.counter += 1;
  }

  // 标识是否销毁
  private destroyed = false;

  // 销毁
  destroy(needCancel = true) {
    if (needCancel) {
      this.cancel();
    }

    if (!this.destroyed) {
      this.destroyed = true;
      this.unsubscribes.forEach((s) => s());
      this.unsubscribes = [];
    }
  }

  // 恢复
  resume() {
    if (this.destroyed) {
      this.destroyed = false;
      this.init();
    }
  }
}

export default Async;
