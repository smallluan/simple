// 匹配标签名，以字母或者下划线开头，后面可以跟字母、数字、下划线、连字符或者点
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`
// 匹配带命名空间的标签名，xhtml: xxx
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
// 匹配开始标签开头
const startTagOpen = new RegExp(`^<${qnameCapture}`)
// 匹配结束标签
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
// 匹配属性标签 id = app
const attribute = /^([^\s"'<>\/=]+)\s*=\s*(["'])(.*?)\2/
// 匹配开始标签的结束部分 >
const startTagColse = /^\s*>/
// 匹配 HTML 的注释
const comment = /^<!--[\s\S]*?-->/
// 定义自闭合标签列表，当然这些标签也可以有结束标签
const selfClosingTags = ['input', 'img', 'br', 'hr', 'meta', 'link']

// {
//   number: {
//     depPaths: [
//       {
//         path: '0_1_2',  // 路径
//         parentNode: xxx,  // 父元素(方便插入新元素)
//         depPos: ['attr', 'text'],  // 该路径下需要更新的位置
//         pureTextNode: true  //  纯文本节点
//       }
//     ]
//   }
// }

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
      node.path = '0'
    }

    if (currParent) {
      node.parents = currParent
      node.path = `${currParent.path}_${currParent.children.length}`
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
    } else if (!found && !selfClosingTags.includes(stack.at(-1).tag) || stack.length === 0) {
      throw Error(`标签${tag}缺少结束标签`)
    }
  }

  function textHandler (text) {
    const orangialText = text.replace(/\n/g, '').trim()
    if (!orangialText) return

    const textNode = {
      text: orangialText,
      path: `${currParent.path}_${currParent.children.length}`,
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
      startTagHandler(tag, attrs, isSelfClosing)
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
