module.exports = (observed, keys, callback) ->
  Object.observe observed, (changes) ->
    for change in changes
      if (change.name in keys) or (keys.length is 0)
        callback()
        break
    return true
