import React from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  showValueText?: boolean;
}

export default function QRCodeGen({ value, size = 150, showValueText = true }: QRCodeProps) {
  // Generate a reliable, universally scannable QR Code using the trusted qrserver API.
  // This allows the user to actually test with their smartphone camera on the sandbox screen!
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=10`;

  return (
    <div className="flex flex-col items-center justify-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
      <img
        src={qrUrl}
        alt={`QR Code: ${value}`}
        width={size}
        height={size}
        className="object-contain"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
      />
      {showValueText && (
        <span className="mt-1 font-mono text-[10px] text-gray-400 select-all print:hidden">{value}</span>
      )}
    </div>
  );
}
