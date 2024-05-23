import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import { uploadFile } from '../../utils.js/uploadFile';
export default function FileUploader() {
  const [file, setFile] = useState<File|null>(null);

  const onSubmit = async () => {
    if (file) {
      await uploadFile(file);
    }
  };
  const onDrop = useCallback((acceptedFiles:any[]) => {
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



  return (
    <>
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
    </>
  );
}
