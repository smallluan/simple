import depMap from './dep'
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
      p.dep(key, p.currRecordType, p.currRecordValue)
    }
    return target[key]
  },
  set: (target, key, value) => {
    if (target[key] !== value) {
      key = typeof key === 'symbol' ? key.description : key
      console.log(`正在赋值【${key}】，值为${value}`)
      target[key] = value
      depMap(p, p.ast)
      p.render()  // 全量更新
      if (typeof value === 'object') {
        proxyData(page, value)
      }
    }
    return true
  }
}
