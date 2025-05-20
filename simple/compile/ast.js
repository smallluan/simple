import handleFor from "./for"
import handleIf from "./if"
import tagReg from '../reg/tag'

const selfClosingTags = ['input', 'img', 'br', 'hr', 'meta', 'link']

/**
 * 将需要被解析的 html 字符串解析为 ast 语法树
 * 这里定义成类主要是确保在转换函数被递归/重复调用时, currParent、stack、root 都是相互隔离的
 * @param {any} page 当前页面对象
 * @param {string} html 要解析成 ast 的 html 字符串
 * @param {string} rootPath 当前根路径 (考虑到可能被复用，此时记录根路径是有意义的)
 * @returns ast
 */
export default class Html2Ast {
  currParent
  stack = []
  root
  
  constructor(page, html, rootPath = '') {
    this.page = page
    this.html = html
    this.rootPath = rootPath
  }

  transform() {
    while (this.html) {
      let commentMatch
      if (commentMatch = this.html.match(tagReg.comment)) {
        this.forword(commentMatch[0].length)
        continue
      }

      const startTagMatch = this.parseStartTag()
      if (startTagMatch) {
        let { tag, attrs } = startTagMatch
        if (tag === 'for') {
          const path = this.genPath('tag', this.currParent)
          this.html = handleFor(this.page, this.html, attrs, path)
        } else if (tag === 'if') {
          const path = this.genPath('tag', this.currParent)
          this.html = handleIf(this.page, this.html, attrs, path)
        } else {
          this.startTagHandler(startTagMatch)
        }
        continue
      }

      const endTagMatch = this.html.match(tagReg.endTag)
      if (endTagMatch) {
        this.endTagHandler(endTagMatch[1], this.root, this.stack, this.currParent)
        this.forword(endTagMatch[0].length)
        continue
      }

      let textend = this.html.indexOf('<')
      if (textend > 0) {
        const text = this.html.substring(0, textend)
        if (text) {
          this.textHandler(text, this.root, this.stack, this.currParent)
          this.forword(text.length)
        }
      } else if (textend === -1) {
        let text = this.html
        if (text) {
          this.textHandler(text, this.root, this.stack, this.currParent)
          this.html = ''
          this.currParent = null
          this.stack = []
          this.root = null
        }
      }
    }
    return this.root
  }

  parseStartTag() {
    const start = this.html.match(tagReg.startTagOpen)
    if (start) {
      const match = {
        tag: start[1],
        attrs: [],
        isSelfClosing: false
      }
      this.forword(start[0].length)
      let spaceMatch
      while(!this.html.match(tagReg.startTagColse) && this.html) {
        if (spaceMatch = this.html.match(/^\s*/)) {
          this.forword(spaceMatch[0].length)
        }
        let attr = this.html.match(tagReg.attribute)
        if (attr) {
          this.forword(attr[0].length)
          match.attrs.push({
            name: attr[1],
            value: attr[3]
          })
          continue
        }
        break
      }
      const tagCloseMatch = this.html.match(tagReg.startTagColse)
      if (tagCloseMatch) {
        match.isSelfClosing = selfClosingTags.includes(match.tag)
        this.forword(tagCloseMatch[0].length)
      }
      return match
    } else {
      return false
    }
  }

  forword(n) {
    this.html = this.html.substring(n)
  }

  /**
   * 处理开始标签
   * @param {object} startTagMatch 匹配的开始标签信息
   * @param {string} rootPath 当前根路径
   */
  startTagHandler(startTagMatch) {
    const { tag, attrs, isSelfClosing } = startTagMatch
    let node = {
      tag,
      attrs,
      children: [],
      path: [],
      parents: null
    }
    if (!this.root) {
      this.root = node
      node.path = this.rootPath
    }
    if (this.currParent) {
      node.parents = this.currParent
      node.path = this.genPath('tag', this.currParent)
      this.currParent.children.push(node)
    }
    if (!isSelfClosing) {
      this.stack.push(node)
      this.currParent = node
    }
  }

  /**
   * 处理结束标签
   * @param {string} tag 结束标签
   */
  endTagHandler(tag) {
    let found = this.stack.at(-1).tag === tag
    if (found) {
      this.stack.pop()
      this.currParent = this.stack.at(-1)
    } 
  }

  /**
   * 处理文字
   * @param {string} text 处理文字
   */
  textHandler (text) {
    const orangialText = text.replace(/\n/g, '').trim()
    if (!orangialText) return
    const textNode = {
      text: orangialText,
      path: this.genPath('text', this.currParent),
      parent: this.currParent
    }
    this.currParent.children.push(textNode)
  }

  /**
   * 生成当前元素的路径
   * @param {string} type text -> 文本节点路径随父标签，tag -> 标签节点路径单独记录
   * @param {*} currParent -> 当前处理的父节点
   * @returns 当前节点的路径
   */
  genPath(type) {
    const basePath = this.currParent.path
    if (type === 'text') {
      return basePath
    } else if (type === 'tag') {
      return `${basePath}${this.currParent.path ? '_' : ''}${this.currParent.children.length}`
    }
  }
}
