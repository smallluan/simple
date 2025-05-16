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
  constructor (options) {
    console.time('初渲染用时')
    const {
      data = {},
      lifttimes = {},
      observers = {},
      methods = {},
    } = options

    this.lifttimes = lifttimes

    data.__$testData$__  = '元素占位符'

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
      console.warn('路径-表达式-值依赖生成完毕')
      console.log(this.pathValueMap)
      requestAnimationFrame(() => this.render())
      console.warn('初渲染完毕')
      console.timeEnd('初渲染用时')
      this.lifttimes.loaded.call(this)
    })
  }

  update() {
    if (!this.pendingupdateData.size) return
    this.lifttimes.update.call(this)
    console.warn('待更新的变量为')
    console.log(this.pendingupdateData)
    const pendingupdatePath = new Set()
    this.pendingupdateData.forEach(key => {
      this.depMap.get(key).pathRecord.keys().forEach(path => {
        pendingupdatePath.add(path)
      })
    })
    console.warn('待更新的路径为')
    console.log(pendingupdatePath)
    pendingupdatePath.forEach(path => {
      const target = this.pathValueMap.get(path)
      if (target.type === 'attr') {
        target.exp.forEach((exp, index) => {
          target.value[index] = this.fetchData(this.data, exp)
        })
      } else {
        target.value = this.fetchData(this.data, target.exp)
      }
    })
    this.pendingupdateData.clear()
    requestAnimationFrame(() => this.render())
  }

  render() {
    console.time('render函数执行时间')
    this.pathValueMap.forEach((value, key) => {
      let node
      if (value.dom) {
        node = value.dom
        this.change(node, value)
      } else {
        node = this.currEl
        const path = key.split('_')
        let p = 0
        while (p < path.length) {
          node = node.children[Number(path[p])]
          p ++
        }
        if (node) {
          value.dom = node
          this.change(node, value)
        }
      }
    })
    this.lifttimes.updated.call(this)
    console.warn('render函数执行完成')
    console.timeEnd('render函数执行时间')
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

  change(node, value) {
    if (node.tagName === 'FOR') {
      const newNode = document.createElement('div')
      newNode.innerHTML = value.value
      node.replaceWith(newNode)
      return
    }
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
