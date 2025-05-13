class PageClass {
  constructor (options) {
    console.warn('拿到传给类的参数')
    console.dir(options)
  }
}

export default function Page (options) {
  return new PageClass(options)
}
