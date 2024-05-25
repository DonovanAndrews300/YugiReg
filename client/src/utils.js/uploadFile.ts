export const uploadFile = async (file: File): Promise<void> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('https://yugireg-45086852d588.herokuapp.com/', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
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
