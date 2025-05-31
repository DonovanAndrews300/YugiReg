import React, { useEffect } from 'react';

interface EzoicAdProps {
  id: number; // Placeholder ID like 101
  width?: string;
  height?: string;
}

declare global {
  interface Window {
    ezstandalone: {
      cmd: Array<() => void>;
      showAds: (...ids: number[]) => void;
    };
  }
}

const EzoicAd: React.FC<EzoicAdProps> = ({ id, width = '100%', height = 'auto' }) => {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ezstandalone?.cmd) {
      window.ezstandalone.cmd.push(() => {
        window.ezstandalone.showAds(id);
      });
    }
  }, [id]);

  return (
    <div
      id={`ezoic-pub-ad-placeholder-${id}`}
      style={{
        width,
        height,
        display: 'block',
      }}
    />
  );
};

export default EzoicAd;
