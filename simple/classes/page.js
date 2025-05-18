import html2Ast from "../compile/ast"
import genDepMap from "../data/dep"
import proxyData from "../data/proxy"

class PageClass {
  // flag
  // 是否在进行数据劫持
  isProxy = false
  // 是否在初始化计算属性
  isInitObs = false
  // 当前被读取的路径(用于记录依赖)
  currRecordPath = null 
  // 当前记录动态显示的是属性还是文字
  currRecordType = null
  // 当前记录的值是多少
  currRecordValue = null
  // 当前观察者访问的变量
  currObsData = null
  // 当前观察者访问变量的函数
  currObsFn = null
  // 变量-路径依赖图
  depMap = new Map()
  // 路径-表达式-值依赖图
  pathValueMap = new Map()
  // 待更新变量
  pendingupdateData = new Set()
  // 计算属性依赖表
  depComp = new Map()
  // for 节点依赖表
  depForMap = new Map()
  // if 节点依赖表
  depIfMap = new Map()
  // func 节点依赖表
  depFuncMap = new Map()
  constructor (options) {
    const {
      data = {},
      lifttimes = {},
      observers = {},
      methods = {},
    } = options

    this.lifttimes = lifttimes

    data.__$testData$__  = '我是占位符'

    this.isProxy = true

    this.data = proxyData(this, data)

    this.isProxy = false

    for(let key in methods) {
      this[key] = methods[key]
    }

    this.isInitObs = true

    for(let key in observers) {
      // 计算属性
      if (!data.hasOwnProperty(key)) {
        this.currObsData = key
        this.currObsFn = observers[key]
        this.data[key] = proxyData(this, observers[key](this.data))
      } else {
        // 观察者
      }
    }

    this.isInitObs = false

    this.genDepMap = genDepMap

    document.addEventListener('DOMContentLoaded', () => {
      this.currEl = document.getElementById('app')
      console.warn('原始 dom 为')
      console.log(this.currEl)
      if (!this.currEl) {
        throw new Error('未找到 id = app 的元素')
      }
      this.lifttimes.start.call(this)
      this.ast = html2Ast(this, this.currEl.outerHTML.replace(/\n/g, ''))
      console.warn('html 解析成语法树')

      console.log(this.ast)
      genDepMap(this, this.ast)
      this.currRecordPath = null
      this.currRecordType = null
      this.currObsData = null
      this.currObsFn = null
      console.warn('变量路径依赖收集完毕')
      console.log(this.depMap)
      // 触发一次初始化更新
      this.update(new Set(this.depMap.keys()))
      this.lifttimes.loaded.call(this)
      console.log(this.depFuncMap)
      this.bindFunc()
    })
  }

  update(pendingupdateData) {
    if (!pendingupdateData.size) return
    this.lifttimes.update.call(this)
    console.warn('待更新的变量为')
    console.log(pendingupdateData)
    const path2ValueMap = this.genPath2ValueMap(pendingupdateData)
    console.log(path2ValueMap)
    this.pendingupdateData.clear()
    requestAnimationFrame(() => this.render(path2ValueMap))
  }

  render(path2ValueMap) {
    // 这里还没有对 dom 进行缓存
    path2ValueMap.forEach((value, key) => {
      const path = key.split('_')
      let node = this.currEl
      let p = 0
      while (p < path.length) {
        node = node.children[Number(path[p])]
        p ++
      }
      if (this.depForMap.has(key)) {
         console.log(this.depForMap)
        // 处理 for
        node.innerHTML = ''

        const data = JSON.parse(this.fetchData(this.data, this.depForMap.get(key).source ))
        const template = this.depForMap.get(key).template

        let fullTemplate = ''
        for (let i = 0; i < data.length; i++) {
          fullTemplate += this.replaceTemplateVariable(this, template, 'item', `list[${i}]`)
        }
        fullTemplate = `<div>${fullTemplate}</div>`
        const ast = html2Ast(this, fullTemplate, path)
        const doms = this.ast2Dom(ast)
        node.replaceWith(doms)
       
      } else if (this.depIfMap.has(key)) {
        // 处理 if
        const show = this.fetchData(this.data, this.depIfMap.get(key).condition) != 'false'
        if (show) {
          // console.error('显示元素')
          const ifNode = this.ast2Dom(this.depIfMap.get(key).ast)
          node.replaceWith(ifNode)
        } else {
          // console.error('隐藏元素')
          node.innerHTML = ''
        }
      } else {
        if (value.text) {
          node.innerText = value.text
        }
        value.attrs.forEach(attr => {
          node[attr.keyName] = attr.value
        })
      }
    })
  }

