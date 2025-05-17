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
    // console.log(`正在取值${key}`)
    if (p.isInitObs) {
      if (!p.depComp.has(key)) {
        p.depComp.set(key, [{
          data: p.currObsData,
          fn: p.currObsFn
        }])
      } else {
        p.depComp.get(key).push(p.currObsData)
      }
    }
    if (!p.isInitObs) {
      if (p.currRecordPath) {
        p.dep(key, p.currRecordType, p.parseRes, p.template, p.keyName)
      }
    }
    return target[key]
  },
  set: (target, key, value) => {
    if (target[key] !== value) {
      key = typeof key === 'symbol' ? key.description : key
      // console.log(`正在赋值【${key}】，值为${value}`)
      target[key] = value
      if (!p.isInitObs) {
        if (p.depMap.has(key)) {
          p.pendingupdateData.add(key)
        }
        if (p.depComp.has(key)) {
          p.depComp.get(key).forEach(x => {
            if (p.depMap.has(x.data)) {
              p.data[x.data] = x.fn.call(p, p.data)
              p.pendingupdateData.add(x.data)
            }
          })
        }
        Promise.resolve().then(() => {
          p.update(p.pendingupdateData)
        })
      }
      if (typeof value === 'object') {
        proxyData(p, value)
      }
    }
    return true
  }
}
