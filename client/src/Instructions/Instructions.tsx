import React from 'react';


export default function Instructions() {
  return (
    <div className='instructions-container'>
      <img alt="Dark Magician and Dark Magician Girl" src="https://i.redd.it/sj6oha0on3a11.jpg" />
      <ol className='how-to-list'>
        <h3>Instructions</h3>
        <li>Retrieve the YDK file for your decklist.</li>
        <li>Drag and drop your YDK file into the white area above.</li>
        <li>You can alternatively click inside the white area to manually select your YDK file.</li>
        <li>Fill out the Form and hit the submit button. Your file will automatically download.</li>
      </ol>
    </div>
  );
}