import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { toast } from 'react-toastify';

import FileUploader from '../components/FileUploader/FileUploader';

describe('FileUploader', () => {
  global.fetch = jest.fn(); // Define global fetch mock

  const mockFile = new File(['dummy content'], 'example.ydk', { type: 'application/octet-stream' });

  beforeEach(() => {
    fetch.mockClear();
    jest.resetAllMocks();
    global.URL.createObjectURL = jest.fn();
    global.URL.revokeObjectURL = jest.fn();

    toast.dismiss(); // Clear any previous toasts to avoid interference between tests
  });


  test('Renders component when given props', () => {
    render(<FileUploader />);
    expect( screen.getByText('First Name:')).toBeInTheDocument();
    expect( screen.getByText('Last Name:')).toBeInTheDocument();
    expect( screen.getByText('Konami ID:')).toBeInTheDocument();
    expect( screen.getByText('Upload YDK File')).toBeInTheDocument();
  });
  test('Wont upload invalid file type', async () => {
    render(<FileUploader />);
    const input = screen.getByText('Upload YDK File').parentElement.querySelector('input');
    const invalidFile = new File(['dummy content'], 'example.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [invalidFile] } });
    await waitFor(() => {
      expect(screen.queryByText('example.txt')).not.toBeInTheDocument();
    });
  });


  test('Displays success message and downloads file with promise resolution', async () => {
    global.URL.createObjectURL.mockReturnValue('blob:http://localhost/some-blob-url');
    fetch.mockResolvedValueOnce({
      ok: true, 
      blob: () => "blob",
      json: async () => ["a"],
    });
    fetch.mockResolvedValueOnce({
      ok: true, 
      blob: () => "blob",
      json: async () => ({
        message: 'File uploaded successfully',
      
      }),
    });

    render(<FileUploader />);

    const input = screen.getByTestId('dropzone-input');

    await act(async () => {
      fireEvent.change(input, { target: { files: [mockFile] } });
    });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(screen.getByText(/Uploading file.../i)).toBeInTheDocument());

    await waitFor(() => {
      expect(screen.getByText(/File uploaded successfully 👌/i)).toBeInTheDocument();
    });
  });

  test('Displays error for file being too large', () => {});
});
