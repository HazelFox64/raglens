import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const samplesDirectory = resolve(__dirname, 'public/samples')
const virtualModuleId = 'virtual:sample-files'
const resolvedVirtualModuleId = '\0' + virtualModuleId

function sampleFilesPlugin(): Plugin {
  return {
    name: 'sample-files',

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },

    load(id) {
      if (id !== resolvedVirtualModuleId) return

      const files = readdirSync(samplesDirectory)
        .filter(file => file.endsWith('.py'))
        .sort()

      return `export default ${JSON.stringify(files)}`
    },

    configureServer(server) {
      server.watcher.add(samplesDirectory)

      server.watcher.on('all', (_event, filePath) => {
        if (
          filePath.startsWith(samplesDirectory) &&
          filePath.endsWith('.py')
        ) {
          const module = server.moduleGraph.getModuleById(
            resolvedVirtualModuleId
          )

          if (module) {
            server.moduleGraph.invalidateModule(module)
          }

          server.ws.send({ type: 'full-reload' })
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [vue(), sampleFilesPlugin()]
})
