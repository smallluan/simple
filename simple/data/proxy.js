let p = null
export default function proxyData(page, data, parentPath = '') {
  if (!p) p = page
  if (typeof data !== 'object' || data === null) {
    return data
  }

  // 为当前对象创建路径信息
  const proxy = new Proxy(data, {
    get: (target, key, receiver) => {
      key = typeof key === 'symbol' ? key.description : key
      if (key === 'Symbol.unscopables') return

      const fullKey = parentPath ? `${parentPath}.${key}` : key
      const topLevelKey = fullKey.split('.')[0]

      if (p.isInitObs) {
        if (!p.depComp.has(topLevelKey)) {
          p.depComp.set(topLevelKey, [{
            data: p.currCompData,
            fn: p.currCompFn
          }])
        } else {
          p.depComp.get(topLevelKey).push(p.currCompData)
        }
      }

      if (!p.isInitObs) {
        // 防止记录下数组或者对象的索引、属性
        // 当 !parentPath 是可以认为是第一层对象
        if (p.currRecordPath && !parentPath) {
          p.dep(key, p.currRecordType, p.parseRes, p.template, p.keyName)
        }
      }

      return target[key]
    },

    set: (target, key, value) => {
      if (target[key] !== value) {
        key = typeof key === 'symbol' ? key.description : key

        const fullKey = parentPath ? `${parentPath}.${key}` : key
        const topLevelKey = fullKey.split('.')[0]

        target[key] = value

        if (!p.isInitObs) {
          if (p.depMap.has(topLevelKey)) {
            p.pendingupdateData.add(topLevelKey)
          }

          if (p.depComp.has(topLevelKey)) {
            p.depComp.get(topLevelKey).forEach(x => {
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
          proxyData(p, value, fullKey)
        }
      }
      return true
    }
  })

  // 递归处理子属性
  for (let key in data) {
    if (typeof data[key] === 'object') {
      const childPath = parentPath ? `${parentPath}.${key}` : key
      proxy[key] = proxyData(page, data[key], childPath)
    }
  }

  return proxy
}