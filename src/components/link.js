/* @flow */

import { createRoute, isSameRoute, isIncludedRoute } from '../util/route'
import { extend } from '../util/misc'
import { normalizeLocation } from '../util/location'
import { warn } from '../util/warn'

// work around weird flow bug
const toTypes: Array<Function> = [String, Object]
const eventTypes: Array<Function> = [String, Array]

const noop = () => {}

export default {
  name: 'RouterLink',
  // router-link可以接受很多参数
  props: {
    // 表示目标路由的链接,且是必填项
    to: {
      type: toTypes,
      required: true
    },
    // router-link默认会渲染为a标签，通过tag可以渲染的标签
    tag: {
      type: String,
      default: 'a'
    },
    // 包含匹配
    exact: Boolean,
    // 与当前路由相加
    append: Boolean,
    // router.replace而不是push
    replace: Boolean,
    // 链接激活时使用的 CSS 类名
    activeClass: String,
    // 配置当链接被精确匹配的时候应该激活的 class
    exactActiveClass: String,
    // 声明可以用来触发导航的事件
    event: {
      type: eventTypes,
      default: 'click'
    }
  },
  render (h: Function) {
    // 获取router对象
    const router = this.$router
    // 获取当前的路由实例
    const current = this.$route
    // 通过index定义的resolve函数根据跳转前后的路由计算出route对象和相关路径
    // location是前后路由的路径计算出来的的path对象
    // route是匹配的路由对象
    // href是完整的url
    const { location, route, href } = router.resolve(
      this.to,
      current,
      this.append
    )

    const classes = {}
    // 是否配置了activeclass
    const globalActiveClass = router.options.linkActiveClass
    // 是否配置了包含路径的class
    const globalExactActiveClass = router.options.linkExactActiveClass
    // Support global empty active class
    // 没有配置采用默认class
    const activeClassFallback =
      globalActiveClass == null ? 'router-link-active' : globalActiveClass
    const exactActiveClassFallback =
      globalExactActiveClass == null
        ? 'router-link-exact-active'
        : globalExactActiveClass
    const activeClass =
      this.activeClass == null ? activeClassFallback : this.activeClass
    const exactActiveClass =
      this.exactActiveClass == null
        ? exactActiveClassFallback
        : this.exactActiveClass
      // 如果配置了重定向路径则重新计算route对象，否则使用当前匹配的route对象
    const compareTarget = route.redirectedFrom
      ? createRoute(null, normalizeLocation(route.redirectedFrom), null, router)
      : route
     // 当前路由和计算的路由是否是同一个路由
    classes[exactActiveClass] = isSameRoute(current, compareTarget)
    // exact配置了则看compareTarget是否包含了current路由
    classes[activeClass] = this.exact
      ? classes[exactActiveClass]
      : isIncludedRoute(current, compareTarget)

    const handler = e => {
      // 对触发的事件进行过滤，有些事件如果被阻止了不能触发路由跳转
      if (guardEvent(e)) {
        if (this.replace) {
          router.replace(location, noop)
        } else {
          router.push(location, noop)
        }
      }
    }

    const on = { click: guardEvent }
    // 触发路由的跳转事件
    // 如果event是数组，循环每一项添加
    if (Array.isArray(this.event)) {
      this.event.forEach(e => {
        on[e] = handler
      })
    } else {
      on[this.event] = handler
    }
    // 设置class
    const data: any = { class: classes }
    // router-link 通过一个作用域插槽暴露底层的定制能力
    // 这里是对v-slot的处理
    const scopedSlot =
      !this.$scopedSlots.$hasNormal &&
      this.$scopedSlots.default &&
      this.$scopedSlots.default({
        href,
        route,
        navigate: handler,
        isActive: classes[activeClass],
        isExactActive: classes[exactActiveClass]
      })

    if (scopedSlot) {
      if (scopedSlot.length === 1) {
        return scopedSlot[0]
      } else if (scopedSlot.length > 1 || !scopedSlot.length) {
        if (process.env.NODE_ENV !== 'production') {
          warn(
            false,
            `RouterLink with to="${
              this.props.to
            }" is trying to use a scoped slot but it didn't provide exactly one child.`
          )
        }
        return scopedSlot.length === 0 ? h() : h('span', {}, scopedSlot)
      }
    }
    // 如果tag是a标签，则添加href属性
    if (this.tag === 'a') {
      data.on = on
      data.attrs = { href }
    } else {
      // find the first <a> child and apply listener and href
      // 对第一个a标签子节点添加事件监听和href
      const a = findAnchor(this.$slots.default)
      if (a) {
        // in case the <a> is a static node
        // 设置isStatic为false
        a.isStatic = false
        const aData = (a.data = extend({}, a.data))
        aData.on = aData.on || {}
        // transform existing events in both objects into arrays so we can push later
        // 遍历a的事件是否和当前标签的事件重合
        for (const event in aData.on) {
          const handler = aData.on[event]
          if (event in on) {
            aData.on[event] = Array.isArray(handler) ? handler : [handler]
          }
        }
        // append new listeners for router-link
        // 把on定义的事件都添加到a标签里面
        for (const event in on) {
          if (event in aData.on) {
            // on[event] is always a function
            aData.on[event].push(on[event])
          } else {
            aData.on[event] = handler
          }
        }
        // 继承并添加属性
        const aAttrs = (a.data.attrs = extend({}, a.data.attrs))
        aAttrs.href = href
      } else {
        // doesn't have <a> child, apply listener to self
        // 没有a标签的子节点，直接注册事件
        data.on = on
      }
    }
    // 调用render函数的构建方法构建组件
    return h(this.tag, data, this.$slots.default)
  }
}

function guardEvent (e) {
  // don't redirect with control keys
  if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return
  // don't redirect when preventDefault called
  if (e.defaultPrevented) return
  // don't redirect on right click
  if (e.button !== undefined && e.button !== 0) return
  // don't redirect if `target="_blank"`
  if (e.currentTarget && e.currentTarget.getAttribute) {
    const target = e.currentTarget.getAttribute('target')
    if (/\b_blank\b/i.test(target)) return
  }
  // this may be a Weex event which doesn't have this method
  if (e.preventDefault) {
    e.preventDefault()
  }
  return true
}

// 对子节点递归查找是否有a锚点
function findAnchor (children) {
  if (children) {
    let child
    for (let i = 0; i < children.length; i++) {
      child = children[i]
      if (child.tag === 'a') {
        return child
      }
      if (child.children && (child = findAnchor(child.children))) {
        return child
      }
    }
  }
}
