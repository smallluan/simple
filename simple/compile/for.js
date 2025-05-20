import tagReg from '../reg/tag'

export default function handleFor (page, html, attrs, path) {
  let source
  for (let i of attrs) {
    if (i.name === 'source') {
      source = i.value
    }
  }
  const sourceDataName = source
  const forTag = tagReg.forTag
  const forEndTag = html.match(forTag)
  let forInnerHtml = html.slice(0, forEndTag.index)
  html = html.substring(forEndTag.index + forEndTag[0].length)
  let whiteSpace = html.match(/^\s*/)
  html = html.substring(whiteSpace[0].length)
  whiteSpace = forInnerHtml.match(/^\s*/)
  forInnerHtml = forInnerHtml.substring(whiteSpace[0].length)

  // 占位元素与变量，保证首次更新，for标签被正确加入待更新序列
  html = `<div source = "{{ ${source} }}"></div>${html}`
  page._for = _for
  _for(page, forInnerHtml, sourceDataName, path)

  return html
}

// 只负责记录，不负责控制
function _for(page, template, source, path) {
  page.depForMap.set(path, {
    source: source,
    template: template,
  })
}
