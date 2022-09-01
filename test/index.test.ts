import nock from 'nock'
import axios from 'axios'

import { tokenInterceptor as interceptor, tokenCache } from '../src/index'
import { delay } from './util'

describe('axios-token-interceptor', () => {
  describe('tokens', () => {
    test('should support promises', async () => {
      const options = {
        token: () => Promise.resolve('abc')
      }

      const config = await interceptor(options)({ headers: {} })

      expect(config).toEqual({
        headers: {
          Authorization: 'Bearer abc'
        }
      })
    })

    test('should support strings', async () => {
      const options = {
        token: () => 'def'
      }

      const config = await interceptor(options)({ headers: {} })
      expect(config).toEqual({
        headers: {
          Authorization: 'Bearer def'
        }
      })
    })

    test('should support static tokens', async () => {
      const options = {
        token: 'my-token'
      }

      const config = await interceptor(options)({ headers: {} })
      expect(config).toEqual({
        headers: {
          Authorization: 'Bearer my-token'
        }
      })
    })

    test('should support the cache provider', async () => {
      const cache = tokenCache(() => Promise.resolve('abc'), {
        maxAge: 100
      })

      const options = {
        token: cache
      }

      const config = await interceptor(options)({ headers: {} })
      expect(config).toEqual({
        headers: {
          Authorization: 'Bearer abc'
        }
      })
    })
  })

  describe('header', () => {
    test('should set a custom header', async () => {
      const options = {
        header: (token: string) => (['X-Api-Key', `Bearer ${token}`] as [string, string]),
        token: () => Promise.resolve('abc')
      }

      const config = await interceptor(options)({ headers: {} })
      expect(config).toEqual({
        headers: {
          'X-Api-Key': 'Bearer abc'
        }
      })
    })
  })

  describe('cache', () => {
    test('should use the maxAge setting', async () => {
      const getToken = jest
        .fn()
        .mockReturnValueOnce(Promise.resolve('token1'))
        .mockReturnValueOnce(Promise.resolve('token2'))
      const options = {
        token: tokenCache(getToken, {
          maxAge: 100
        })
      }

      const intercept = interceptor(options)

      let config = await intercept({ headers: {} })
      expect(config).toEqual({
        headers: {
          Authorization: 'Bearer token1'
        }
      })

      await delay(50)

      config = await intercept({ headers: {} })
      expect(config).toEqual({
        headers: {
          Authorization: 'Bearer token1'
        }
      })

      await delay(50)

      config = await intercept({ headers: {} })
      expect(config).toEqual({
        headers: {
          Authorization: 'Bearer token2'
        }
      })
    })

    test('should use the getMaxAge setting', async () => {
      const getToken = jest
        .fn()
        .mockReturnValueOnce(
          Promise.resolve({ access_token: 'token1', expires_in: 50 })
        )
        .mockReturnValueOnce(
          Promise.resolve({ access_token: 'token2', expires_in: 100 })
        )

      const options = {
        header: (token: { access_token: string }) => (['Authorization', `Bearer ${token.access_token}`] as [string, string]),
        token: tokenCache(getToken, {
          maxAge: (token) => token.expires_in
        })
      }

      const intercept = interceptor(options)

      let config = await intercept({ headers: {} })
      expect(config).toEqual({
        headers: {
          Authorization: 'Bearer token1'
        }
      })

      await delay(20)

      config = await intercept({ headers: {} })
      expect(config).toEqual({
        headers: {
          Authorization: 'Bearer token1'
        }
      })

      await delay(40)

      config = await intercept({ headers: {} })
      expect(config).toEqual({
        headers: {
          Authorization: 'Bearer token2'
        }
      })
    })

    test('should support reset', async () => {
      const getToken = jest
        .fn()
        .mockReturnValueOnce(
          Promise.resolve({ access_token: 'token1', expires_in: 50 })
        )
        .mockReturnValueOnce(
          Promise.resolve({ access_token: 'token2', expires_in: 100 })
        )

      const cache = tokenCache(getToken, {
        maxAge: (token) => token.expires_in
      })
      const options = {
        header: (token: { access_token: string }) => (['Authorization', `Bearer ${token.access_token}`] as [string, string]),
        token: cache
      }

      const intercept = interceptor(options)

      let config = await intercept({ headers: {} })
      expect(config).toEqual({
        headers: {
          Authorization: 'Bearer token1'
        }
      })

      cache.reset()

      config = await intercept({ headers: {} })
      expect(config).toEqual({
        headers: {
          Authorization: 'Bearer token2'
        }
      })
    })

    test('should not make concurrent calls for a cache miss', async () => {
      const getToken = jest.fn().mockReturnValueOnce(Promise.resolve('token1'))

      const options = {
        token: tokenCache(getToken, {
          maxAge: 100
        })
      }

      const intercept = interceptor(options)

      const [
        config1,
        config2
      ] = await Promise.all([
        intercept({ headers: {} }),
        intercept({ headers: {} })
      ])

      expect(config1).toEqual({
        headers: {
          Authorization: 'Bearer token1'
        }
      })
      expect(config2).toEqual({
        headers: {
          Authorization: 'Bearer token1'
        }
      })
    })

    test('should handle errors correctly', async () => {
      const getToken = () => Promise.reject(new Error('unable to fetch token'))

      const options = {
        token: tokenCache(getToken, {
          maxAge: 100
        })
      }

      const intercept = interceptor(options)

      try {
        await intercept({ headers: {} })
        throw new Error('intercept() fulfilled')
      } catch(err) {
        expect(err).toBeInstanceOf(Error)
        expect((err as Error).message).toEqual('unable to fetch token')
      }
    })
  })

  describe('axios', () => {
    test('GET: should send the header to the api', async () => {
      const options = {
        token: () => Promise.resolve('abc')
      }

      const instance = axios.create({
        baseURL: 'https://api.example.com'
      })
      instance.interceptors.request.use(interceptor(options))

      const request = nock('https://api.example.com')
        .matchHeader('Authorization', 'Bearer abc')
        .get('/foo')
        .reply(200)

      await instance.get('/foo')

      expect(request.isDone()).toBeTruthy()
    })

    test('POST: should send the header to the api', async () => {
      const options = {
        token: () => Promise.resolve('abc')
      }

      const instance = axios.create({
        baseURL: 'https://api.example.com'
      })
      instance.interceptors.request.use(interceptor(options))

      const request = nock('https://api.example.com')
        .matchHeader('Authorization', 'Bearer abc')
        .post('/foo')
        .reply(200)

      await instance.post('/foo')

      expect(request.isDone()).toBeTruthy()
    })

    test('should handle token failures correctly', async () => {
      const options = {
        token: () => Promise.reject(new Error('unable to fetch token'))
      }

      const instance = axios.create({
        baseURL: 'https://api.example.com'
      })
      instance.interceptors.request.use(interceptor(options))

      try {
        await instance.get('/foo')
        throw new Error('instance.get() fulfilled')
      } catch(err) {
        expect(err).toBeInstanceOf(Error)
        expect((err as Error).message).toEqual('unable to fetch token')
      }
    })
  })
})
