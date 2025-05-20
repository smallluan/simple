/**
 * 对于 if 标签
 * 1. 解析其中的内容拿出来
 * 2. 在 if 的 map 中保存 if 标签内元素的模版(最外层包裹 div 标签，到时候直接元素替换)
 */
import Html2Ast from "./ast"
import tagReg from "../reg/tag"

export default function handleIf(page, html, attrs, path) {
  let source
  for (let i of attrs) {
    if (i.name === 'condition') {
      source = i.value
    }
  }
  const condition = source
  const ifTag = tagReg.ifTag
  const ifEndTag = html.match(ifTag)
  let ifInnerHtml = html.slice(0, ifEndTag.index)
  html = html.substring(ifEndTag.index + ifEndTag[0].length)
  let whiteSpace = html.match(/^\s*/)
  html = html.substring(whiteSpace[0].length)
  whiteSpace = ifInnerHtml.match(/^\s*/)
  ifInnerHtml = ifInnerHtml.substring(whiteSpace[0].length)
  // 占位元素与变量，保证首次更新，for标签被正确加入待更新序列
  html = `<div source = "${condition}"></div>${html}`
  page._if = _if
  _if(page, ifInnerHtml, condition, path)
  return html
}

// 只负责记录，不负责控制
function _if(page, template, condition, path) {
  template = `<div>${template}</div>`
  const ast = new Html2Ast(page, template, path).transform()
  page.genDepMap(page, ast)
  page.depIfMap.set(path, {
    template: template,
    condition: condition,
    ast: ast
  })
}
