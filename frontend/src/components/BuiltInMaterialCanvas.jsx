import { useEffect, useRef } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const drawScene = (ctx, width, height, sceneId) => {
  const horizon = height * 0.58;
  const fill = (color, x, y, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  if (sceneId === 'classroom') {
    fill('#dbeafe', 0, 0, width, horizon);
    fill('#b7794a', 0, horizon, width, height - horizon);
    fill('#334155', width * 0.2, height * 0.16, width * 0.6, height * 0.23);
    fill('#f8fafc', width * 0.08, height * 0.15, width * 0.12, height * 0.3);
    fill('#f8fafc', width * 0.8, height * 0.15, width * 0.12, height * 0.3);
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(width * 0.1, height * 0.18, width * 0.08, height * 0.24);
    ctx.fillRect(width * 0.82, height * 0.18, width * 0.08, height * 0.24);
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        fill('#8b5e3c', width * (0.14 + column * 0.26), height * (0.64 + row * 0.16), width * 0.17, height * 0.055);
      }
    }
    return;
  }

  if (sceneId === 'bedroom') {
    fill('#fde68a', 0, 0, width, horizon);
    fill('#c08457', 0, horizon, width, height - horizon);
    fill('#f8fafc', width * 0.08, height * 0.16, width * 0.24, height * 0.32);
    fill('#93c5fd', width * 0.1, height * 0.19, width * 0.2, height * 0.26);
    fill('#f3e8ff', width * 0.17, height * 0.6, width * 0.66, height * 0.17);
    fill('#a78bfa', width * 0.17, height * 0.7, width * 0.66, height * 0.13);
    fill('#f8fafc', width * 0.18, height * 0.56, width * 0.22, height * 0.09);
    return;
  }

  if (sceneId === 'garden') {
    fill('#93c5fd', 0, 0, width, horizon);
    fill('#86efac', 0, horizon, width, height - horizon);
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(width * 0.82, height * 0.18, Math.min(width, height) * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#65a30d';
    for (let index = 0; index < 6; index += 1) {
      ctx.beginPath();
      ctx.arc(width * (0.1 + index * 0.18), height * (0.55 + (index % 2) * 0.06), Math.min(width, height) * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (sceneId === 'beach') {
    fill('#7dd3fc', 0, 0, width, height * 0.42);
    fill('#38bdf8', 0, height * 0.42, width, height * 0.25);
    fill('#fde68a', 0, height * 0.67, width, height * 0.33);
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = Math.max(3, height * 0.008);
    for (let index = 0; index < 4; index += 1) {
      const y = height * (0.48 + index * 0.045);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(width * 0.25, y - 8, width * 0.6, y + 8, width, y);
      ctx.stroke();
    }
    return;
  }

  if (sceneId === 'cafe') {
    fill('#f5e6d3', 0, 0, width, horizon);
    fill('#9a6b49', 0, horizon, width, height - horizon);
    fill('#7c2d12', 0, height * 0.54, width, height * 0.12);
    fill('#dbeafe', width * 0.12, height * 0.16, width * 0.34, height * 0.28);
    fill('#dbeafe', width * 0.54, height * 0.16, width * 0.34, height * 0.28);
    ctx.fillStyle = '#f59e0b';
    for (let index = 0; index < 3; index += 1) {
      ctx.beginPath();
      ctx.arc(width * (0.25 + index * 0.25), height * 0.1, Math.min(width, height) * 0.025, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (sceneId === 'forest') {
    fill('#bfdbfe', 0, 0, width, horizon);
    fill('#4ade80', 0, horizon, width, height - horizon);
    for (let index = 0; index < 7; index += 1) {
      const x = width * (0.03 + index * 0.15);
      fill('#7c4a2d', x, height * 0.3, width * 0.045, height * 0.42);
      ctx.fillStyle = index % 2 ? '#15803d' : '#166534';
      ctx.beginPath();
      ctx.arc(x + width * 0.022, height * 0.25, Math.min(width, height) * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (sceneId === 'rooftop') {
    fill('#312e81', 0, 0, width, horizon);
    fill('#1e293b', 0, horizon, width, height - horizon);
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(width * 0.78, height * 0.2, Math.min(width, height) * 0.07, 0, Math.PI * 2);
    ctx.fill();
    for (let index = 0; index < 8; index += 1) {
      fill('#0f172a', width * index * 0.14, height * (0.42 + (index % 3) * 0.05), width * 0.12, height * 0.2);
    }
    return;
  }

  fill('#e2e8f0', 0, 0, width, height);
  fill('#cbd5e1', 0, height * 0.72, width, height * 0.28);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = Math.max(2, width * 0.004);
  for (let index = 0; index < 5; index += 1) {
    ctx.beginPath();
    ctx.moveTo(width * (0.1 + index * 0.2), 0);
    ctx.lineTo(width * (0.3 + index * 0.15), height * 0.72);
    ctx.stroke();
  }
};

const drawObject = (ctx, width, height, objectId, position, time) => {
  if (!objectId) return;

  const size = Math.min(width, height) * 0.17;
  const x = position.x * width;
  const y = position.y * height;
  const wave = Math.sin(time * 4);
  const fillCircle = (color, cx, cy, radius) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  ctx.save();
  ctx.translate(x, y);

  if (objectId === 'cat') {
    fillCircle('#f59e0b', 0, 0, size * 0.34);
    fillCircle('#fbbf24', size * 0.28, -size * 0.22, size * 0.22);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(size * 0.12, -size * 0.37);
    ctx.lineTo(size * 0.2, -size * 0.61);
    ctx.lineTo(size * 0.31, -size * 0.37);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.36, -size * 0.37);
    ctx.lineTo(size * 0.46, -size * 0.61);
    ctx.lineTo(size * 0.52, -size * 0.31);
    ctx.fill();
    fillCircle('#111827', size * 0.21, -size * 0.2, size * 0.025);
    fillCircle('#111827', size * 0.37, -size * 0.2, size * 0.025);
    ctx.save();
    ctx.translate(-size * 0.3, size * 0.04);
    ctx.rotate(-0.45 + wave * 0.55);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = size * 0.11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-size * 0.55, -size * 0.3, -size * 0.45, -size * 0.72);
    ctx.stroke();
    ctx.restore();
  } else if (objectId === 'tree') {
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-size * 0.1, -size * 0.1, size * 0.2, size * 0.72);
    for (let index = 0; index < 3; index += 1) {
      fillCircle('#22c55e', (index - 1) * size * 0.22 + wave * size * 0.035, -size * (0.35 + (index % 2) * 0.15), size * 0.28);
    }
  } else if (objectId === 'balloon') {
    fillCircle('#f43f5e', 0, -size * 0.22, size * 0.3);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = Math.max(2, size * 0.015);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.08);
    ctx.quadraticCurveTo(wave * size * 0.16, size * 0.4, wave * size * 0.12, size * 0.66);
    ctx.stroke();
  } else if (objectId === 'fish') {
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.36, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(-size * 0.34, 0);
    ctx.rotate(wave * 0.45);
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size * 0.3, -size * 0.22);
    ctx.lineTo(-size * 0.3, size * 0.22);
    ctx.fill();
    ctx.restore();
    fillCircle('#0f172a', size * 0.18, -size * 0.04, size * 0.028);
  } else if (objectId === 'rocket') {
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.2, size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    fillCircle('#38bdf8', 0, -size * 0.12, size * 0.075);
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(0, size * 0.42);
    ctx.lineTo(-size * 0.11, size * (0.7 + wave * 0.1));
    ctx.lineTo(size * 0.11, size * (0.7 + wave * 0.1));
    ctx.fill();
  } else if (objectId === 'lamp') {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-size * 0.045, -size * 0.05, size * 0.09, size * 0.52);
    ctx.fillRect(-size * 0.24, size * 0.45, size * 0.48, size * 0.08);
    ctx.fillStyle = `rgba(250, 204, 21, ${0.22 + (wave + 1) * 0.13})`;
    ctx.beginPath();
    ctx.moveTo(-size * 0.28, -size * 0.05);
    ctx.lineTo(size * 0.28, -size * 0.05);
    ctx.lineTo(size * 0.16, -size * 0.42);
    ctx.lineTo(-size * 0.16, -size * 0.42);
    ctx.fill();
  } else if (objectId === 'cloud') {
    fillCircle('#f8fafc', -size * 0.2, 0, size * 0.22);
    fillCircle('#f8fafc', 0, -size * 0.12, size * 0.28);
    fillCircle('#f8fafc', size * 0.23, 0, size * 0.22);
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = size * 0.035;
    for (let index = 0; index < 3; index += 1) {
      const drop = ((time * 0.55 + index * 0.25) % 1) * size * 0.55;
      ctx.beginPath();
      ctx.moveTo((index - 1) * size * 0.16, size * 0.18 + drop);
      ctx.lineTo((index - 1) * size * 0.16, size * 0.32 + drop);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = size * 0.05;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.5);
    ctx.quadraticCurveTo(wave * size * 0.1, 0, 0, -size * 0.1);
    ctx.stroke();
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6 + wave * 0.13;
      fillCircle('#f472b6', Math.cos(angle) * size * 0.2, -size * 0.1 + Math.sin(angle) * size * 0.2, size * 0.12);
    }
    fillCircle('#facc15', 0, -size * 0.1, size * 0.11);
  }

  ctx.restore();
};

export function BuiltInMaterialCanvas({
  sceneId = 'studio',
  objectId = '',
  position = { x: 0.5, y: 0.66 },
  items = [],
  videoFormat = 'short',
  interactive = false,
  animate = true,
  onPositionChange,
  onActiveItemChange,
  onItemPositionChange,
  onItemPositionCommit,
  onItemDragStart,
  onCanvasReady,
  className = '',
}) {
  const canvasRef = useRef(null);
  const canvasReadyRef = useRef(onCanvasReady);
  const draggingItemRef = useRef('');

  useEffect(() => {
    canvasReadyRef.current = onCanvasReady;
  }, [onCanvasReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const [width, height] = videoFormat === 'short' ? [720, 1280] : [1280, 720];
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    canvasReadyRef.current?.(canvas);
    let frameId;
    const canvasItems =
      items.length > 0 ? items : objectId ? [{ id: 'preview', objectId, position }] : [];

    const render = (now) => {
      drawScene(context, width, height, sceneId);
      canvasItems.forEach((item) =>
        drawObject(context, width, height, item.objectId, item.position, now / 1000),
      );
      if (animate) frameId = requestAnimationFrame(render);
    };

    render(performance.now());
    return () => cancelAnimationFrame(frameId);
  }, [animate, items, objectId, position, sceneId, videoFormat]);

  const getPointerPosition = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width, 0.12, 0.88),
      y: clamp((event.clientY - bounds.top) / bounds.height, 0.16, 0.86),
    };
  };

  const handlePointerDown = (event) => {
    if (!interactive) return;
    const nextPosition = getPointerPosition(event);
    const [width, height] = videoFormat === 'short' ? [720, 1280] : [1280, 720];
    const hitRadius = Math.min(width, height) * 0.13;
    const selectedItem = items.find((item) => {
      const distance = Math.hypot(
        (nextPosition.x - item.position.x) * width,
        (nextPosition.y - item.position.y) * height,
      );
      return distance <= hitRadius;
    });

    if (selectedItem) {
      draggingItemRef.current = selectedItem.id;
      event.currentTarget.setPointerCapture(event.pointerId);
      onActiveItemChange?.(selectedItem.id);
      onItemDragStart?.(selectedItem.id);
      return;
    }

    onPositionChange?.(nextPosition);
  };

  const handlePointerMove = (event) => {
    const itemId = draggingItemRef.current;
    if (!itemId) return;
    onItemPositionChange?.(itemId, getPointerPosition(event));
  };

  const finishDrag = (event) => {
    const itemId = draggingItemRef.current;
    if (!itemId) return;
    draggingItemRef.current = '';
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onItemPositionCommit?.(itemId, getPointerPosition(event));
  };

  return (
    <canvas
      ref={canvasRef}
      className={className}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      role={interactive ? 'application' : undefined}
    />
  );
}
