'use babel'

import CachedRequest from '../lib/cached-request'

const TEST_PATH = '/test-path'
const BASE_URL = 'http://localhost'

describe('CachedRequest', () => {
  let client
  const key = `${BASE_URL}${TEST_PATH}`
  beforeEach(() => {
    window.fetch = jasmine.createSpy('fetch')
    client = new CachedRequest({
      baseURL: BASE_URL
    })
  })

  afterEach(() => {
    // these internal cache APIs take a full URL, but ::request() just takes a path.
    client.delete(`${BASE_URL}${TEST_PATH}`)
  })

  describe('::request', () => {
    it('does not hit the network if there is a cached item', () => {
      client.write(`${BASE_URL}${TEST_PATH}`, {data: {name: 'mona lisa'}})
      waitsForPromise(() => {
        return client.request(TEST_PATH)
      })
      expect(window.fetch).not.toHaveBeenCalled()
    })

    it('hits the network if there is a cached item but it is expired', () => {
      client.write(`${BASE_URL}${TEST_PATH}`, {data: {name: 'mona lisa'}}, Date.now() - (1000 * 60 * 60))
      window.fetch.andReturn(async () => {
        return { json: () => { return {name: 'hubot'} } }
      })
      waitsForPromise(() => {
        return client.request(TEST_PATH)
      })
      runs(() => {
        expect(window.fetch).toHaveBeenCalled()
      })
    })

    it('hits the network if there is no cached item', () => {
      window.fetch.andReturn(async () => {
        return { json: () => { return {name: 'hubot'} } }
      })
      waitsForPromise(() => {
        return client.request(TEST_PATH)
      })
      runs(() => {
        expect(window.fetch).toHaveBeenCalled()
      })
    })

    xit('paginates results', () => {

    })
  })

  describe('::expire', () => {
    it('expires but does not delete a record', async () => {
      const record = await client.write(key, { name: 'mona lisa' })
        .then(() => client.expire(key))
        .then(() => client.read(key))
      expect(record._timestamp).toBe(0)
    })

    it('does not crash if record does not exist', async () => {
      const records = await client.expire('some-nonsense-key')
      expect(records.length).toBe(0)
    })
  })
})
