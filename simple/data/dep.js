const reg = /\{\{([^}]+)\}\}/g

export default function depMap (page, ast) {
  page.dep = dep
  page.fetchData = fetchData
  let node = ast
  let queue = [node]
  while (queue.length) {
    const currNode = queue.pop()
    const { text, path, attrs } = currNode
    page.currRecordPath = path
    if (text && reg.test(text)) {
      page.currRecordType = 'text'
      const parseRes = fetchData(page.data, text)
      pathValueMap(page, path, 'text', text, parseRes)
    }
    if (attrs && attrs.length) {
      attrs.forEach(item => {
        if (reg.test(item.value)) {
          page.currRecordType = 'attr'
          const parseRes = fetchData(page.data, item.value)
          pathValueMap(page, path, 'attr', item.value, parseRes, item.name)
        }
      })
    }
    if (currNode.children?.length) {
      queue.push(...currNode.children)
    }
  }
}

function dep (key, type, value) {
  if (!this.depMap.get(key)) {
    this.depMap.set(key, {
      depPaths: [{
        path: this.currRecordPath,
        type: type,
      }],
      pathRecord: new Map([[this.currRecordPath, 0]]),
    })
  } else {
    const target = this.depMap.get(key)
    const pathIndex = target.pathRecord.get(this.currRecordPath)
    if (pathIndex >= 0) {
      target.depPaths[pathIndex].type = type
    } else {
      target.pathRecord.set(this.currRecordPath, target.depPaths.length)
      target.depPaths.push({
        path: this.currRecordPath,
        type: type,
      })
    }
  }
}

function pathValueMap (page, path, type, exp, value, attrName = null) {
  if (!page.pathValueMap.has(path)) {
    let info = null
    if (type === 'text') {
      info = {
        type: type,
        exp: exp,
        value: value,
        attrName: attrName
      }
    } else {
      info = {
        type: type,
        exp: [exp],
        value: [value],
        attrName: [attrName]
      }
    }
    page.pathValueMap.set(path, info)
  } else {
    const target = page.pathValueMap.get(path)
    if (type === 'text') {
      target.exp = exp
      target.value = value
      target.attrName = attrName
    } else {
      let hasIndex = target.attrName.indexOf(attrName)
      if (hasIndex === -1) {
        target.exp.push(exp)
        target.value.push(value)
        target.attrName.push(attrName)
      } else {
        target.value[hasIndex] = value
      }
    }
  }
}

const fetchData = (data, str, innerReplaceStr='', ) => {
  return str.replace(reg, (match, exp) => {
   if (innerReplaceStr.length) {
      exp = exp.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&lpar;/g, '(').replace(/&rpar;/g, ')')
      // 创建全局匹配的正则表达式
      const replaceReg = new RegExp(innerReplaceStr, 'g');
      exp = exp.replace(replaceReg, 'data');
    }
    const func = new Function('data', `with(data){
      const res = ${exp.trim()}
      if (typeof res === 'object') {
        return JSON.stringify(res)
      }
      return res}
    `)
    try {
      return func(data)
    } catch (e) {
      console.error(`解析表达式出错: ${exp.trim()}`, e)
      return match // 出错时返回原始的 {{expression}}
    }
  })
}
