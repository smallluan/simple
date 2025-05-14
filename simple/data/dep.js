const reg = /\{\{([^}]+)\}\}/g

export default function depMap (page, ast) {
  page.dep = dep
  let node = ast
  let queue = [node]
  while (queue.length) {
    const currNode = queue.pop()
    const { text, path, attrs } = currNode
    page.currRecordPath = path
    if (text && reg.test(text)) {
      page.currRecordType = 'text'
      // 需要在此补充...
      const parseRes = fetchData(page.data, text)
      // console.log(parseRes)
    }
    if (attrs && attrs.length) {
      attrs.forEach(item => {
        if (reg.test(item.value)) {
          page.currRecordType = 'attr'
          // console.log(item.value)
          fetchData(page.data, item.value)
        }
      })
    }
    if (currNode.children?.length) {
      queue.push(...currNode.children)
    }
    page.currRecordType = null
  }
}

function dep (key, type) {
  if (!this.depMap.get(key)) {
    this.depMap.set(key, {
      depPaths: [{
        path: this.currRecordPath,
        type: type
      }],
      pathRecord: new Map([[this.currRecordPath, 0]])
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
        type: type
      })
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
