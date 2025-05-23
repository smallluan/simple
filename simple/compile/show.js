/**
 * 对于 show 标签
 * 1. 根元素改为 div 
 * 2. 将根元素的 visibility 设置为 hidden
 */
import Html2Ast from "./ast"
import tagReg from "../reg/tag"

export default function handleShow(page, html, attrs, path) {
  let source
  for (let i of attrs) {
    if (i.name === 'condition') {
      source = i.value
    }
  }
  const condition = source
  const showTag = tagReg.showTag
  const showEndTag = html.match(showTag)
  let showInnerHtml = html.slice(0, showEndTag.index)
  html = html.substring(showEndTag.index + showEndTag[0].length)
  let whiteSpace = html.match(/^\s*/)
  html = html.substring(whiteSpace[0].length)
  whiteSpace = showInnerHtml.match(/^\s*/)
  showInnerHtml = showInnerHtml.substring(whiteSpace[0].length)
  const placeHolder = `<div source = "${condition}"></div>`
  // 占位元素与变量，保证首次更新，for标签被正确加入待更新序列
  html = `${placeHolder}${html}`
  page._show = _show
  _show(page, showInnerHtml, condition, path, placeHolder)
  return html
}

// 只负责记录，不负责控制
function _show(page, template, condition, path, placeHolder) {
  template = `<div>${template}</div>`
  const ast = new Html2Ast(page, template, path).transform()
  page.genDepMap(page, ast)
  page.depShowMap.set(path, {
    template: template,
    condition: condition,
    ast: ast,
    placeHolder: placeHolder
  })
}
