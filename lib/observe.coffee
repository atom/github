module.exports = (observed, keys, callback) ->
    Object.observe observed, (changes) =>
      for change in changes
        if change.name in keys
          callback()
          break
