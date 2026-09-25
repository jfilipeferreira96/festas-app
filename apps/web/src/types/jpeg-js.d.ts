// Tipos mínimos para o jpeg-js (encoder JPEG puro em JS - sem binários nativos).
declare module "jpeg-js" {
  interface JpegImageData {
    /** Pixels RGBA (4 bytes por pixel), linha a linha. */
    data: Uint8Array;
    width: number;
    height: number;
  }
  interface JpegEncodedImage {
    data: Uint8Array;
    width: number;
    height: number;
  }
  const jpegJs: {
    encode(image: JpegImageData, quality?: number): JpegEncodedImage;
    decode(
      data: Uint8Array,
      options?: { useTArray?: boolean; formatAsRGBA?: boolean }
    ): JpegEncodedImage;
  };
  export default jpegJs;
}
