const reg = /\{\{([^}]+)\}\}/g

export default function depMap (page, ast) {
  page.dep = dep
  let node = ast
  let queue = [node]
  while (queue.length) {
    const currNode = queue.pop()
    const { text, path } = currNode
    if (text && reg.test(text)) {
      page.currRecordPath = path
      // 需要在此补充...
      parseData(page.data, text)  
    }
    if (currNode.children?.length) {
      queue.push(...currNode.children)
    }
  }
}

function dep (key) {
  if (!this.depMap.get(key)) {
    this.depMap.set(key, {
      depPaths: new Set([this.currRecordPath])
    })
  } else {
    this.depMap.get(key).depPaths.add(this.currRecordPath)
  }
  // this.currRecordPath = null
}

const parseData = (data, str, innerReplaceStr='', ) => {
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
