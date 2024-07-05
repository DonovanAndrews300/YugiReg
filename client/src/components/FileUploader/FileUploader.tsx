import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ToastContainer, toast } from 'react-toastify';

import { uploadFile } from '../../utils/uploadFile';
import 'react-toastify/dist/ReactToastify.css';
import { getFilters } from '../../utils/getFilters';

type Response = {
  data: {
  status: string;
  message?: string;
  }

}

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [konamiId, setKonamiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [filters, setFilters] = useState([]);

  useEffect(() => {
    const getData = async  () => {
      const results = await getFilters();
      console.log(results.json());
      setFilters(await results.json());
    };
    if(filter.length>0){
      getData();
    }

  }, []);

  const onSubmit = async () => {
    if (file) {
      setLoading(true);

      const promise = uploadFile({ file, firstName, lastName, konamiId, filter });

      toast.promise(
        promise,
        {
          pending: 'Uploading file...',
          success: 'File uploaded successfully 👌',
          error: {
            render({ data }:Response) {
              let errorMessage = 'File upload failed 🤯: ';
              if (data.message) {
                try {
                  const errorData = JSON.parse(data.message);
                  errorMessage += errorData.message || data.message;
                } catch (e) {
                  errorMessage += data.message;
                }
              } else {
                errorMessage += data;
              }
              return errorMessage;
            }
          }
        }
      );

      try {
        await promise;
      } catch (err:any) {
        console.error('File upload failed:', err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const onDrop = useCallback((acceptedFiles: any[]) => {
    const isYdk = acceptedFiles.length && acceptedFiles[0].name.endsWith('.ydk');
    if (isYdk) {
      setFile(acceptedFiles[0]);
    } else {
      toast.error("Incorrect file type");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = () => {
    setFile(null);
  };

  const handleFilter = (event: React.ChangeEvent<HTMLSelectElement>)=>{
    const { value } = event.target;
    setFilter(value);
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
            <input data-testid="dropzone-input" {...getInputProps()} />
            {isDragActive ? <p>Release To Upload</p> : <p>Upload YDK File</p>}
            {file?.name && (
              <p className="file-name">{file.name}</p>
            )}
          </div>
          <label>Format/Banlist:
            <select value={filter} onChange={handleFilter}>
              <option value="">Select Format</option>
              {
                filters.map((filter, index) => <option key={index} value={`${filter}`}>{filter}</option>)
              }
            </select></label>
          

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
      <ToastContainer position="top-center"/>
    </div>
  );
}
