import uglify from 'uglify-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { canSkipCompile } from './can-skip-compile.js'
import progress from 'cli-progress'
import { spawn, Worker, Pool } from 'threads'
import generatorics from 'generatorics'
import { DEFAULT_GLOBALS, FEATURES_BY_ID } from '../constants.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function compileAll(options = {}) {
  if (process.env.NODE_ENV === 'dev' && canSkipCompile()) {
    console.info(
      'COMPILATION SKIPPED: No changes detected in tracker dependencies'
    )
    return
  }

  const variants = getVariantsToCompile(options)
  const baseCode = getCode()

  const startTime = Date.now()
  console.log(`Starting compilation of ${variants.length} variants...`)

  const bar = new progress.SingleBar(
    { clearOnComplete: true },
    progress.Presets.shades_classic
  )
  bar.start(variants.length, 0)

  const workerPool = Pool(() => spawn(new Worker('./worker-thread.js')))
  variants.forEach((variant) => {
    workerPool.queue(async (worker) => {
      await worker.compileFile(variant, { ...options, baseCode })
      bar.increment()
    })
  })

  await workerPool.completed()
  await workerPool.terminate()
  bar.stop()

  console.log(
    `Completed compilation of ${variants.length} variants in ${(
      (Date.now() - startTime) /
      1000
    ).toFixed(2)}s`
  )
}

export function compileFile(variant, options) {
  const baseCode = options.baseCode || getCode()

  const code = minify(baseCode, variant.globals)

  if (options.returnCode) {
    return code
  } else {
    fs.writeFileSync(
      relPath(`../../priv/tracker/js/${variant.name}${options.suffix || ''}`),
      code
    )
  }
}

export function getAllVariants() {
  const allVariants = [
    ...generatorics.clone.powerSet(Object.keys(FEATURES_BY_ID))
  ].map((featureIdsSet) => {
    const featureIds = featureIdsSet.sort()
    const name =
      featureIds.length > 0
        ? `plausible.${featureIds.join('.')}.js`
        : 'plausible.js'

    const globalsToTurnOnFeatures = featureIds.reduce((acc, featureId) => {
      const feature = FEATURES_BY_ID[featureId]
      if (!feature) {
        throw new Error(`Unknown feature "${featureId}`)
      }
      return {
        ...acc,
        ...feature.globals
      }
    }, {})

    return {
      name,
      featureIds,
      globals: {
        ...DEFAULT_GLOBALS,
        ...globalsToTurnOnFeatures
      }
    }
  })

  return allVariants
}

export function getVariantsToCompile(options) {
  let targetVariants = getAllVariants()
  if (options.targets !== null) {
    targetVariants = targetVariants.filter((variant) =>
      options.targets.every((target) => variant.featureIds.includes(target))
    )
  }
  if (options.only !== null) {
    targetVariants = targetVariants.filter((variant) =>
      equalLists(variant.featureIds, options.only.sort())
    )
  }

  return targetVariants
}

function getCode() {
  // Wrap the code in an instantly evaluating function
  return `(function(){${fs
    .readFileSync(relPath('../src/plausible.js'))
    .toString()}})()`
}

function minify(baseCode, globals) {
  const result = uglify.minify(baseCode, {
    compress: {
      global_defs: globals
    }
  })

  if (result.code) {
    return result.code
  } else {
    throw result.error
  }
}

function equalLists(a, b) {
  if (a.length != b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

function relPath(segment) {
  return path.join(__dirname, segment)
}
