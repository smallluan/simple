import html2Ast from "../compile/ast"
import depMap from "../data/dep"
import proxyData from "../data/proxy"

class PageClass {
  // 当前被读取的路径(用于记录依赖)
  currRecordPath = null 
  // 当前记录动态显示的是属性还是文字
  currRecordType = null
  // 当前记录的值是多少
  currRecordValue = null
  // 变量-路径依赖图
  depMap = new Map()
  // 路径-表达式-值依赖图
  pathValueMap = new Map()
  constructor (options) {
    console.time('初渲染用时')
    const {
      data = {},
      lifttimes = {},
      observers = {},
      methods = {},
    } = options

    this.lifttimes = lifttimes

    // 只能初始化这么写，否则要么在函数内拿不到this.data，要么就要单独为计算属性做代理
    for(let key in observers) {
      // 计算属性
      if (!data.hasOwnProperty(key)) {
        data[key] = observers[key](data)
      } else {
        // 观察者
      }
    }

    this.data = proxyData(this, data)

    document.addEventListener('DOMContentLoaded', () => {
      this.currEl = document.getElementById('app')
      console.warn('原始 dom 为')
      console.log(this.currEl)
      if (!this.currEl) {
        throw new Error('未找到 id = app 的元素')
      }
      try {
        this.lifttimes.start.call(this)
      } catch(e) {
        console.error(e)
      }
      this.ast = html2Ast(this, this.currEl.outerHTML.replace(/\n/g, ''))
      console.warn('html 解析成语法树')
      console.log(this.ast)
      depMap(this, this.ast)
      console.warn('变量路径依赖收集表生成完毕')
      console.log(this.depMap)
      console.warn('路径-表达式-值依赖生成完毕')
      console.log(this.pathValueMap)
      this.render()
      console.warn('初渲染完毕')
      console.timeEnd('初渲染用时')
      this.lifttimes.loaded.call(this)
    })
  }

  render() {
    console.time('render函数执行时间')
    this.pathValueMap.forEach((value, key) => {
      let node = this.currEl
      const path = key.split('_').slice(1)
      let p = 0
      const d = value.type === 'text' ? path.length - 1 : path.length
      while (p < d) {
        node = node.children[Number(path[p])]
        p ++
      }
      if (node) {
        if (value.type === 'attr') {
          value.value.forEach((item, index) => {
            node.setAttribute(value.attrName[index], value.value[index])
          })
        } else {
          node = node.innerText = value.value
        }
      }
    })
    console.timeEnd('render函数执行时间')
  }
}

export default PageClass
