declare module 'dom-to-image-more' {
  interface Options {
    bgcolor?: string
    scale?: number
    width?: number
    height?: number
    style?: Record<string, string>
    filter?: (node: Node) => boolean
    quality?: number
  }

  function toBlob(node: Node, options?: Options): Promise<Blob>
  function toPng(node: Node, options?: Options): Promise<string>
  function toJpeg(node: Node, options?: Options): Promise<string>
  function toSvg(node: Node, options?: Options): Promise<string>
  function toPixelData(node: Node, options?: Options): Promise<Uint8ClampedArray>

  export default {
    toBlob,
    toPng,
    toJpeg,
    toSvg,
    toPixelData,
  }
}
