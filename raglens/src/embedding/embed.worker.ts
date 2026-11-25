import { env, pipeline } from '@huggingface/transformers'
import { embeddingModel } from './index'
import type { EmbeddingMessage, EmbeddingRequest } from './index'

const batchSize = 4

// The GitHub Pages build must also work without cross-origin isolation.
if (env.backends.onnx.wasm && !self.crossOriginIsolated) {
  env.backends.onnx.wasm.numThreads = 1
}

function post(message: EmbeddingMessage, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer })
}

function loadExtractor() {
  return pipeline('feature-extraction', embeddingModel.id, {
    revision: embeddingModel.revision,
    dtype: embeddingModel.dtype,
    device: 'wasm'
  })
}

let extractorPromise: ReturnType<typeof loadExtractor> | undefined

self.addEventListener('message', async ({ data: request }: MessageEvent<EmbeddingRequest>) => {
  let modelReady = false
  try {
    const extractor = await (extractorPromise ??= loadExtractor())
    modelReady = true

    if (request.type === 'query') {
      const tokenCount = extractor.tokenizer.encode(request.text).length
      const vector = await embedBatch(extractor, [request.text])
      post({ type: 'query', vector, tokenCount }, [vector.buffer])
      return
    }

    post({ type: 'ready' })
    for (let offset = 0; offset < request.texts.length; offset += batchSize) {
      const batch = request.texts.slice(offset, offset + batchSize)
      const tokenCounts = batch.map(text => extractor.tokenizer.encode(text).length)
      const tokenPreviews = batch.map(text => extractor.tokenizer.tokenize(text, {
        add_special_tokens: true
      }).slice(0, 12))
      const vectors = await embedBatch(extractor, batch)
      post({ type: 'batch', offset, tokenCounts, tokenPreviews, vectors }, [vectors.buffer])
    }
  } catch (error) {
    if (!modelReady) extractorPromise = undefined
    console.error('MiniLM embedding failed', error)
    post({
      type: 'error',
      request: request.type,
      message: modelReady
        ? request.type === 'query' ? 'Could not embed that question. Try again.' : 'MiniLM stopped before it could embed all chunks. You can retry.'
        : 'Could not load MiniLM. Check your connection and try again.'
    })
  }
})

async function embedBatch(extractor: Awaited<ReturnType<typeof loadExtractor>>, batch: string[]) {
  const inputs = extractor.tokenizer(batch, {
    padding: true,
    truncation: true,
    max_length: embeddingModel.tokenLimit
  })
  const { last_hidden_state: hidden } = await extractor.model(inputs)
  if (!(hidden?.data instanceof Float32Array)) {
    throw new Error('MiniLM did not return token embeddings.')
  }
  const [rows, tokenCount, dimensions] = hidden.dims
  if (rows !== batch.length || !tokenCount || dimensions !== embeddingModel.dimensions) {
    throw new Error('Unexpected MiniLM output dimensions.')
  }

  return poolEmbeddings(hidden.data, inputs.attention_mask.data, rows, tokenCount)
}

function poolEmbeddings(
  hidden: Float32Array,
  mask: ArrayLike<number | bigint>,
  rows: number,
  tokens: number
) {
  const dimensions = embeddingModel.dimensions
  const vectors = new Float32Array(rows * dimensions)

  for (let row = 0; row < rows; row++) {
    const vector = vectors.subarray(row * dimensions, (row + 1) * dimensions)
    for (let token = 0; token < tokens; token++) {
      const tokenIndex = row * tokens + token
      if (!mask[tokenIndex]) continue

      for (let dim = 0; dim < dimensions; dim++) {
        vector[dim] = vector[dim]! + hidden[tokenIndex * dimensions + dim]!
      }
    }

    // For a normalised vector, summing and then normalising gives the same result as taking the mean.
    const norm = Math.sqrt(vector.reduce((total, value) => total + value * value, 0))
    if (!Number.isFinite(norm) || norm === 0) throw new Error('Invalid MiniLM embedding.')
    for (let dim = 0; dim < dimensions; dim++) vector[dim] = vector[dim]! / norm
  }

  return vectors
}
