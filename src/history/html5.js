/* @flow */

import type Router from '../index'
import { History } from './base'
import { cleanPath } from '../util/path'
import { START } from '../util/route'
import { setupScroll, handleScroll } from '../util/scroll'
import { pushState, replaceState, supportsPushState } from '../util/push-state'

export class HTML5History extends History {
  constructor (router: Router, base: ?string) {
    // 调用Historoy的构造函数
    super(router, base)
    // 获取opitns的滚动行为
    const expectScroll = router.options.scrollBehavior
    // 是否支持Scroll
    const supportsScroll = supportsPushState && expectScroll

    if (supportsScroll) {
      // 存储页面的水平和垂直偏移距离
      setupScroll()
    }
    // 获取到url
    const initLocation = getLocation(this.base)
    // 监听浏览器后退事件
    window.addEventListener('popstate', e => {
      // 获取当前的route对象
      const current = this.current

      // Avoiding first `popstate` event dispatched in some browsers but first
      // history route not updated since async guard at the same time.
       // 获取到url
      const location = getLocation(this.base)
      // 避免first history异步未更新的bug
      if (this.current === START && location === initLocation) {
        return
      }
      // location是当前的url
      this.transitionTo(location, route => {
        if (supportsScroll) {
          handleScroll(router, route, current, true)
        }
      })
    })
  }

  go (n: number) {
    // 直接调用histyory的api
    window.history.go(n)
  }
  // 
  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    // 获取当前current路由信息
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      // 调用h5的pushState方法改变路由
      pushState(cleanPath(this.base + route.fullPath))
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      replaceState(cleanPath(this.base + route.fullPath))
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  ensureURL (push?: boolean) {
    if (getLocation(this.base) !== this.current.fullPath) {
      const current = cleanPath(this.base + this.current.fullPath)
      push ? pushState(current) : replaceState(current)
    }
  }

  getCurrentLocation (): string {
    return getLocation(this.base)
  }
}

export function getLocation (base: string): string {
  // 对pathname进行解码，获取到真实的path
  let path = decodeURI(window.location.pathname)
  // path是否是base开头
  if (base && path.indexOf(base) === 0) {
    // 获取path除去base路径后剩余的部分
    path = path.slice(base.length)
  }
  // 返回path和search以及hash拼接的结果
  return (path || '/') + window.location.search + window.location.hash
}
