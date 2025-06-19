import React from 'react';

import './App.css';
import FileUploader from './components/FileUploader/FileUploader';
import Faq from './components/Faq/Faq';
import Instructions from './Instructions/Instructions';

export default function App() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 1rem' }}>
      {/* Left Ad */}
      <aside style={{ width: '120px', marginRight: '1rem' }} className="ad-left"></aside>

      {/* Main Content */}
      <main
        style={{
          flex: '1',
          maxWidth: '800px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          padding: '0 1rem',
        }}
      >
        <header className="home-banner">
          <h1 style={{ textAlign: 'center' }}>Yugi-Reg</h1>
        </header>

        <div className="main" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="file-uploader">
            <div className="file-uploader-container">
              <FileUploader />
            </div>
          </div>

          <Instructions />
        </div>

        <Faq />

        {/* Buy Me a Coffee Section */}
        <div
          style={{
            maxWidth: '700px',
            margin: '0 auto',
            padding: '1rem',
            textAlign: 'center',
          }}
        >
          <a
            href="https://buymeacoffee.com/yugireg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
              alt="Buy Me A Coffee"
              style={{ height: '60px', width: '217px' }}
            />
          </a>
        </div>

        <footer className="footer" style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p>© 2023 All rights reserved.</p>
        </footer>
      </main>

      {/* Right Ad */}
      <aside style={{ width: '120px', marginLeft: '1rem' }} className="ad-right"></aside>
    </div>
  );
}
