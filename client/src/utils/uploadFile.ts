type UploadFileProps ={
  file:File;
    firstName:string;
    lastName:string;
    konamiId:string;
    filter:string;

}

export const uploadFile = async (props:UploadFileProps ): Promise<void> => {
  try {
    const {file,firstName,lastName,konamiId,filter} = props;
    const MAX_FILE_SIZE = 1 * 1024 * 1024; //1mb
    if(file.size > MAX_FILE_SIZE){
      throw new  Error("Uploaded file exceeds maximum file size");
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('firstName',firstName);
    formData.append('lastName',lastName);
    formData.append('konamiId', konamiId);
    formData.append('filter', filter);
    const response = await fetch('https://yugireg.onrender.com', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text(); // Optionally read the response body for error details
      const parsedError = JSON.parse(error);
      throw new Error(`${parsedError.message}`);
    }

    console.log('File uploaded successfully:', response);
    const pdfFile = await response.blob();
    const objectURL = URL.createObjectURL(pdfFile);
    const downloadLink = document.createElement('a');
    downloadLink.href = objectURL;
    downloadLink.download = 'filledform.pdf';
    downloadLink.click();
    URL.revokeObjectURL(objectURL);

  } catch (error) {
    console.error('File upload failed:', error);
    throw error; // Optionally rethrow the error for higher-level handling
  }
};
