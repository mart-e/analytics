import { runThrottledCheck } from "./run-check"

export async function plausibleFunctionCheck(log) {
  log('Checking for Plausible function...')
  const plausibleFound = await waitForPlausibleFunction()

  // v2
  if (plausibleFound.l === true) {
    log('Plausible function with l=true found. Executing test event...')
    const callbackResult = await testPlausibleCallback(log)
    log(`Test event callback response: ${callbackResult.status}`)
    return { plausibleOnWindow: true, hasInit: true, callbackStatus: callbackResult.status }
  }

  if (plausibleFound.init) {
    log('Plausible function with init found. Waiting until init called...')
    const initCalled = await waitForPlausibleInit()
    if (initCalled) {
      const callbackResult = await testPlausibleCallback(log)
      log(`Test event callback response: ${callbackResult.status}`)
      return { plausibleOnWindow: true, hasInit: true, callbackStatus: callbackResult.status }
    } else {
      log('Plausible function with init found, but it was not called')
      return { plausibleOnWindow: true, hasInit: true }
    }
  }
 
  // v1
  if (plausibleFound) {
    log('Plausible function without init found. Executing test event...')
    const callbackResult = await testPlausibleCallback(log)
    log(`Test event callback response: ${callbackResult.status}`)
    return { plausibleOnWindow: true, hasInit: false, callbackStatus: callbackResult.status }
  }

  log('Plausible function not found')
    return { plausibleOnWindow: false}
}

async function waitForPlausibleInit() {
  const checkFn = (opts) => {
    if (window.plausible?.l === true) { return true }
    if (opts.timeout) { return false }
    return 'continue'
  }
  return await runThrottledCheck(checkFn, {timeout: 5000, interval: 100})
}

async function waitForPlausibleFunction() {
  const checkFn = (opts) => {
    if (window.plausible) { return window.plausible }
    if (opts.timeout) { return false }
    return 'continue'
  }
  return await runThrottledCheck(checkFn, {timeout: 5000, interval: 100})
}

function testPlausibleCallback(log) {
  return new Promise((resolve) => {
    let callbackResolved = false

    const callbackTimeout = setTimeout(() => {
      if (!callbackResolved) {
        callbackResolved = true
        log('Timeout waiting for Plausible function callback')
        resolve({ status: undefined })
      }
    }, 5000)

    try {
      window.plausible('verification-agent-test', {
        callback: function(options) {
          if (!callbackResolved) {
            callbackResolved = true
            clearTimeout(callbackTimeout)
            resolve({status: options && options.status ? options.status : -1 })
          }
        }
      })
    } catch (error) {
      if (!callbackResolved) {
        callbackResolved = true
        clearTimeout(callbackTimeout)
        log('Error calling plausible function:', error)
        resolve({ status: -1 })
      }
    }
  })
}