import Page from "../../simple"

Page({
  // 数据部分
  data: {
   scrollTop: 0,
   number: 0,
   number1: 10,
   showModule: false,
   showDuration: true,
   startTime: performance.now(),
   endTime: 0,
   duration: 0,
   count: 0,
   introduce: 'Simple 是 smallluan 独立开发的，不依赖于虚拟 DOM 的，集成内置组件以及响应式布局的前端响应式框架。',
   responsiveDataText: [ 
    '自动追踪变化 📡', 
    '数图同步更新 🚀',
    '支持计算属性 🧮'
   ],
   featureList: [
    {
      id: 0,
      mainTitle: '🌟 易于学习',
      subTitle: '风格简明，初学友好',
    },
    {
      id: 1,
      mainTitle: '🔎 靶向更新',
      subTitle: '深度路径，标签解析'
    },
    {
      id: 2,
      mainTitle: '🚀 持续维护',
      subTitle: '个人开发，代码开源'
    }
   ],
   goodnessList: [
    {
      a: '✅ 多文件，更清晰'
    },
    {
      a: '✅ 内置组件，无需引入'
    },
    {
      a: '✅ 响应式布局'
    },
   ]
  },

  // 生命周期
  lifttimes: {
    start() {
      // console.warn('生命周期 - start')

    },
    loaded(data) {
      console.warn('生命周期 - loaded')
      data.endTimer = performance.now()
      data.duration = Math.abs(data.endTime - data.startTime)
      let timer = setInterval(() => {
        if (data.count >= 10000) {
          data.count = '10000+'
          clearInterval(timer)
        } else {
          data.count ++
        }
      }, 1000)
    },
    update() {
      console.warn('生命周期 - update')
    },
    updated() {
      console.warn('生命周期 - updateed')
    }
  },

  // 观察者(随动数据)
  observers: {
    "numberRes": function (data) {
      return data.number + data.number1
    },
  },

  // 页面方法
  methods: {
    toggleShowModule(e, data) {
      data.showModule = !data.showModule
    },
    toggleShowDuration(e, data) {
      data.showDuration = !data.showDuration
    },
    pageScroll(scrollTop) {
      this.data.scrollTop = scrollTop
    },
    inc(e, data) {
      if (data.number === 9) {
        data.showModule = true
        return
      }
      if (data.showModule) {
        data.showModule = false
      }
      data.number ++
    },
    dec(e, data) {
      if (data.number === -9) {
        data.showModule = true
        return
      }
      if (data.showModule) {
        data.showModule = false
      }
      data.number -- 
    }
  },
})
