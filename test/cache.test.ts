import { delay } from './util'
import { buildCache } from '../src/cache'

describe('cache', () => {
  test('should use the maxAge setting', async () => {
    const getValue = jest
      .fn()
      .mockReturnValueOnce(Promise.resolve('value1'))
      .mockReturnValueOnce(Promise.resolve('value2'))

    const cache = buildCache(getValue, {
      maxAge: 100
    })

    let value = await cache()
    expect(value).toEqual('value1')

    await delay(50)

    value = await cache()
    expect(value).toEqual('value1')

    await delay(100)

    value = await cache()
    expect(value).toEqual('value2')
  })

  test('should use the maxAge setting', async () => {
    const getValue = jest
      .fn()
      .mockReturnValueOnce(
        Promise.resolve({ underlying_value: 'value1', expiration: 2000 })
      )
      .mockReturnValueOnce(
        Promise.resolve({ underlying_value: 'value2', expiration: 5000 })
      )

    const cache = buildCache(getValue, {
      maxAge: (value) => value.expiration
    })

    let value = await cache()
    expect(value.underlying_value).toEqual('value1')

    await delay(1000)

    value = await cache()
    expect(value.underlying_value).toEqual('value1')

    await delay(2000)

    value = await cache()
    expect(value.underlying_value).toEqual('value2')
  })

  test('should support reset', async () => {
    const getValue = jest
      .fn()
      .mockReturnValueOnce(
        Promise.resolve({ underlying_value: 'value1', expiration: 5000 })
      )
      .mockReturnValueOnce(
        Promise.resolve({ underlying_value: 'value2', expiration: 10000 })
      )

    const cache = buildCache(getValue, {
      maxAge: (value) => value.expiration
    })

    let value = await cache()
    expect(value.underlying_value).toEqual('value1')

    cache.reset()

    value = await cache()
    expect(value.underlying_value).toEqual('value2')
  })

  test('should not make concurrent calls for a cache miss', async () => {
    const getValue = jest
      .fn()
      .mockReturnValueOnce(
        delay(50).then(() => Promise.resolve('value1'))
      )
    const cache = buildCache(getValue, {
      maxAge: 100
    })

    const [value1, value2] = await Promise.all([cache(), cache()])

    expect(value1).toEqual('value1')
    expect(value2).toEqual('value1')
  })

  test('should handle errors correctly', async () => {
    const getValue = () => Promise.reject(new Error('unable to fetch value'))
    const cache = buildCache(getValue, {
      maxAge: 100
    })

    try {
      await cache()
      throw new Error('cache() fulfilled')
    } catch(err) {
      expect(err).toBeInstanceOf(Error)
      expect((err as Error).message).toEqual('unable to fetch value')
    }
  })
})
