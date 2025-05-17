import Page from "../../simple"

Page({
  // 数据部分
  data: {
    firstName: '张',
    lastName: '伟',
    number: 0,
    count: 10,
    timer: null,
    list: [
      {
        id: 0,
        value: {
          name: '小乱乱',
          age: 21
        }
      },
      {
        id: 1,
        value: {
          name: '喜羊羊',
          age: 30
        }
      },
      {
        id: 2,
        value: {
          name: '沸羊羊',
          age: 100
        }
      },
    ]
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
        this.data.list.push({
          id: 3,
          value: {
            name: '美羊羊',
            age: 10
          }
        })
        this.data.list[0].value.age = 10000
      }, 10000)
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
