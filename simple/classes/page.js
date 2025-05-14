import html2Ast from "../compile/ast"
import depMap from "../data/dep"
import proxyData from "../data/proxy"

class PageClass {
  // 当前被读取的路径(用于记录依赖)
  currRecordPath = null 
  // 当前记录动态显示的是属性还是文字
  currRecordType = null
  arr = []
  // 依赖图
  depMap = new Map()
  constructor (options) {
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
      const ast = html2Ast(this, this.currEl.outerHTML.replace(/\n/g, ''))
      console.warn('html 解析成语法树')
      console.log(ast)
      depMap(this, ast)
      console.warn('变量依赖收集表生成完毕')
      console.log(this.depMap)
    })
  }
}

export default PageClass
