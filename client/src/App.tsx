import React from 'react';

import './App.css';
import FileUploader from './components/FileUploader/FileUploader';
import Faq from './components/Faq/Faq';
import Instructions from './Instructions/Instructions';
import AdBanner from './components/AdBanner/AdBanner'; // your Ad component

export default function App() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      
      {/* Left Ad Outside Main */}
      <aside style={{ width: '160px', marginRight: '1rem' }} className="ad-left">
        <AdBanner id={107} />
      </aside>

      {/* Main Content */}
      <main style={{ flex: '1', maxWidth: '1200px' }}>
        <header className="home-banner">
          <h1>Yugi-Reg</h1>
        </header>

        <div className='main'>
          <div className='file-uploader'>
            <div className="file-uploader-container">
              <FileUploader />
            </div>
          </div>
          <Instructions />
        </div>

        <Faq />

        <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '1rem', backgroundColor: '#0c1c2c', color: '#fff', borderRadius: '8px' }}>
          {/* Terms and Services content goes here */}
        </div>

        <footer className='footer'>
          <p>Copyright © 2023 All rights reserved.</p>
        </footer>
      </main>

      {/* Right Ad Outside Main */}
      <aside style={{ width: '160px', marginLeft: '1rem' }} className="ad-right">
        <AdBanner id={107}/>
      </aside>
    </div>
  );
}
