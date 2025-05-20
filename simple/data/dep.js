const reg = /\{\{([^}]+)\}\}/g

export default function genDepMap (page, ast) {
  page.dep = dep
  let node = ast
  let queue = [...node.children]
  while (queue.length) {
    const currNode = queue.pop()
    const { text, path, attrs } = currNode
    page.currRecordPath = path

    if (text && reg.test(text)) {
      reg.lastIndex = 0;
      page.currRecordType = 'text'
      page.template = text
      page.keyName = null  // 文字不需要记录 keyName
      const parseRes = page.fetchData(page.data, text)  // 在这里无意义取值一次，后面要优化
    }
    if (attrs && attrs.length) {
      attrs.forEach(item => {
        if (reg.test(item.value)) {
          reg.lastIndex = 0
          page.currRecordType = 'attr'
          page.template = item.value
          page.keyName = item.name
          if (item.name.startsWith('@')) {
            let matchRes = reg.exec(item.value)
            reg.lastIndex = 0
            // 收集方法
            if (page.depFuncMap.has(path)) {
              page.depFuncMap.get(path).push({
                type: item.name.slice(1),
                func: matchRes[1].trim()
              })
            } else {
                page.depFuncMap.set(path, [{
                type: item.name.slice(1),
                func: matchRes[1].trim()
              }])
            }
          } else {
            const parseRes = page.fetchData(page.data, item.value)
          }
        }
      })
    }
    if (currNode.children?.length) {
      queue.push(...currNode.children)
    }
  }
}

function dep (key, type, value, template, keyName) {
  // 这里的 value 会是 undefined 但是现在不需要管
  // 1 是因为对于值的获取总是要在 dep 函数之后进行
  // page.fetchData(page.data, text) 这样可以获取值，但是dep 函数已经执行完毕
  // 2 是暂时不获取值可以在后来统一取值，做一些合并，比如两个变量同时决定一个元素时
  // {{ number1 + number2 }} 这样合并之后直接取一次，而不是取两次
  // 但是现在情况还是无缘无故取了一次数据没有用到...
  // 是不是可以考虑构建一个 template 和 value 对照表，每获取一个值就存进去一个
  // 这样下次获取如果遇到相同的表达式直接走缓存
  // 后面可以考虑把 value 删掉
  if (!this.depMap.has(key)) {
    this.depMap.set(key, {
      depPaths: [{
        path: this.currRecordPath,
        source: [{
          type: type,
          keyName: keyName,
          value: value,
          template: template
        }]
      }],
      pathRecord: new Map([[this.currRecordPath, 0]]),
    })
  } else {
    const target = this.depMap.get(key)
    const pathIndex = target.pathRecord.get(this.currRecordPath)
    if (pathIndex >= 0) {
      target.depPaths[pathIndex].source.push({
        type: type,
        keyName: keyName,
        value: value,
        template: template
      })
    } else {
      target.pathRecord.set(this.currRecordPath, target.depPaths.length)
      target.depPaths.push({
        path: this.currRecordPath,
        source: [{
          type: type,
          keyName: keyName,
          value: value,
          template: template
        }]
      })
    }
  }
}

