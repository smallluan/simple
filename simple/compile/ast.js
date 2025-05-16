// 匹配标签名，以字母或者下划线开头，后面可以跟字母、数字、下划线、连字符或者点
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`
// 匹配带命名空间的标签名，xhtml: xxx
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
// 匹配开始标签开头
const startTagOpen = new RegExp(`^<${qnameCapture}`)
// 匹配结束标签
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
const forTag = new RegExp(`^<\\/for[^>]*>`)
// 匹配属性标签 id = app
const attribute = /^([^\s"'<>\/=]+)\s*=\s*(["'])(.*?)\2/
// 匹配开始标签的结束部分 >
const startTagColse = /^\s*>/
// 匹配 HTML 的注释
const comment = /^<!--[\s\S]*?-->/
// 定义自闭合标签列表，当然这些标签也可以有结束标签
const selfClosingTags = ['input', 'img', 'br', 'hr', 'meta', 'link']

export default function html2Ast(page, html) {
  let stack = []  // 存放当前正在处理的节点
  let root  // ast 根节点
  let currParent  // 正在处理的父节点

  function parseStartTag() {
    const start = html.match(startTagOpen)
    if (start) {
      const match = {
        tag: start[1],
        attrs: [],
        isSelfClosing: false
      }
      forword(start[0].length)
      let spaceMatch
      while(!html.match(startTagColse) && html) {
        if (spaceMatch = html.match(/^\s*/)) {
          forword(spaceMatch[0].length)
        }
        let attr = html.match(attribute)
        if (attr) {
          forword(attr[0].length)
          match.attrs.push({
            name: attr[1],
            value: attr[3]
          })
          continue
        }
        break
      }
      const tagCloseMatch = html.match(startTagColse)
      if (tagCloseMatch) {
        match.isSelfClosing = selfClosingTags.includes(match.tag)
        forword(tagCloseMatch[0].length)
      }
      return match
    } else {
      return false
    }
  }

  function startTagHandler(tag, attrs, isSelfClosing) {
    let node = {
      tag,
      attrs,
      children: [],
      path: [],
      parents: null
    }

    if (!root) {
      root = node
      node.path = ''
    }

    if (currParent) {
      node.parents = currParent
      node.path = `${currParent.path}${currParent.path ? '_' : ''}${currParent.children.length}`
      currParent.children.push(node)
    }

    if (!isSelfClosing) {
      stack.push(node)
      currParent = node
    }
  }

  function endTagHandler(tag) {
    let found = stack.at(-1).tag === tag

    if (found) {
      stack.pop()
      currParent = stack.at(-1)
    } 
  }

  function textHandler (text) {
    const orangialText = text.replace(/\n/g, '').trim()
    if (!orangialText) return

    const textNode = {
      text: orangialText,
      path: currParent.path,
      parent: currParent
    }
    
    currParent.children.push(textNode)
  }

  function forword(n) {
    html = html.substring(n)
  }

  while (html) {
    let commentMatch
    if (commentMatch = html.match(comment)) {
      forword(commentMatch[0].length)
      continue
    }

    const startTagMatch = parseStartTag()
    if (startTagMatch) {
      let { tag, attrs, isSelfClosing } = startTagMatch
      if (tag === 'for') {
        html = handleFor(page, html, attrs)
      } else {
        startTagHandler(tag, attrs, isSelfClosing)
      }
      continue
    }

    const endTagMatch = html.match(endTag)
    if (endTagMatch) {
      endTagHandler(endTagMatch[1])
      forword(endTagMatch[0].length)
      continue
    }

    let textend = html.indexOf('<')
    if (textend > 0) {
      const text = html.substring(0, textend)
      if (text) {
        textHandler(text)
        forword(text.length)
      }
    } else if (textend === -1) {
      let text = html
      if (text) {
        textHandler(text)
        html = ''
      }
    }
  }
  return root
}


function handleFor (page, html, attrs) {
  const sourceData = page.data['list']
  const forTag = new RegExp(`<\\/for[^>]*>`)
  const forEndTag = html.match(forTag)
  let forInnerHtml = html.slice(0, forEndTag.index)
  html = html.substring(forEndTag.index + forEndTag[0].length)
  let whiteSpace = html.match(/^\s*/)
  html = html.substring(whiteSpace[0].length)
  whiteSpace = forInnerHtml.match(/^\s*/)
  forInnerHtml = forInnerHtml.substring(whiteSpace[0].length)
  // console.log(html2Ast(page, forInnerHtml))
  html = `<div>{{__$testData$__}}</div>${html}`
  // 创建Range对象
  const range = document.createRange();

  // 创建文档片段
  const fragment = range.createContextualFragment(forInnerHtml);

  // 获取第一个子元素
  const domElement = fragment.firstElementChild;
  console.log(domElement)
  console.log(html)
  return html
}
