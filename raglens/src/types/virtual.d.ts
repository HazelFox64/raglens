declare module 'virtual:sample-files' {
  const samples: Array<{
    name: string
    isFolder: boolean
    files: string[]
  }>
  export default samples
}
