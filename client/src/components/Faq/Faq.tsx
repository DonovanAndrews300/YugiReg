import React from 'react';

export default function Faq() {
  return (
    <div className='faq'>
      <div className='qa-container'>
        <h2 className='faq-header'>Frequently Asked Questions</h2>

        <div>
          <h3 className='question-header'>Why don't some of my cards appear in the completed form?</h3>
          <p className='answer'>
            Missing cards may occur because alternate card art is not currently supported.
          </p>
        </div>
        <div>
          <h3 className='question-header'>How can I obtain a YDK file of my deck?</h3>
          <p className='answer'>
            You can obtain a YDK file of your deck by using a deck exporter. For Dueling Nexus, I recommend using this Chrome extension: [<a href="https://chrome.google.com/webstore/detail/duelingnexus-deck-exporte/aaloejogbofkmmonaddiaogjjjdjlpcd">Dueling Nexus Deck Exporter</a>].
          </p>
        </div>
        <div>
          <h3 className='question-header'>Can I try a demo before uploading my own deck?</h3>
          <p className='answer'>
            Yes! You can download demo files in the following formats:
            <ul className="list-disc list-inside">
              <li><a href="/demo.ydk" download>YDK Demo File</a></li>
              <li><a href="/demo.xlsx" download>Excel Demo File</a></li>
              <li><a href="/demo.csv" download>CSV Demo File</a></li>
            </ul>
          </p>
        </div>
      </div>
    </div>
  );
}
