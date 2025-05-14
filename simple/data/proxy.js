let p = null
export default function proxyData (page, data) {
  if (!p) p = page
  if (typeof data !== 'object' || data === null) {
    return data
  }
  const proxy = new Proxy(data, handler)
  for (let key in data) {
    if (typeof data[key] === 'object') {
      proxy[key] = proxyData(page, data[key])
    }
  }
  return proxy
}

const handler = {
  get: (target, key, receiver) => {
    key = typeof key === 'symbol' ? key.description: key
    if (key === 'Symbol.unscopables') return
    if (p.currRecordPath) {
      p.dep(key)
    }
    return target[key]
  },
  set: (target, key, value) => {
    if (target[key] !== value) {
      key = typeof key === 'symbol' ? key.description : key
      target[key] = value
      if (typeof value === 'object') {
        proxyData(page, value)
      }
    }
    return true
  }
}
