import { useEffect, useRef, useState } from 'react';
import characterAnimation from '../assets/objects/character-animation.mp4';
import characterPoster from '../assets/objects/character-poster.png';
import beachScene from '../assets/scenes/beach.png';
import bedroomScene from '../assets/scenes/bedroom.png';
import cafeScene from '../assets/scenes/cafe.png';
import classroomScene from '../assets/scenes/classroom.png';
import forestScene from '../assets/scenes/forest.png';
import gardenScene from '../assets/scenes/garden.png';

const sceneImageSources = {
  classroom: classroomScene,
  bedroom: bedroomScene,
  garden: gardenScene,
  beach: beachScene,
  cafe: cafeScene,
  forest: forestScene,
};

const drawScene = (ctx, width, height, image) => {
  if (!image) {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
};

const isConnectedBackgroundPixel = (data, pixelIndex) => {
  const offset = pixelIndex * 4;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const brightest = Math.max(red, green, blue);
  const darkest = Math.min(red, green, blue);
  return brightest <= 58 && brightest - darkest <= 24;
};

const removeConnectedBlackBackground = (context, width, height) => {
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let queueStart = 0;
  let queueEnd = 0;

  const enqueue = (pixelIndex) => {
    if (visited[pixelIndex] || !isConnectedBackgroundPixel(data, pixelIndex)) return;
    visited[pixelIndex] = 1;
    queue[queueEnd] = pixelIndex;
    queueEnd += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }

  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (queueStart < queueEnd) {
    const pixelIndex = queue[queueStart];
    queueStart += 1;
    data[pixelIndex * 4 + 3] = 0;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    if (x > 0) enqueue(pixelIndex - 1);
    if (x < width - 1) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y < height - 1) enqueue(pixelIndex + width);
  }

  context.putImageData(imageData, 0, 0);
};

const drawCharacter = (ctx, width, height, video, characterCanvas) => {
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;

  const maxWidth = width * 0.8;
  const maxHeight = height * 0.64;
  const side = Math.max(1, Math.round(Math.min(maxWidth, maxHeight)));
  characterCanvas.width = side;
  characterCanvas.height = side;
  const characterContext = characterCanvas.getContext('2d', { willReadFrequently: true });
  characterContext.clearRect(0, 0, side, side);
  characterContext.drawImage(video, 0, 0, side, side);
  removeConnectedBlackBackground(characterContext, side, side);

  const x = (width - side) / 2;
  const y = height * 0.61 - side / 2;
  ctx.drawImage(characterCanvas, x, y, side, side);
  return true;
};

const drawCharacterPoster = (ctx, width, height, image) => {
  if (!image) return false;

  const side = Math.max(1, Math.round(Math.min(width * 0.8, height * 0.64)));
  const x = (width - side) / 2;
  const y = height * 0.61 - side / 2;
  ctx.drawImage(image, x, y, side, side);
  return true;
};

export function BuiltInMaterialCanvas({
  sceneId = 'classroom',
  videoFormat = 'short',
  animate = true,
  onCanvasReady,
  onAnimationError,
  onCompositeReady,
  className = '',
}) {
  const canvasRef = useRef(null);
  const characterCanvasRef = useRef(null);
  const canvasReadyRef = useRef(onCanvasReady);
  const animationErrorRef = useRef(onAnimationError);
  const compositeReadyRef = useRef(onCompositeReady);
  const notifiedCompositeKeyRef = useRef('');
  const [sceneImage, setSceneImage] = useState(null);
  const [characterPosterImage, setCharacterPosterImage] = useState(null);
  const [characterVideo, setCharacterVideo] = useState(null);

  useEffect(() => {
    canvasReadyRef.current = onCanvasReady;
  }, [onCanvasReady]);

  useEffect(() => {
    animationErrorRef.current = onAnimationError;
  }, [onAnimationError]);

  useEffect(() => {
    compositeReadyRef.current = onCompositeReady;
  }, [onCompositeReady]);

  useEffect(() => {
    notifiedCompositeKeyRef.current = '';
  }, [sceneId, videoFormat]);

  useEffect(() => {
    const source = sceneImageSources[sceneId];
    if (!source) {
      setSceneImage(null);
      return undefined;
    }

    const image = new Image();
    setSceneImage(null);
    image.src = source;
    image.onload = () => setSceneImage(image);
    return () => {
      image.onload = null;
    };
  }, [sceneId]);

  useEffect(() => {
    const image = new Image();
    image.src = characterPoster;
    image.onload = () => setCharacterPosterImage(image);
    return () => {
      image.onload = null;
    };
  }, []);

  useEffect(() => {
    if (!animate) {
      setCharacterVideo(null);
      return undefined;
    }

    let cancelled = false;
    const video = document.createElement('video');
    video.src = characterAnimation;
    video.preload = 'auto';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    const markReady = () => {
      if (cancelled) return;
      setCharacterVideo(video);
      video.play().catch(() => undefined);
    };

    const handleError = () => {
      if (!cancelled) animationErrorRef.current?.(new Error('角色動畫載入失敗。'));
    };

    video.addEventListener('loadeddata', markReady, { once: true });
    video.addEventListener('error', handleError, { once: true });
    video.load();

    return () => {
      cancelled = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [animate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const [width, height] = videoFormat === 'short' ? [720, 1280] : [1280, 720];
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    const characterCanvas = characterCanvasRef.current || document.createElement('canvas');
    characterCanvasRef.current = characterCanvas;
    canvasReadyRef.current?.(canvas);
    let frameId;
    let lastRenderedAt = 0;

    const render = (time = 0) => {
      if (animate && time - lastRenderedAt < 1000 / 30) {
        frameId = requestAnimationFrame(render);
        return;
      }

      lastRenderedAt = time;
      drawScene(context, width, height, sceneImage);
      const characterDrawn = animate
        ? drawCharacter(context, width, height, characterVideo, characterCanvas)
        : drawCharacterPoster(context, width, height, characterPosterImage);

      const compositeKey = `${sceneId}|${videoFormat}`;
      if (
        sceneImage &&
        characterDrawn &&
        notifiedCompositeKeyRef.current !== compositeKey
      ) {
        notifiedCompositeKeyRef.current = compositeKey;
        compositeReadyRef.current?.({
          canvas,
          sceneId,
          videoFormat,
          duration: characterVideo?.duration || 0,
        });
      }

      if (animate) frameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameId);
  }, [animate, characterPosterImage, characterVideo, sceneId, sceneImage, videoFormat]);

  return <canvas ref={canvasRef} className={className} />;
}
