import { encodeGif } from './gif-encoder.js';

function toGifName(name) {
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  return `${withoutExtension || "imagen"}.gif`;
}

export async function convertImage(entry) {
  let blob;
  if (typeof entry.source === "string") {
    let response;
    try {
      const imageUrl = entry.wikiFileTitle
        ? await fetchWikiImageUrl(entry.source, entry.wikiFileTitle)
        : entry.source;
      response = await fetch(imageUrl);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("La wiki no encontró")) throw error;
      throw new Error("No se pudo leer el enlace. Comprueba tu conexión y que el servidor permita CORS.", { cause: error });
    }
    if (!response.ok) throw new Error(`El servidor respondió con el estado ${response.status}.`);
    blob = await response.blob();
    if (!blob.type.startsWith("image/")) throw new Error("El enlace no apunta a un archivo de imagen.");
  } else {
    blob = entry.source;
  }

  const mimeType = blob.type.startsWith("image/") ? blob.type : imageTypeFromUrl(entry.source);
  if (!mimeType.startsWith("image/")) throw new Error("El enlace no apunta a un archivo de imagen.");
  const imageBlob = blob.type ? blob : blob.slice(0, blob.size, mimeType);
  const canDecodeFrames = typeof ImageDecoder === "function" && await ImageDecoder.isTypeSupported(mimeType);
  if (!canDecodeFrames && (mimeType === "image/gif" || mimeType === "image/webp")) {
    throw new Error("Este navegador no puede conservar la animación; usa la versión reciente de Chrome o Edge.");
  }
  const frames = canDecodeFrames ? await decodeFrames(imageBlob) : await decodeStillImage(imageBlob);
  return {
    name: toGifName(entry.file.name),
    bytes: encodeGif(frames),
    frameCount: frames.length
  };
}

async function fetchWikiImageUrl(pageUrl, fileTitle) {
  const apiUrl = new URL("/api.php", pageUrl);
  apiUrl.search = new URLSearchParams({
    action: "query",
    titles: fileTitle,
    prop: "imageinfo",
    iiprop: "url",
    format: "json",
    origin: "*"
  }).toString();
  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error(`La wiki respondió con el estado ${response.status}.`);
  const data = await response.json();
  const pages = data?.query?.pages;
  const page = pages && Object.values(pages)[0];
  const imageUrl = page?.imageinfo?.[0]?.url;
  if (!imageUrl) throw new Error("La wiki no encontró el archivo de imagen indicado.");
  return imageUrl;
}

function imageTypeFromUrl(source) {
  if (typeof source !== "string") return "";
  const extension = new URL(source).pathname.split(".").pop()?.toLowerCase();
  return ({
    apng: "image/apng",
    avif: "image/avif",
    bmp: "image/bmp",
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webp: "image/webp"
  })[extension || ""] || "";
}

async function decodeFrames(blob) {
  let decoder;
  try {
    decoder = new ImageDecoder({ data: blob.stream(), type: blob.type });
    await decoder.tracks.ready;
    const firstFrame = await decoder.decode({ frameIndex: 0 });
    firstFrame.image.close();
    const frameCount = decoder.tracks.selectedTrack?.frameCount || 0;
    if (!frameCount) throw new Error("El archivo no contiene fotogramas.");
    const frames = [];
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
      const { image } = await decoder.decode({ frameIndex });
      try {
        const width = image.displayWidth;
        const height = image.displayHeight;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("El navegador no pudo preparar un fotograma.");
        context.drawImage(image, 0, 0, width, height);
        const duration = image.duration || 100000;
        frames.push({
          width,
          height,
          pixels: context.getImageData(0, 0, width, height).data,
          delay: Math.max(2, Math.min(65535, Math.round(duration / 10000)))
        });
      } finally {
        image.close();
      }
    }
    return frames;
  } catch (error) {
    if (error instanceof Error && error.message.includes("animación")) throw error;
    throw new Error("No se pudo decodificar la imagen o sus fotogramas animados.", { cause: error });
  } finally {
    decoder?.close();
  }
}

async function decodeStillImage(blob) {
  const sourceUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) throw new Error("La imagen no tiene dimensiones válidas.");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("El navegador no pudo preparar la imagen.");
    context.drawImage(image, 0, 0);
    return [{ width, height, pixels: context.getImageData(0, 0, width, height).data, delay: 10 }];
  } catch (error) {
    throw new Error("Formato de imagen no compatible o archivo dañado.", { cause: error });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
