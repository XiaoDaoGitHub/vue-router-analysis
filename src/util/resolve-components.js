/* @flow */

import { _Vue } from '../install'
import { warn, isError } from './warn'

export function resolveAsyncComponents (matched: Array<RouteRecord>): Function {
  return (to, from, next) => {
    let hasAsync = false
    let pending = 0
    let error = null
    // def 为组件的值
    // _ 为当前实例
    // match 为当前每一个matched
    // key为路由匹配的组件的名称
    // 对所有的match都执行后面的方法
    flatMapComponents(matched, (def, _, match, key) => {
      // if it's a function and doesn't have cid attached,
      // assume it's an async component resolve function.
      // we are not using Vue's default async resolving mechanism because
      // we want to halt the navigation until the incoming component has been
      // resolved.
      // 组件是函数，并且没有cid，说明是异步组件
      if (typeof def === 'function' && def.cid === undefined) {
        // 表示有异步组件
        hasAsync = true
        // 表示正在加载的数量
        pending++
        // resolvedDef为resolve传入的参数数组
        const resolve = once(resolvedDef => {
          // 是不是es6的模块化导入
          if (isESModule(resolvedDef)) {
            // 获取default的内容
            resolvedDef = resolvedDef.default
          }
          // save resolved on async factory in case it's used elsewhere
          // 是函数组件还是普通组件
          def.resolved = typeof resolvedDef === 'function'
            ? resolvedDef
            : _Vue.extend(resolvedDef)
          // 在match对象的key重新复制为加载的组件
          match.components[key] = resolvedDef
          // 加载完成，减一
          pending--
          // 所有的都加载完成，执行next
          if (pending <= 0) {
            next()
          }
        })
        // 重写reject函数
        const reject = once(reason => {
          const msg = `Failed to resolve async component ${key}: ${reason}`
          process.env.NODE_ENV !== 'production' && warn(false, msg)
          if (!error) {
            error = isError(reason)
              ? reason
              : new Error(msg)
            // 失败了执行执行next
            next(error)
          }
        })

        let res
        try {
          // def函数传入处理函数，用户可能自己调用，也可能返回promise
          res = def(resolve, reject)
        } catch (e) {
          reject(e)
        }
        // 用户把控制权交出来
        if (res) {
          // 返回的是promise
          if (typeof res.then === 'function') {
            try {
              // def返回的promise的then方法传入处理函数
            res.then(resolve, reject)
          } else {
            // new syntax in Vue 2.3
            // 返回的是高级写法的对象
            const comp = res.component
            if (comp && typeof comp.then === 'function') {
              comp.then(resolve, reject)
            }
          }
        }
      }
    })

    if (!hasAsync) next()
  }
}

export function flatMapComponents (
  matched: Array<RouteRecord>,
  fn: Function
): Array<?Function> {
  return flatten(matched.map(m => {
    // m 是每一个路由对象，把每一个路由组件传入
    return Object.keys(m.components).map(key => fn(
      m.components[key],
      m.instances[key],
      m, key
    ))
  }))
}

export function flatten (arr: Array<any>): Array<any> {
  return Array.prototype.concat.apply([], arr)
}

const hasSymbol =
  typeof Symbol === 'function' &&
  typeof Symbol.toStringTag === 'symbol'
// 是不是es的模块化导入
function isESModule (obj) {
  return obj.__esModule || (hasSymbol && obj[Symbol.toStringTag] === 'Module')
}

// in Webpack 2, require.ensure now also returns a Promise
// so the resolve/reject functions may get called an extra time
// if the user uses an arrow function shorthand that happens to
// return that Promise.
// 单例模式
function once (fn) {
  let called = false
  return function (...args) {
    if (called) return
    called = true
    return fn.apply(this, args)
  }
}
