'use client'
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContentViewerProps {
  type: 'pdf' | 'video';
  url: string;
  title?: string;
  isExclusive?: boolean;
}

const SecureContentViewer: React.FC<ContentViewerProps> = ({
  type,
  url,
  title,
  isExclusive = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Não foi possível carregar o conteúdo. Por favor, tente novamente mais tarde.');
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className="w-full">
      {isExclusive && (
        <div className="inline-flex items-center mb-4 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-full animate-scale-in">
          <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
          <span className="text-sm font-medium">Conteúdo Exclusivo</span>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className={cn(
          "content-viewer w-full overflow-hidden bg-white no-select relative", 
          isLoading ? "animate-pulse" : "animate-fade-in"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-20 bg-[#313131] hover:bg-[#313131]/90 text-white"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3"></div>
              <p className="text-sm text-gray-500">Carregando conteúdo...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="flex flex-col items-center px-4 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-red-600 font-medium mb-1">Erro ao carregar</p>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          </div>
        )}
        
        {type === 'pdf' ? (
          <div 
            className="pdf-container w-full"
            style={{ 
              aspectRatio: '210 / 297', // A4 aspect ratio (210mm x 297mm)
              maxWidth: '100%',
              margin: '0 auto'
            }}
          >
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
              className={cn("w-full h-full", isLoading ? "opacity-0" : "opacity-100 transition-opacity duration-300")}
              onLoad={handleLoad}
              onError={handleError}
              style={{
                border: 'none',
                userSelect: 'text', // Allow text selection
              }}
              sandbox="allow-same-origin allow-scripts allow-top-navigation"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="w-full aspect-video">
            <video
              src={url}
              className={cn("w-full h-full object-contain", isLoading ? "opacity-0" : "opacity-100 transition-opacity duration-300")}
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              playsInline
              onLoadedData={handleLoad}
              onError={handleError}
              style={{
                userSelect: 'none',
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              Seu navegador não suporta o elemento de vídeo.
            </video>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecureContentViewer;