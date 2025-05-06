import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'url'
import {
  compileFile,
  getAllVariants,
  getVariantsToCompile
} from '../../compiler/index.js'
import { CONFIG_OPTIONS } from '../../constants.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isMainModule = fileURLToPath(import.meta.url) === process.argv[1]

const app = express()
const LOCAL_SERVER_PORT = 3000
const FIXTURES_PATH = path.join(__dirname, '/../fixtures')
const VARIANTS = getAllVariants()

export const LOCAL_SERVER_ADDR = `http://localhost:${LOCAL_SERVER_PORT}`

export function runLocalFileServer() {
  app.use(express.static(FIXTURES_PATH))

  app.get('/tracker/js/:name', (req, res) => {
    const name = req.params.name
    const isNewInstallMethod = name === 'plausible-main.js'
    if (isNewInstallMethod) {
      const { endpoint, domain, ...configOptions } = JSON.parse(
        req.query.script_config
      )

      const enabledFeatures = Object.entries({
        ...configOptions,
        config: true
      }).flatMap(([configOptionName, enabled]) => {
        const featureId = CONFIG_OPTIONS[configOptionName].featureId
        if (featureId && enabled) {
          return [featureId]
        }
        return []
      })

      const [variant] = getVariantsToCompile({
        targets: null,
        only: enabledFeatures
      })

      const code = compileFile(variant, { returnCode: true })
      res.send(
        code.replace(
          `"<%= @config_json %>"`,
          JSON.stringify({ endpoint, domain }, null, 0)
        )
      )
    } else {
      const variant = VARIANTS.find((variant) => variant.name === name)
      res.send(compileFile(variant, { returnCode: true }))
    }
  })

  // A test utility - serve an image with an artificial delay
  app.get('/img/slow-image', (_req, res) => {
    setTimeout(() => {
      res.sendFile(path.join(FIXTURES_PATH, '/img/black3x3000.png'))
    }, 100)
  })

  app.listen(LOCAL_SERVER_PORT, function () {
    console.log(`Local server listening on ${LOCAL_SERVER_ADDR}`)
  })
}

if (isMainModule) {
  runLocalFileServer()
}
