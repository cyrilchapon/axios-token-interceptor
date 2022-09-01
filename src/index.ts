import { GetValue } from './cache'
import type { AxiosRequestConfig } from 'axios'

type GetToken<T> = GetValue<T>

type TokenInterceptorOptions<T> = {
  token: T | GetToken<T>
  header?: (token: T) => [string, string]
}

const safeGetToken = <T> (token: TokenInterceptorOptions<T>['token']): () => Promise<T> => (
  async (): Promise<T> => (
    typeof token === 'function'
      ? await (token as GetToken<T>)()
      : Promise.resolve(token)
  )
)

const tokenInterceptor = <T> (options: TokenInterceptorOptions<T>) => {
  const _getToken = safeGetToken(options.token)
  const _header = options.header ?? ((token) => (['Authorization', `Bearer ${token}`]))

  const interceptRequest = async (config: AxiosRequestConfig): Promise<AxiosRequestConfig> => {
    const token = await _getToken()
    const [headerName, headerVal] = _header(token)

    const newConfig = {
      ...config,
      headers: {
        ...config.headers,
        [headerName]: headerVal
      }
    }

    return newConfig
  }

  return interceptRequest
}

type TokenInterceptor<T> = typeof tokenInterceptor<T>

export type {
  TokenInterceptor,
  TokenInterceptorOptions,
  GetToken
}

export {
  tokenInterceptor,
}

export {
  buildCache as tokenCache
} from './cache'

export type {
  Cache,
  CacheBuilder,
  BuildCacheOptions,
  GetValue
} from './cache'
