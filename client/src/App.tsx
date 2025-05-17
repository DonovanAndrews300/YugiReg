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
      <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '1rem', backgroundColor: '#0c1c2c', color: '#fff', borderRadius: '8px' }}>
        <details>
          <summary style={{ fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }}>
  Terms and Services
          </summary>

          <div style={{ marginTop: '1rem' }}>
            <strong>1. About Yugireg</strong>
            <p>
    Yugireg is a tool designed to streamline the completion of Konami registration sheets by automatically filling in the necessary details from files you provide. Please note that Yugireg is an independent app and is not affiliated with or endorsed by Konami in any way.
            </p>

            <strong>2. How You May Use Yugireg</strong>
            <p>
    By using Yugireg, you agree to utilize the app solely for its intended purpose of assisting with Konami registration forms. Any unauthorized use or misuse of the app is strictly prohibited.
            </p>

            <strong>3. Advertising and Data Use</strong>
            <p>
    Yugireg displays advertisements served by Google AdSense. Google may collect data related to your interaction with ads to personalize and improve advertising experiences. For more information about Google's data collection and privacy practices, please visit{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#4cc9f0', textDecoration: 'underline' }}>
      Google Privacy Policy
              </a>.
            </p>

            <strong>4. Cookies and Tracking Technologies</strong>
            <p>
    Yugireg uses cookies and similar technologies to provide essential services and measure advertising effectiveness. Cookies help ensure a better user experience and more relevant ads. You can manage or disable cookies via your browser settings.
            </p>

            <strong>5. Privacy and Data Handling</strong>
            <p>
    Yugireg processes only the information you provide when uploading files to autofill registration sheets. We do not store or share your personal data beyond what is necessary to operate the service and comply with legal requirements. Your privacy is important to us.
            </p>

            <strong>6. Contact Us</strong>
            <p>
    If you have any questions or concerns regarding these terms or the Yugireg app, please contact us at{' '}
              <a href="mailto:yugiregapp@gmail.com" style={{ color: '#4cc9f0', textDecoration: 'underline' }}>
      yourgmail@gmail.com
              </a>.
            </p>

            <p style={{ fontSize: '0.9rem', opacity: 0.6, marginTop: '2rem' }}>
    Last updated: May 2025
            </p>
          </div>

        </details>
      </div>

      <footer className='footer'>
        <p>Copyright © 2023 All rights reserved.</p>
      </footer>
    </main>

  );
}
