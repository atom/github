'use babel'

/*
Public: Wrapper around window.fetch that writes JSON results into an indexedDB
store, returning results from cache when they exist and making requests as
necessary.
*/

import URL from 'url'

import ObjectHash from 'object-hash'
import ParseLink from 'parse-link-header'

import GitHubAuth from './github/auth/github-auth.js'

import {Emitter} from 'atom'

const FETCH_DEFAULTS = {
  method: 'get',
  headers: {
    Accept: 'application/vnd.github.v3+json'
  }
}
// TODO: Talk to API team about reasonable limits
const MAX_AGE = atom.config.get('github.maxCacheAge') || 1000 * 60 * 10 // Refresh cached items every TBD minutes
const DB_NAME = 'atom-github-cached-request'
const OBJECT_STORE_NAME = 'cached-requests'

const nextPage = function (responseObject) {
  const linkHeader = responseObject.headers.get('Link')
  if (!linkHeader) {
    return
  }

  const link = ParseLink(linkHeader)
  return link.next ? link.next.url : null
}

let baseOptions = {
  baseURL: 'https://api.github.com',
  fetchDefaults: FETCH_DEFAULTS,
  cacheVersion: '2'
}

export default class CachedRequest {
  /*
  This currently crashes in CLI tests, because indexedDB has its location set
  to the same value in test as well as in normal use. @kuychaco put it on her
  list to fix that, if she doesn't get to it during her FR week, follow up
  with her for context and fix it yourself, daniel
  */
  constructor (options = {}) {
    this.resetAuthentication()
    this.emitter = new Emitter()
    this.options = Object.assign(baseOptions, options)
    this.dbPromise = new Promise(resolve => {
      let dbOpenRequest = window.indexedDB.open(DB_NAME, this.options.cacheVersion)
      dbOpenRequest.onupgradeneeded = (event) => {
        let db = event.target.result
        db.createObjectStore(OBJECT_STORE_NAME, { keyPath: '_requestURL' })
      }
      dbOpenRequest.onsuccess = () => {
        resolve(dbOpenRequest.result)
      }
      dbOpenRequest.onerror = (error) => {
        console.error('Could not connect to indexedDB', error)
        resolve(null)
      }
    }).catch(error => {
      console.error('Error caught in indexedDB connection promise', error)
    })
  }

  resetAuthentication () {
    /*
    TODO: This GitHub-specific stuff should be parameterized, since the rest of the
    class is written to be used with any endpoint... or is that impractical?
    */
    const Auth = new GitHubAuth()
    const token = Auth.getToken()
    if (token) {
      console.log('Setting up authenticated CachedRequest instance')
      baseOptions.fetchDefaults.headers['Authorization'] = `token ${token.trim()}`
    } else {
      console.log('Setting up UNAUTHENTICATED CachedRequest instance')
      delete baseOptions.fetchDefaults.headers['Authorization']
    }
  }

  async write (key, record, timestamp) {
    record._requestURL = key // The key is the requesturl and an md5 of the options hash
    record._timestamp = timestamp === undefined ? Date.now() : timestamp
    const db = await this.dbPromise
    return await new Promise((resolve, reject) => {
      const request = db.transaction([OBJECT_STORE_NAME], 'readwrite')
        .objectStore(OBJECT_STORE_NAME)
        .put(record)
      request.onsuccess = resolve
      request.onerror = reject
    })
  }

  async read (key) {
    const db = await this.dbPromise
    return await new Promise((resolve, reject) => {
      const request = db.transaction([OBJECT_STORE_NAME], 'readonly')
        .objectStore(OBJECT_STORE_NAME)
        .get(key)
      request.onsuccess = (event) => {
        resolve(event.target.result || null)
      }
      request.onerror = reject
    })
  }

  async delete (key) {
    const db = await this.dbPromise
    return await new Promise((resolve, reject) => {
      const request = db.transaction([OBJECT_STORE_NAME], 'readwrite')
        .objectStore(OBJECT_STORE_NAME)
        .delete(key)
      request.onsuccess = (event) => {
        resolve(event.target.result || null)
      }
      request.onerror = reject
    })
  }

  async clear () {
    const db = await this.dbPromise
    return await new Promise((resolve, reject) => {
      const request = db.transaction([OBJECT_STORE_NAME], 'readwrite')
        .objectStore(OBJECT_STORE_NAME)
        .clear()
      request.onsuccess = (event) => resolve(true)
      request.onerror = reject
    })
  }

  cacheKey (key, obj) {
    return `${key}-${ObjectHash.MD5(obj)}`
  }

  expirePath (requestPath) {
    // This doesn't take options because it expires all pages
    return this.expire(URL.resolve(this.options.baseURL, requestPath))
  }

  async expire (URLFragment) {
    const db = await this.dbPromise
    const expired = await new Promise((resolve, reject) => {
      const returnValue = []
      db.transaction([OBJECT_STORE_NAME], 'readwrite')
        .objectStore(OBJECT_STORE_NAME)
        .openCursor(
          IDBKeyRange.bound(URLFragment, URLFragment + '\uffff'),
          'prev')
        .onsuccess = function (event) {
          const cursor = event.target.result
          if (cursor) {
            const val = cursor.value
            val._timestamp = 0
            cursor.update(val)
            returnValue.push(cursor.value)
            cursor.continue()
          } else {
            resolve(returnValue)
          }
        }
    })
    return expired
  }

  isExpired (data, maxAge = MAX_AGE) {
    return !!(!data || !data._timestamp || (Date.now() - data._timestamp > maxAge))
  }

  async connectedToDB () {
    return await !!this.dbPromise
  }

  paginatedRequest (requestPath, options = {}) {
    return new Promise((resolve, reject) => {
      let returnValue
      const fetchNextPage = (res) => {
        returnValue = returnValue ? returnValue.concat(res.data) : returnValue

        let nextPageToFetch
        if (res && res.hasOwnProperty('_next')) { // This response came from the cache!
          nextPageToFetch = res._next
        } else if (res && res.hasOwnProperty('response')) { // It came from window.fetch!
          // res can be null from ::request if the endpoint returns non-success
          nextPageToFetch = nextPage(res.response)
        } else {
          if (res) { // This will be null if the previous request 404ed, etc. If
                     // it's not null and we still fell through to here, ¯\_(ツ)_/¯
            console.log('Something has gone interestingly wrong with fetching cached paginated requests. Here is the offending record:', res)
          }
        }

        if (nextPageToFetch) {
          requestPromises.push(this.request(nextPageToFetch, options).then(fetchNextPage))
        } else {
          Promise.all(requestPromises).then((allData) => { resolve(Array.prototype.concat.apply([], allData)) })
        }
        return res ? res.data : res
      }
      const requestPromises = [this.request(requestPath, options).then(fetchNextPage)]
    })
  }

  async request (requestPath, _fetchOptions = {}, _options = {}) {
    const options = Object.assign({skipCache: false, maxAge: MAX_AGE, shouldThrow: false}, _options)
    const fetchOptions = Object.assign({}, this.options.fetchDefaults, _fetchOptions)
    const requestURL = URL.resolve(this.options.baseURL, requestPath)
    const cacheKey = this.cacheKey(requestURL, fetchOptions)
    const readData = options.skipCache ? null : await this.read(cacheKey)
    const cachedData = readData ? readData.data : null

    if (requestPath.startsWith(this.baseURL)) {
      requestPath = requestPath.replace(this.baseURL, '')
    }

    // Short circuit if we have unexpired cache data!
    if (!this.isExpired(readData, options.maxAge)) { return readData }

    let record, response
    try {
      response = await window.fetch(requestURL, fetchOptions)
      if (response.status < 400) {
        record = { data: await response.json() }
        record._next = nextPage(response)
        this.write(cacheKey, record).catch((error) => {
          console.error(`Failed to write result for ${requestURL} to cache`, error)
        })
      } else {
        // If this was an authenticated request that failed, it means that we are
        // storing/sending an invalid token. Callers want to know this so they
        // can do things like invalidate tokens or attempt login again.
        if (response.status === 401 && fetchOptions.headers.Authorization) {
          this.didFailAuthentication()
        }
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      if (options.shouldThrow) {
        throw error
      } else {
        return readData
      }
    }
    return {
      data: record.data || cachedData,
      response: response
    }
  }

  async requestDiff (url) {
    const fetchDefaults = {
      ...this.options.fetchDefaults,
      headers: {
        ...this.options.fetchDefaults.headers,
        Accept: 'application/vnd.github.v3.diff'
      }
    }

    const response = await window.fetch(url, fetchDefaults)
    const data = await response.text()
    return data
  }

  /*
    Public: Invoke the given callback when a request that includes an `Authorization`
    header returns `401 Unauthorized`

    * `callback` A {Function} to be invoked when auth fails
    * `package` The {Package} that was loaded.

    Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  */
  onDidFailAuthentication (callback) {
    return this.emitter.on('did-fail-authentication', callback)
  }

  didFailAuthentication () {
    this.emitter.emit('did-fail-authentication')
  }

}
