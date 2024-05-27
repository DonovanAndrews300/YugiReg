import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import { uploadFile } from '../../utils.js/uploadFile';

export default function FileUploader() {
  const [file, setFile] = useState<File|null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [konamiId, setKonamiId] = useState('');

  const onSubmit = async () => { 
    if (file) {
      await uploadFile({file, firstName, lastName, konamiId});
      console.log('First Name:', firstName, 'Last Name:', lastName, 'Konami ID:', konamiId);
    }
  };
  const onDrop = useCallback((acceptedFiles: any[]) => {
    const isYdk = acceptedFiles.length && acceptedFiles[0].name.endsWith('.ydk');

    if (isYdk) {
      setFile(acceptedFiles[0]);
    } else {
      console.log("Incorrect file type");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = () => {
    setFile(null);
  };


  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === 'firstName') {
      setFirstName(value);
    } else if (name === 'lastName') {
      setLastName(value);
    } else if (name === 'konamiId') {
      setKonamiId(value);
    }
  };

  return (
    <div className="layout-container">
      <div className="text-inputs-container">
        <label>
          First Name:
          <input
            type="text"
            className="input"
            name="firstName"
            value={firstName}
            onChange={handleInputChange}
            placeholder="Enter your first name"
          />
        </label>
        <label>
          Last Name:
          <input
            type="text"
            className="input"
            name="lastName"
            value={lastName}
            onChange={handleInputChange}
            placeholder="Enter your last name"
          />
        </label>
        <label>
          Konami ID:
          <input
            type="text"
            className="input"
            name="konamiId"
            value={konamiId}
            onChange={handleInputChange}
            placeholder="Enter your Konami ID"
          />
        </label>
      </div>
      <div>
        <div {...getRootProps({ className: "container" })}>
          <input {...getInputProps({ className: "input" })} />
          {isDragActive ? <p>Release To Upload</p> : <p>Upload YDK File</p>}
        </div>
        {file?.name && (
          <>
            <p>{file.name}</p>
            <button type="button" onClick={removeFile}>
              Remove
            </button>
            <button type="button" onClick={onSubmit}>
              Submit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
