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
        console.log('节点已经被缓存，直接使用该节点')
        node = value.dom
        this.change(node, value)
      } else {
        // 逐层查找父元素
        let path = key
        let deep = 0
        // 向上找三层，如果找不到就从头开始找
        while(path && deep < 3) {
          path = path.slice(0, -2)
          if (this.pathValueMap.get(path)) {
            node = this.pathValueMap.get(path).dom
            break
          }
          deep ++
        }
        if (node) {
          path = key.substring(path.length + 1).split('_')
          let p = 0
          const d = value.type === 'text' ? path.length - 1 : path.length
          while (p < d) {
            node = node.children[Number(path[p])]
            p ++
          }
          if (node) {
            value.dom = node
            this.change(node, value)
          }
        } else {
          node = this.currEl
          const path = key.split('_').slice(1)
          let p = 0
          const d = value.type === 'text' ? path.length - 1 : path.length
          while (p < d) {
            node = node.children[Number(path[p])]
            p ++
          }
          if (node) {
            value.dom = node
            this.change(node, value)
          }
        }
      }
    })
    this.lifttimes.updated.call(this)
    console.warn('render函数执行完成')
    console.timeEnd('render函数执行时间')
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
