import React, { useEffect, useRef } from 'react';

// Extend the Window interface for TypeScript
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const AdBanner: React.FC = () => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const insElements = adRef.current?.getElementsByClassName('adsbygoogle') || [];

    for (let i = 0; i < insElements.length; i++) {
      const ins = insElements[i] as HTMLElement;

      // Check if ad already initialized
      if (!ins.getAttribute('data-ad-status')) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          ins.setAttribute('data-ad-status', 'done');
        } catch (e) {
          console.error('Adsbygoogle push error:', e);
        }
      }
    }
  }, []);

  return (
    <div ref={adRef} style={{ width: '160px', height: '600px' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'inline-block', width: '160px', height: '600px' }}
        data-ad-client="ca-pub-6432708839285268"
        data-ad-slot="3609580080"
        data-ad-format="auto"
        data-full-width-responsive="false"
      />
    </div>
  );
};

export default AdBanner;
