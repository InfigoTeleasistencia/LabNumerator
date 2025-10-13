import { useEffect, useRef, useState } from 'react';

interface UseBarcodeScanner {
  onScan: (code: string) => void;
  minLength?: number;
  timeout?: number;
}

/**
 * Hook para capturar códigos de barras desde un lector USB
 * El lector actúa como teclado, escribiendo el código y presionando Enter
 */
export function useBarcodeScanner({ 
  onScan, 
  minLength = 3,
  timeout = 100 
}: UseBarcodeScanner) {
  const [isScanning, setIsScanning] = useState(false);
  const bufferRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // A menos que tenga el atributo data-barcode-input
        if (!target.hasAttribute('data-barcode-input')) {
          return;
        }
      }

      // Enter indica fin del escaneo
      if (event.key === 'Enter') {
        event.preventDefault();
        
        if (bufferRef.current.length >= minLength) {
          const code = bufferRef.current.trim();
          if (code) {
            onScan(code);
          }
        }
        
        bufferRef.current = '';
        setIsScanning(false);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }

      // Caracteres imprimibles
      if (event.key.length === 1) {
        event.preventDefault();
        setIsScanning(true);
        bufferRef.current += event.key;

        // Reset timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Si pasa mucho tiempo sin más caracteres, limpiar buffer
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = '';
          setIsScanning(false);
        }, timeout);
      }
    };

    window.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onScan, minLength, timeout]);

  return { isScanning };
}


