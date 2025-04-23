const uglify = require('uglify-js')
const fs = require('fs')
const path = require('path')
const g = require('generatorics')
const { canSkipCompile } = require('./dev-compile/can-skip-compile')
const { tracker_script_version } = require('./package.json')
const { DEFAULT_BOOLEAN_SETTINGS } = require('./script-settings')

if (process.env.NODE_ENV === 'dev' && canSkipCompile()) {
  console.info(
    'COMPILATION SKIPPED: No changes detected in tracker dependencies'
  )
  process.exit(0)
}

function relPath(segment) {
  return path.join(__dirname, segment)
}

function compileScriptVariant(input, output, enabledBooleanSettings = {}) {
  const code = fs.readFileSync(input).toString()
  const globalDefinitions = {
    ...DEFAULT_BOOLEAN_SETTINGS,
    ...enabledBooleanSettings,
    TRACKER_SCRIPT_VERSION: tracker_script_version
  }

  const result = uglify.minify(code, {
    compress: {
      global_defs: globalDefinitions
    }
  })

  if (result.code) {
    fs.writeFileSync(output, result.code)
  } else {
    throw new Error(
      `Failed to compile ${output.split('/').pop()}.\n${result.error}\n`
    )
  }
}

const booleanSettingsVariants = [
  ...g.clone.powerSet(Object.keys(DEFAULT_BOOLEAN_SETTINGS))
].map((a) => a.sort())

booleanSettingsVariants.map((variant) => {
  const enabledSettings = variant.reduce(
    (settings, optionName) => ({ ...settings, [optionName]: true }),
    {}
  )
  const input = relPath('src/plausible.js')
  const scriptVariantName =
    variant.length === 0
      ? 'plausible.js'
      : `plausible.${variant
          .map((optionName) => optionName.replace('_', '-'))
          .join('.')}.js`
  const output = relPath(`../priv/tracker/js/${scriptVariantName}`)
  compileScriptVariant(input, output, enabledSettings)
})
