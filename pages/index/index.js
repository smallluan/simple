import Page from "../../simple"

Page({
  // 数据部分
  data: {
    firstName: '田',
    lastName: '硕',
    age: 21,
    number: 0,
  },

  // 生命周期
  lifttimes: {
    start() {},
    loaded() {
      setTimeout(() => {
        this.data.number = 100
        this.data.fullName = this.data.number
        this.data.number ++
      }, 1000)
    },
    updata() {},
    updataed() {}
  },

  // 观察者(随动数据)
  observers: {
    "fullName": function(data) {
      return data.firstName + data.lastName
    }
  },

  // 页面方法
  methods: {
    incNumber () {
      this.data.number ++
    }
  },
})
