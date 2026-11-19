import React, { useRef, useEffect, useState, useCallback } from 'react';
import Button from './Button';

/**
 * SignaturePad - Componente de captura de assinatura digital
 * Compativel com monitor touch (caneta stylus e toque de dedo) e mouse.
 */
export default function SignaturePad({ onSave, onCancel, initialSignature = null }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);

  const getCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Suporte tanto para PointerEvent/MouseEvent quanto TouchEvent
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Ajusta o tamanho interno para manter nitidez em telas de alta resolucao e monitores touch
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1b3b5f'; // Azul marinho hospitalar elegante
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const startDrawing = (e) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    setIsDrawing(true);
    setHasDrawn(true);
    setLastPoint(coords);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const currentPoint = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (ctx && lastPoint) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      // Ponto medio para suavizar traco da caneta
      const midPoint = {
        x: (lastPoint.x + currentPoint.x) / 2,
        y: (lastPoint.y + currentPoint.y) / 2,
      };
      ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midPoint.x, midPoint.y);
      ctx.stroke();
    }

    setLastPoint(currentPoint);
  };

  const stopDrawing = (e) => {
    if (isDrawing) {
      if (e) e.preventDefault();
      setIsDrawing(false);
      setLastPoint(null);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (!hasDrawn && !initialSignature) {
      alert('Por favor, faca a assinatura antes de salvar.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  return (
    <div className="signature-pad-container bg-white rounded-xl p-4 md:p-6 border border-[#d5e7e4] shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h4 className="text-base font-bold text-[#203a60]">Campo de Assinatura do Paciente</h4>
          <p className="text-xs text-gray-500">
            Assine com a caneta stylus no monitor touch ou com o mouse
          </p>
        </div>
        {hasDrawn && (
          <span className="text-xs px-2.5 py-1 bg-green-50 text-green-700 font-medium rounded-full border border-green-200">
            Traço capturado
          </span>
        )}
      </div>

      <div className="signature-canvas-wrapper relative w-full h-48 md:h-56 bg-[#fbfdfd] border-2 border-dashed border-[#a4d4cc] rounded-lg overflow-hidden touch-none select-none">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          style={{ touchAction: 'none' }}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
        />
        <div className="signature-line pointer-events-none absolute bottom-8 left-8 right-8 border-b border-gray-300 flex justify-between items-center text-[11px] text-gray-400 select-none pb-1">
          <span>X Assinatura</span>
          <span>NefroSmart</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
        <Button
          type="button"
          onClick={handleClear}
          className="!bg-gray-100 !text-gray-700 !border-gray-300 hover:!bg-gray-200"
        >
          Limpar
        </Button>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              className="!bg-gray-100 !text-gray-600 !border-gray-200 hover:!bg-gray-200"
            >
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasDrawn && !initialSignature}
            className="!bg-[#087b70] !text-white !border-[#087b70] hover:!bg-[#066158]"
          >
            Confirmar Assinatura
          </Button>
        </div>
      </div>
    </div>
  );
}
