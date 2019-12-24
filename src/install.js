import View from './components/view'
import Link from './components/link'

export let _Vue
// Vue.use会执行传入对象的install方法
// Vue.install会传入Vue对象
export function install (Vue) {
  // 是否已经安装过vue-router,全局值安装一次
  if (install.installed && _Vue === Vue) return
  // 标记installed为true，这里是一个简单的单例模式的实现
  install.installed = true

  _Vue = Vue

  const isDef = v => v !== undefined

  const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode
    // 调用router-view里面的registerRouteInstance来注册当前的组件实例
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal)
    }
  }

  Vue.mixin({
    // 全局混入beforeCreate钩子函数
    beforeCreate () {
      // this.$options.router是在 new Vue的时候传入的，会被组件
      // 一层一层的继承下来
      if (isDef(this.$options.router)) {
        this._routerRoot = this
        // 保存_router变量
        this._router = this.$options.router
        // 执行router的init方法
        this._router.init(this)
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        // 没有的话到parentVnode上去查找
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      // 注册实例
      registerInstance(this, this)
    },
    destroyed () {
      registerInstance(this)
    }
  })
  // 在vue原型上挂在$router方法
  Object.defineProperty(Vue.prototype, '$router', {
    // 返回内部变量 _routerRoot._router
    get () { return this._routerRoot._router }
  })
// 在vue原型上挂在$route方法
  Object.defineProperty(Vue.prototype, '$route', {
    get () { return this._routerRoot._route }
  })
  // 注册组件router-view和router-link
  Vue.component('RouterView', View)
  Vue.component('RouterLink', Link)

  const strats = Vue.config.optionMergeStrategies
  // use the same hook merging strategy for route hooks
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created
}
