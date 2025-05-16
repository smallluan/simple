import Page from "../../simple"

Page({
  // 数据部分
  data: {
    firstName: '张',
    lastName: '伟',
    number: 0,
    count: 3,
    timer: null,
    list: [1, 2, 3, 4]
  },

  // 生命周期
  lifttimes: {
    start() {
      console.warn('生命周期 - start')
    },
    loaded() {
      console.warn('生命周期 - loaded')
      this.data.timer = setInterval(() => {
        this.data.count --
      }, 1000)
      setTimeout(() => {
        this.data.lastName = '益达'
        this.data.number = 100
        clearInterval(this.data.timer)
      }, 3000)
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
    "fullName": function(data) {
      return data.firstName + data.lastName
    },
  },

  // 页面方法
  methods: {
    incNumber () {
      this.data.number ++
    }
  },
})
