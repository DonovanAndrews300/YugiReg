


export default function Faq() {
  return (
    <div className='faq'>
      <div className='qa-container'>
        <h2 className='faq-header'>Frequently Asked Questions</h2>

        <div>
          <h3 className='question-header'>Why don't some of my cards appear in the completed form?</h3>
          <p className='answer'>
          Missing cards may occur because Yugi-Reg may not fully support or recognize alternative art cards.
          </p>
        </div>
        <div>
          <h3 className='question-header'>How can I obtain a YDK file of my deck?</h3>
          <p className='answer'>
          You can obtain a YDK file of your deck by using a deck exporter. For Dueling Nexus, I recommend using this Chrome extension: [Dueling Nexus Deck Exporter](https://chrome.google.com/webstore/detail/duelingnexus-deck-exporte/aaloejogbofkmmonaddiaogjjjdjlpcd).
          </p>
        </div>
      </div>
    </div>
  );
}