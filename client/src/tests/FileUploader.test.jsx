import React from 'react';
import { fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import FileUploader from '../components/FileUploader/FileUploader'
import { uploadFile } from '../utils/uploadFile';


jest.mock('../utils/uploadFile.ts');
describe('FileUploader', () => {

    const mockFile = new File(['dummy content'], 'example.ydk', {type: 'application/octet-stream'});
    const props = {
        file:mockFile,
        firstName: 'John',
        lastName: 'Doe',
        konamiId: '1234567890',
    };

  beforeAll(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        blob: jest.fn().mockResolvedValue(new Blob()),
      })
    );
       
    (uploadFile).mockResolvedValue(Promise.resolve());
    jest.clearAllMocks(); 
  });



    test('Renders component when given props', () => {
        render(<FileUploader />);
        expect( screen.getByText('First Name:')).toBeInTheDocument();
        expect( screen.getByText('Last Name:')).toBeInTheDocument();
        expect( screen.getByText('Konami ID:')).toBeInTheDocument();
        expect( screen.getByText('Upload YDK File')).toBeInTheDocument();
    })
    test('Wont upload invalid file type', async () => {
        render(<FileUploader />);

        const input = screen.getByText("Upload YDK File").parentElement.querySelector('input');
        const invalidFile = new File(['dummy content'], 'example.txt', { type: 'text/plain' });
    
        fireEvent.change(input, { target: { files: [invalidFile] } });
    
        await waitFor(() => {
          expect(screen.queryByText('example.txt')).not.toBeInTheDocument();
        });
    })
    test('Displays correct error if too many monster cards', () => {})
    test('Displays correct error if too many spell cards', () => {})
    test('Displays correct error if too many trap cards', () => {})
    test('Doesnt display error for success', () => {})
    test('Displays error for file being too large', () => {})
    });
