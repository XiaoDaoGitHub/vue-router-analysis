import View from './components/view'
import Link from './components/link'

export let _Vue

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
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal)
    }
  }

  Vue.mixin({
    beforeCreate () {
      if (isDef(this.$options.router)) {
        this._routerRoot = this
        this._router = this.$options.router
        this._router.init(this)
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
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
