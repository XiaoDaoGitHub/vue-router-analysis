/* @flow */

import { inBrowser } from './dom'
import { saveScrollPosition } from './scroll'
import { genStateKey, setStateKey, getStateKey } from './state-key'
import { extend } from './misc'

// 判断是否支持pushState，也就是history模式
export const supportsPushState =
  inBrowser &&
  (function () {
    // 获取用户代理
    const ua = window.navigator.userAgent
    // 以下是不支持pushState的情况
    if (
      (ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) &&
      ua.indexOf('Mobile Safari') !== -1 &&
      ua.indexOf('Chrome') === -1 &&
      ua.indexOf('Windows Phone') === -1
    ) {
      return false
    }
    // 或者直接判断window.history是否含有pushState属性
    return window.history && 'pushState' in window.history
  })()

export function pushState (url?: string, replace?: boolean) {
  // 跳转之前保存当前的页面x，y偏移量
  saveScrollPosition()
  // try...catch the pushState call to get around Safari
  // DOM Exception 18 where it limits to 100 pushState calls
  const history = window.history
  try {
    // 替换当前url，而不是创建新的
    if (replace) {
      // preserve existing history state as it could be overriden by the user
      // copy一份history的state
      const stateCopy = extend({}, history.state)
      // 生成key
      stateCopy.key = getStateKey()
      // 调用history.replaceState
      history.replaceState(stateCopy, '', url)
    } else {
      // 调用浏览器的pushState
      history.pushState({ key: setStateKey(genStateKey()) }, '', url)
    }
  } catch (e) {
    window.location[replace ? 'replace' : 'assign'](url)
  }
}

export function replaceState (url?: string) {
  pushState(url, true)
}
