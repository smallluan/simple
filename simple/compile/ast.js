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
        const path = `${currParent.path}${currParent.path ? '_' : ''}${currParent.children.length}`
        html = handleFor(page, html, attrs, path)
      } else if (tag === 'if') {
        const path = `${currParent.path}${currParent.path ? '_' : ''}${currParent.children.length}`
        html = handleIf(page, html, attrs, path)
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

function handleFor (page, html, attrs, path) {
  const sourceData = page.data['list']
  const sourceDataName = 'list'
  const forTag = new RegExp(`<\\/for[^>]*>`)
  const forEndTag = html.match(forTag)
  let forInnerHtml = html.slice(0, forEndTag.index)
  html = html.substring(forEndTag.index + forEndTag[0].length)
  let whiteSpace = html.match(/^\s*/)
  html = html.substring(whiteSpace[0].length)
  whiteSpace = forInnerHtml.match(/^\s*/)
  forInnerHtml = forInnerHtml.substring(whiteSpace[0].length)
  // 占位元素与变量，保证首次更新，for标签被正确加入待更新序列
  html = `<div source = "{{ list }}"></div>${html}`
  page._s = _s
  _s(page, forInnerHtml, sourceData, sourceDataName, path)

  return html
}

function _s(page, elem, data, name, path) {
  let doms = []
  const range = document.createRange()
  for (let i = 0; i < data.length; i++) {
  const domStr = replaceTemplateVariable(page, elem, 'item', `${name}[${i}]`)
  const fragment = range.createContextualFragment(domStr)
  
  // 将 fragment 中的所有子节点添加到数组中
  while (fragment.firstChild) {
    doms.push(fragment.firstChild)
    // 将节点从 fragment 中移除，避免重复添加
    fragment.removeChild(fragment.firstChild)
  }
}
  page.depForMap.set(path, {
    doms: doms,
    template: elem
  })
  doms = null
}

function replaceTemplateVariable(page, str, oldVar, newVar) {
  const regex = new RegExp(`\\{\\{\\s*([^}]*?\\b${oldVar}\\b[^}]*?)\\s*\\}\\}`, 'g');
  return str.replace(regex, (match, expr) => {
    // 只替换变量名，不影响运算符和其他内容
    const replacedExpr = expr.replace(new RegExp(`\\b${oldVar}\\b`, 'g'), newVar);
    return page.fetchData(page.data, `{{ ${replacedExpr} }}`);
  });
}

function handleIf(page, html, attrs, path) {
  const ifTag = new RegExp(`<\\/if[^>]*>`)
  const ifEndTag = html.match(ifTag)
  let ifInnerHtml = html.slice(0, ifEndTag.index)
  html = html.substring(ifEndTag.index + ifEndTag[0].length)
  let whiteSpace = html.match(/^\s*/)
  html = html.substring(whiteSpace[0].length)
  whiteSpace = ifInnerHtml.match(/^\s*/)
  ifInnerHtml = ifInnerHtml.substring(whiteSpace[0].length)
  // 占位元素与变量，保证首次更新，for标签被正确加入待更新序列
  html = `<div source = "{{ show }}"></div>${html}`
  page._f = _f
  _f(page, ifInnerHtml, path)
  return html
}

function _f(page, elem, path) {
  page.depIfMap.set(path, {
    template: elem,
    condition: 'show'
  })
}
