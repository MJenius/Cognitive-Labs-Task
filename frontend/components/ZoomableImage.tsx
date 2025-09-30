"use client";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function ZoomableImage({ src, alt, className = "" }: ZoomableImageProps) {
  return (
    <div className="relative mb-2">
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={5}
        doubleClick={{
          disabled: false,
          mode: "zoomIn",
          step: 0.7,
        }}
        wheel={{
          wheelDisabled: false,
          step: 0.1,
        }}
        pinch={{
          disabled: false,
          step: 0.1,
        }}
        panning={{
          disabled: false,
          velocityDisabled: false,
        }}
        limitToBounds={false}
        centerOnInit={true}
        smooth={true}
        alignmentAnimation={{
          disabled: false,
          sizeX: 100,
          sizeY: 100,
          velocityAlignmentTime: 200,
        }}
      >
        {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
          <div className="relative">
            {/* Zoom Controls */}
            <div className="absolute right-2 top-2 z-10 flex flex-col gap-1 rounded-lg bg-white/90 p-1 shadow-lg dark:bg-gray-800/90">
              <button
                onClick={() => zoomIn()}
                className="rounded bg-gray-100 p-1.5 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={() => zoomOut()}
                className="rounded bg-gray-100 p-1.5 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                </svg>
              </button>
              <button
                onClick={() => resetTransform()}
                className="rounded bg-gray-100 p-1.5 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                title="Reset Zoom"
                aria-label="Reset Zoom"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Instructions overlay */}
            <div className="absolute bottom-2 left-2 z-10 rounded-lg bg-black/70 px-2 py-1 text-xs text-white">
              <div> Mouse Wheel: Zoom</div>
              <div> Drag: Pan</div>
              <div>Double-click: Zoom</div>
            </div>

            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full flex items-center justify-center"
            >
              <img
                src={src}
                alt={alt}
                className={`mx-auto max-w-none select-none ${className}`}
                draggable={false}
                style={{ cursor: 'grab' }}
                onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
                onMouseLeave={(e) => e.currentTarget.style.cursor = 'grab'}
              />
            </TransformComponent>
          </div>
        )}
      </TransformWrapper>
    </div>
  );
}