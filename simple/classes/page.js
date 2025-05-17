import html2Ast from "../compile/ast"
import depMap from "../data/dep"
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
      depMap(this, this.ast)
      this.currRecordPath = null
      this.currRecordType = null
      this.currObsData = null
      this.currObsFn = null
      console.warn('变量路径依赖收集完毕')
      console.log(this.depMap)
      // 触发一次初始化更新
      this.update(new Set(this.depMap.keys()))
      this.lifttimes.loaded.call(this)
    })
  }

  update(pendingupdateData) {
    if (!pendingupdateData.size) return
    this.lifttimes.update.call(this)
    console.warn('待更新的变量为')
    console.log(pendingupdateData)
    const path2ValueMap = this.genPath2ValueMap(pendingupdateData)
    this.pendingupdateData.clear()
    requestAnimationFrame(() => this._render(path2ValueMap))
  }

  _render(path2ValueMap) {
    // 这里还没有对 dom 进行缓存
    path2ValueMap.forEach((value, key) => {
      const path = key.split('_')
      let node = this.currEl
      let p = 0
      while (p < path.length) {
        node = node.children[Number(path[p])]
        p ++
      }
      if (value.text) {
        node.innerText = value.text
      }
      value.attrs.forEach(attr => {
        node[attr.keyName] = attr.value
      })
    })
  }

  // render() {
  //   console.time('render函数执行时间')
  //   this.pathValueMap.forEach((value, key) => {
  //     let node
  //     if (value.dom) {
  //       // 先不处理列表变化
  //       if (this.depForMap.has(key)) return
  //       node = value.dom
  //       this.change(node, value)
  //     } else {
  //       node = this.currEl
  //       const path = key.split('_')
  //       let p = 0
  //       while (p < path.length) {
  //         node = node.children[Number(path[p])]
  //         p ++
  //       }
  //       if (node) {
  //         if (this.depForMap.has(key)) {
  //           const newNode = document.createElement('div')
  //           this.depForMap.get(key).forEach(child => {
  //             newNode.appendChild(child)
  //           })
  //           node.replaceWith(newNode)
  //           value.dom = newNode
  //         } else {
  //           this.change(node, value)
  //           value.dom = node
  //         }
  //       }
  //     }
  //   })
  //   this.lifttimes.updated.call(this)
  //   console.warn('render函数执行完成')
  //   console.timeEnd('render函数执行时间')
  // }

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

  change(node, value) {
    if (value.type === 'attr') {
      value.value.forEach((item, index) => {
        if (value.value[index] === 'false') {
          node.removeAttribute(value.attrName[index])
          return
        } 
        node.setAttribute(value.attrName[index], value.value[index])
      })
    } else {
      if (node.innerText !== value.value) {
        node.innerText = value.value
      }
    }
  }
}

export default PageClass
