import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { t } from '../locales/translations';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const { language } = useStore();
  const lang = t[language];
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setError('');
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 150 },
      },
      (decodedText) => {
        // Stop scanning on success
        if (scannerRef.current) {
          scannerRef.current.stop().then(() => {
            onScan(decodedText);
          }).catch(err => console.error("Failed to stop scanner", err));
        }
      },
      (errorMessage) => {
        // Ignore normal scanning errors (e.g. no barcode in view)
      }
    ).catch(err => {
      console.error("Camera error:", err);
      setError(`${lang.cameraError}: ${err.message || err}`);
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan, lang.cameraError, retryCount]);

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[100] p-4">
      <div className="w-full max-w-md bg-white rounded-xl overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{lang.scanBarcode}</h3>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 bg-black relative min-h-[300px] flex flex-col justify-center">
          <div id="reader" className={`w-full overflow-hidden rounded-lg ${error ? 'hidden' : ''}`}></div>
          {error && (
            <div className="text-red-500 text-center py-8 px-4">
              <p className="font-bold mb-2">{error}</p>
              <p className="text-sm text-gray-300 mb-6">
                {language === 'ru' 
                  ? 'Убедитесь, что вы разрешили доступ к камере. Если вы находитесь в режиме предпросмотра, откройте приложение в новой вкладке (кнопка в правом верхнем углу).'
                  : 'Боварӣ ҳосил кунед, ки шумо дастрасӣ ба камераро иҷозат додаед. Агар шумо дар реҷаи пешнамоиш бошед, барномаро дар равзанаи нав кушоед.'}
              </p>
              <button 
                onClick={() => {
                  setError('');
                  // Small delay to ensure DOM updates before retrying
                  setTimeout(() => setRetryCount(c => c + 1), 100);
                }}
                className="flex items-center justify-center space-x-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                <span>{language === 'ru' ? 'Попробовать снова' : 'Дубора кӯшиш кунед'}</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="p-4 text-center text-sm text-gray-500">
          {lang.barcode} (EAN/UPC/QR)
        </div>
      </div>
    </div>
  );
};
