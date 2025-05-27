const proxiedMap = new WeakMap()

export default function proxyData(data, parentPath = '') {
  if (!isObj(data)) return data

  if (proxiedMap.has(data)) {
    return proxiedMap.get(data)
  }
  
  const handle = {
    get: (target, key) => {
      key = typeof key === 'symbol' ? key.description : key
      if (key === 'Symbol.unscopables') return

      const fullKey = parentPath ? `${parentPath}.${key}` : key
      const topLevelKey = fullKey.split('.')[0]

      if (this.isInitObs) {
        if (!this.depComp.has(topLevelKey)) {
          this.depComp.set(topLevelKey, [{
            data: this.currCompData,
            fn: this.currCompFn
          }])
        } else {
          this.depComp.get(topLevelKey).push(this.currCompData)
        }
      }

      if (!this.isInitObs) {
        // 防止记录下数组或者对象的索引、属性
        // 当 !parentPath 是可以认为是第一层对象
        if (this.currRecordPath && !parentPath) {
          this.dep(key, this.currRecordType, this.parseRes, this.template, this.keyName)
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
        if (!this.isInitObs) {
          if (this.depMap.has(topLevelKey)) {
            this.pendingupdateData.add(topLevelKey)
          }

          if (this.depComp.has(topLevelKey)) {
            this.depComp.get(topLevelKey).forEach(x => {
              if (this.depMap.has(x.data)) {
                this.data[x.data] = x.fn.call(this, this.data)
                this.pendingupdateData.add(x.data)
              }
            })
          }

          Promise.resolve().then(() => {
            this.update(this.pendingupdateData)
          })
        }

        if (typeof value === 'object') {
          proxyData.call(this, value, fullKey)
        }
      }
      return true
    }
  }

  // 递归处理子属性
  for (let key in data) {
    if (typeof data[key] === 'object') {
      const childPath = parentPath ? `${parentPath}.${key}` : key
      data[key] = proxyData.call(this, data[key], childPath)
    }
  }

    const proxy = new Proxy(data, handle)

  proxiedMap.set(data, proxy)

  return proxy
}

function isObj(target) {
  return (typeof target === 'object' && target !== null)
}
