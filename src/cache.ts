import { Lock } from 'lock'

type BuildCacheOptions<T> = {
  maxAge?: number | ((value: T) => number)
}

const safeMaxAge = <T> (maxAge: BuildCacheOptions<T>['maxAge']) => (
  maxAge == null
    ? () => 0
    : (typeof maxAge === 'number'
      ? () => maxAge
      : maxAge
    )
)

const safeGetValue = <T> (getValue: GetValue<T>): () => Promise<T> => (
  async (): Promise<T> => await getValue()
)

const isAlive = <T> (value: T | null, expiration: number | null): value is T => (
  value != null &&
  expiration != null &&
  expiration - Date.now() > 0
)

type Cache<T> = {
  (): Promise<T>
  reset: () => void
}

type GetValue<T> = () => T | Promise<T>

const buildCache = <GT extends GetValue<any>, T extends Awaited<ReturnType<GT>>> (getValue: GT, options?: BuildCacheOptions<T>): Cache<T> => {
  const lock = Lock()

  const _getMaxAge = safeMaxAge(options?.maxAge)
  const _getValue = safeGetValue<T>(getValue)

  let cachedValue: T | null = null
  let cacheExpiration: number | null = null

  const cache = async (): Promise<T> => {
    if (isAlive(cachedValue, cacheExpiration)) {
      return Promise.resolve(cachedValue)
    }

    // Get a new value and prevent concurrent request.
    return new Promise(async (resolve, reject) => {
      lock('cache', async (unlockFn) => {
        const unlock = unlockFn()

        // Value was already loaded by the previous lock.
        if (isAlive(cachedValue, cacheExpiration)) {
          unlock()
          return resolve(cachedValue)
        }

        // Get the value.
        try {
          const value = await _getValue()
          cachedValue = value
          cacheExpiration = Date.now() + _getMaxAge(value)
          unlock()
          return resolve(value)
        } catch (err) {
          unlock()
          return reject(err)
        }
      })
    })
  }

  cache.reset = () => {
    cachedValue = null
    cacheExpiration = null
  }

  return cache
}

type CacheBuilder<GT extends GetValue<any>, T extends Awaited<ReturnType<GT>>> = typeof buildCache<GT, T>

export type {
  Cache,
  CacheBuilder,
  GetValue,
  BuildCacheOptions
}

export { buildCache }
export default buildCache
