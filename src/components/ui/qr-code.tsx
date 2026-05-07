import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeComponent: React.FC<QRCodeProps> = ({ 
  value, 
  size = 200, 
  className = "" 
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        setLoading(true);
        setError('');
        const url = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(url);
      } catch (err) {
        console.error('Error generating QR code:', err);
        setError('فشل في إنشاء رمز QR');
      } finally {
        setLoading(false);
      }
    };

    if (value) {
      generateQR();
    }
  }, [value, size]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`} style={{ width: size, height: size }}>
        <p className="text-sm text-gray-500 text-center px-2">{error}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <img 
        src={qrCodeUrl} 
        alt="QR Code" 
        width={size} 
        height={size}
        className="rounded-lg"
      />
    </div>
  );
};