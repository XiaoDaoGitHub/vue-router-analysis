/* @flow */

export function runQueue (queue: Array<?NavigationGuard>, fn: Function, cb: Function) {
  const step = index => {
    // queue调用完成，直接执行回调函数
    if (index >= queue.length) {
      cb()
    } else {
      // queue有对应的函数
      if (queue[index]) {
        fn(queue[index], () => {
          // 回调函数执行下一个任务
          step(index + 1)
        })
        // 没有直接跳过
      } else {
        step(index + 1)
      }
    }
  }
  step(0)
}
