"use client";

import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import clsx from 'clsx';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

export default function ProductImage({ src, alt, className }: ProductImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Reset state on src change
    setHasError(false);
    if (!src) {
      setIsLoading(false);
      return;
    }

    // If image is already cached / complete in DOM, stop loading immediately
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth > 0) {
        setIsLoading(false);
      } else {
        setHasError(true);
        setIsLoading(false);
      }
    }
  }, [src]);

  const showPlaceholder = !src || hasError;

  return (
    <div className={clsx('relative bg-gray-100 overflow-hidden flex items-center justify-center', className)}>
      {showPlaceholder ? (
        <ImageIcon className="w-8 h-8 text-gray-300" />
      ) : (
        <>
          {isLoading && (
            <div className="absolute inset-0 bg-gray-200/80 animate-pulse pointer-events-none" />
          )}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            decoding="async"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            className={clsx(
              'object-cover w-full h-full transition-opacity duration-300',
              isLoading ? 'opacity-40' : 'opacity-100'
            )}
          />
        </>
      )}
    </div>
  );
}
