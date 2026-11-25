import { defineConfig, normalizePath, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const samplesDirectory = resolve(__dirname, 'public/samples')
const virtualModuleId = 'virtual:sample-files'
const resolvedVirtualModuleId = '\0' + virtualModuleId

function pythonFiles(directory: string, prefix = ''): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = prefix + entry.name
    if (entry.isDirectory()) return pythonFiles(resolve(directory, entry.name), path + '/')
    return entry.isFile() && /\.py$/i.test(entry.name) ? [path] : []
  })
}

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

      const samples = readdirSync(samplesDirectory, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name, 'en'))
        .flatMap(entry => {
          if (entry.isDirectory()) {
            const files = pythonFiles(resolve(samplesDirectory, entry.name))
              .sort((a, b) => a.localeCompare(b, 'en'))
            return files.length ? [{ name: entry.name, isFolder: true, files }] : []
          }

          return entry.isFile() && /\.py$/i.test(entry.name)
            ? [{ name: entry.name, isFolder: false, files: [entry.name] }]
            : []
        })

      return `export default ${JSON.stringify(samples)}`
    },

    configureServer(server) {
      server.watcher.add(samplesDirectory)
      const samplePrefix = normalizePath(samplesDirectory) + '/'

      server.watcher.on('all', (_event, filePath) => {
        if (
          normalizePath(resolve(filePath)).startsWith(samplePrefix) &&
          /\.py$/i.test(filePath)
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
  base: '/raglens/',
  worker: { format: 'es' },
  // Discover worker dependencies up front, before a user starts an in-memory run.
  optimizeDeps: { include: ['@huggingface/transformers', 'web-tree-sitter'] },
  plugins: [vue(), sampleFilesPlugin()]
})
