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
// 匹配 if 标签
const ifTag = new RegExp(`<\\/if[^>]*>`)
// 匹配 show 标签
const showTag = new RegExp(`<\\/show[^>]*>`)
// 匹配 for 标签
const forTag = new RegExp(`<\\/for[^>]*>`)

export default {
  ncname,
  qnameCapture,
  startTagOpen,
  endTag,
  attribute,
  startTagColse,
  comment,
  ifTag,
  showTag,
  forTag
}