  fetchData (data, str, innerReplaceStr='') {
    const reg = /\{\{([^}]+)\}\}/g
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

  genPath2ValueMap(pendingupdateData) {
    const map = new Map()
    pendingupdateData.forEach(item => {
      const itemPaths = this.depMap.get(item).depPaths
      itemPaths.forEach(pathInfo => {
        if (!map.has(pathInfo.path)) {
          let attrs = []
          let text = null
          let attrsMap = new Map()
          pathInfo.source.forEach(i => {
            if (i.type === 'text') {
              text = this.fetchData(this.data, i.template)
            } else if (i.type === 'attr') {
              attrsMap.set(i.keyName, attrs.length)
              attrs.push({
                keyName: i.keyName,
                template: i.template,
                value: this.fetchData(this.data, i.template),
              })
            }
          })
          map.set(pathInfo.path, {
            attrs: attrs,
            text: text,
            attrsMap: attrsMap
          })
        } else {
          const targetPath = map.get(pathInfo.path)
          pathInfo.source.forEach(i => {
            if (i.type === 'text') {

              targetPath.text = this.fetchData(this.data, i.template)
            } else if (i.type === 'attr') {
              // 防止一个属性被多次记录
              if (!targetPath.attrsMap.has(i.keyName)) {
                  targetPath.attrs.push({
                  keyName: i.keyName,
                  template: i.template,
                  value: this.fetchData(this.data, i.template)
                })
              }
            }
          })
        }
      })
    })
    return map
  }

  /**
   * 由缓存的 ast 转为 dom
   * @param {Object} ast if 或者 for map 存储的 ast
   * @returns 
   */
  ast2Dom(ast) {
    const nodeTag = ast.tag
    // 没有标签名，是文本节点，此时先去取值，然后创建文本节点返回
    // 现在没有处理标签属性
    if (!nodeTag) {
      const text = this.fetchData(this.data, ast.text)
      return document.createTextNode(text)
    }
    const node = document.createElement(nodeTag)
    ast.children.forEach(child => {
      node.appendChild(this.ast2Dom(child))
    })
    return node
  }

  // 绑定方法
  bindFunc() {
    this.depFuncMap.forEach((value, key) => {
      console.log(key, value)
      const path = key.split('_')
      let node = this.currEl
      let p = 0
      while (p < path.length) {
        node = node.children[Number(path[p])]
        p ++
      }
      const { type, func } = value
      node.addEventListener(type, (e) => this[func].call(this, e))
      node.removeAttribute('@click')
    })
  }

  replaceTemplateVariable(page, str, oldVar, newVar) {
  const regex = new RegExp(`\\{\\{\\s*([^}]*?\\b${oldVar}\\b[^}]*?)\\s*\\}\\}`, 'g');
  return str.replace(regex, (match, expr) => {
    // 只替换变量名，不影响运算符和其他内容
    const replacedExpr = expr.replace(new RegExp(`\\b${oldVar}\\b`, 'g'), newVar)
    // return page.fetchData(page.data, `{{ ${replacedExpr} }}`);
    return `{{ ${replacedExpr} }}`
  })
}
}

export default PageClass
