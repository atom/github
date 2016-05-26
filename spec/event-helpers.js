'use babel'

const buildMouseEvent = function (type, ...propertiesObjects) {
  let properties = Object.assign({
    bubbles: true,
    cancelable: true
  }, ...propertiesObjects)

  if (properties.detail == null) {
    properties.detail = 1
  }

  let event = new MouseEvent(type, properties)
  if (properties.which != null) {
    Object.defineProperty(event, 'which', {
      get: function () {
        return properties.which
      }
    })
  }
  if (properties.target != null) {
    Object.defineProperty(event, 'target', {
      get: function () {
        return properties.target
      }
    })
    Object.defineProperty(event, 'srcObject', {
      get: function () {
        return properties.target
      }
    })
  }
  return event
}

const buildClickEvent = function (target) {
  return buildMouseEvent('click', {
    target: target
  })
}

export { buildClickEvent }
