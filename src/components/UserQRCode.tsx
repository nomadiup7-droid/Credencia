import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface UserQRCodeProps {
  id?: string;
  value: string;
  size?: number;
  className?: string;
}

export default function UserQRCode({
  id,
  value,
  size = 150,
  className = ''
}: UserQRCodeProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let active = true;
    if (!value) return;

    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      color: {
        dark: '#0f172a', // Slate 900
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (active) {
          setQrUrl(url);
        }
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
        if (active) {
          setError('Failed to load QR code');
        }
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  if (error) {
    return (
      <div className={`text-rose-500 text-xs font-semibold ${className}`}>
        {error}
      </div>
    );
  }

  if (!qrUrl) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className={`bg-slate-100 rounded-lg animate-pulse flex items-center justify-center ${className}`}
      >
        <span className="text-[10px] text-slate-400 font-medium">Gerando QR...</span>
      </div>
    );
  }

  return (
    <img
      id={id}
      src={qrUrl}
      alt="QR Code do Participante"
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      className={`rounded-lg bg-white border border-slate-100 p-1 object-contain ${className}`}
    />
  );
}
