import { warn } from '../util/warn'
import { extend } from '../util/misc'

export default {
  name: 'RouterView',
  // 函数式组件
  functional: true,
  props: {
    name: {
      type: String,
      default: 'default'
    }
  },
  render (_, { props, children, parent, data }) {
    // used by devtools to display a router-view badge
    // 标记routeview，用来确定router的层级关系
    data.routerView = true

    // directly use parent context's createElement() function
    // so that components rendered by router-view can resolve named slots
    // 获取占位符组件的构建方法
    const h = parent.$createElement
    // 获取名称
    const name = props.name
    // 获取route对象
    const route = parent.$route
    const cache = parent._routerViewCache || (parent._routerViewCache = {})

    // determine current view depth, also check to see if the tree
    // has been toggled inactive but kept-alive.
    // depth用来
    let depth = 0
    let inactive = false
    // 递归去查找parent的_routerRoot属性，定义在install里面
    // 用来确定组件的嵌套关系
    while (parent && parent._routerRoot !== parent) {
      // 获取到组件的data属性
      const vnodeData = parent.$vnode && parent.$vnode.data
      if (vnodeData) {
        // 如果有routerView，则表示是由路由渲染出来的
        if (vnodeData.routerView) {
          depth++
        }
        // 是否是keepAlive组件
        if (vnodeData.keepAlive && parent._inactive) {
          // 直接从缓存中取
          inactive = true
        }
      }
      parent = parent.$parent
    }
    // 嵌套深度
    data.routerViewDepth = depth

    // render previous view if the tree is inactive and kept-alive
    // 是否从缓存中去
    if (inactive) {
      return h(cache[name], data, children)
    }
    // depth的嵌套深度对应的组件就是matched数组的下标对应的组件
    const matched = route.matched[depth]
    // render empty node if no matched route
    // 没有相匹配的组件
    if (!matched) {
      cache[name] = null
      return h()
    }
    // 获取匹配的组件
    const component = cache[name] = matched.components[name]

    // attach instance registration hook
    // this will be called in the instance's injected lifecycle hooks
    data.registerRouteInstance = (vm, val) => {
      // val could be undefined for unregistration
      const current = matched.instances[name]
      if (
        (val && current !== vm) ||
        (!val && current === vm)
      ) {
        matched.instances[name] = val
      }
    }

    // also register instance in prepatch hook
    // in case the same component instance is reused across different routes
    ;(data.hook || (data.hook = {})).prepatch = (_, vnode) => {
      // 在多个路由中缓存不同的组件，提高性能
      matched.instances[name] = vnode.componentInstance
    }

    // register instance in init hook
    // in case kept-alive component be actived when routes changed
    data.hook.init = (vnode) => {
      if (vnode.data.keepAlive &&
        vnode.componentInstance &&
        vnode.componentInstance !== matched.instances[name]
      ) {
        // keepAlive缓存新的路由
        matched.instances[name] = vnode.componentInstance
      }
    }

    // resolve props
    let propsToPass = data.props = resolveProps(route, matched.props && matched.props[name])
    if (propsToPass) {
      // clone to prevent mutation
      propsToPass = data.props = extend({}, propsToPass)
      // pass non-declared props as attrs
      const attrs = data.attrs = data.attrs || {}
      for (const key in propsToPass) {
        if (!component.props || !(key in component.props)) {
          attrs[key] = propsToPass[key]
          delete propsToPass[key]
        }
      }
    }
    // 渲染匹配的组件
    return h(component, data, children)
  }
}

function resolveProps (route, config) {
  switch (typeof config) {
    case 'undefined':
      return
    case 'object':
      return config
    case 'function':
      return config(route)
    case 'boolean':
      return config ? route.params : undefined
    default:
      if (process.env.NODE_ENV !== 'production') {
        warn(
          false,
          `props in "${route.path}" is a ${typeof config}, ` +
          `expecting an object, function or boolean.`
        )
      }
  }
}
