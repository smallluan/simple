import Page from "../../simple"

Page({
  // 数据部分
  data: {
    firstName: '张',
    lastName: '伟',
    number1: 0,
    number2: 10
  },

  // 生命周期
  lifttimes: {
    start() {
      console.warn('生命周期 - start')
    },
    loaded(data) {
      console.warn('生命周期 - loaded')
      setTimeout(() => {
        data.number1 = 10
        data.lastName = '益达'
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
    "fullNumber": function(data) {
      return data.number1 + data.number2
    },
    "number1": function() {
      console.log('number1 发生了变化')
    }
  },

  // 页面方法
  methods: {
    incNumber (e, data) {
      data.number1 += 10
    }
  },
})
