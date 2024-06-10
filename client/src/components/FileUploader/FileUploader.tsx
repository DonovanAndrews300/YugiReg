import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import { uploadFile } from '../../utils.js/uploadFile';

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [konamiId, setKonamiId] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
         if (file) {
      setLoading(true);
      await uploadFile({ file, firstName, lastName, konamiId });
      setLoading(false);
      console.log('First Name:', firstName, 'Last Name:', lastName, 'Konami ID:', konamiId);
    }
    } catch{
      setLoading(false);
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
      <div className="inputs-upload-container">
        <div className="inputs-container">
          <div className="name-inputs">
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
          </div>
          <div className="konami-input">
            <label>
              Konami ID:
              <input
                type="text"
                className="input"
                name="konamiId"
                value={konamiId}
                onChange={handleInputChange}
                maxLength={10}
                placeholder="Enter your Konami ID"
              />
            </label>
          </div>
        </div>
        <div className="upload-container">
          <div className="dropzone" {...getRootProps()}>
            <input {...getInputProps()} />
            {isDragActive ? <p>Release To Upload</p> : <p>Upload YDK File</p>}
            {file?.name && (
              <p className="file-name">{file.name}</p>
            )}
          </div>
          <div className="buttons-container">
            {file && (
              <>
                <button type="button" onClick={removeFile}>
                  Remove
                </button>
                <button type="button" disabled={loading} onClick={onSubmit}>
                  Submit
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
