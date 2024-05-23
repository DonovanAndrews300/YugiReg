import React from 'react';

import './App.css';
import FileUploader from './components/FileUploader/FileUploader';
import Faq from './components/Faq/Faq';
import Instructions from './Instructions/Instructions';

export default function App() {
  return (
    <main>
      <header className="home-banner">
        <h1>Yugi-Reg</h1>
      </header>

      <div className='main'>
        <div className='file-uploader'>
          <div className="file-uploader-container">
            <FileUploader />
          </div>
        </div>
        <Instructions/>
      </div>

      <Faq/>
      <footer className='footer'>Copyright © 2023 All rights reserved.</footer>
    </main>
  );
}
