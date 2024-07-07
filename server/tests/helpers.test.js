import { fillForm, getUniqueYdkIds, isValidFile, writeFromYGOPRO } from "../helpers";
import axios from "axios";
import { PDFDocument } from 'pdf-lib';
import { readFile } from 'fs/promises';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { MAX_FILE_SIZE } from "../constants";

jest.mock('axios');
jest.mock('pdf-lib');
jest.mock('fs/promises');
jest.mock('@aws-sdk/client-dynamodb');

describe('helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.YGOPRO_API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php";
        process.env.AWS_REGION = 'us-west-2';
        process.env.DYNAMODB_TABLE_NAMES = 'MockedTableName';
        process.env.YGO_CARD_DATABASE = 'MockedTableName';
    });

    test('writeFromYGOPRO should fetch cards from API and store them in DynamoDB', async () => {
        axios.get.mockResolvedValue({ data: { data: [{ id: '123', originalname: 'Test Card', type: 'Monster' }] } });
        const mockClient = new DynamoDBClient();
        const putItemSpy = jest.spyOn(mockClient, 'send').mockResolvedValue({});

        await writeFromYGOPRO();

        expect(axios.get).toHaveBeenCalledWith(process.env.YGOPRO_API_URL); 
        expect(putItemSpy).toHaveBeenCalled();
    });

    test('getUniqueYdkIds should parse YDK file and return unique card IDs', async () => {
        const ydkFile = "#main\n123\n123\n#extra\n456\n!side\n789";
        const result = await getUniqueYdkIds(ydkFile);

        expect(result).toEqual({ main: ['123'], extra: ['456'], side: ['789'] });
    });

    test('fillForm should correctly fill out the PDF form with deck list', async () => {
        const mockPdfBytes = new Uint8Array();
        const mockPdfDoc = {
            getForm: jest.fn().mockReturnValue({
                getTextField: jest.fn().mockReturnValue({
                    setText: jest.fn()
                })
            }),
            save: jest.fn().mockResolvedValue(mockPdfBytes)
        };

        PDFDocument.load.mockResolvedValue(mockPdfDoc);
        readFile.mockResolvedValue(mockPdfBytes);

        const deckList = { main: [{ name: { S: 'Test Monster' }, type: { S: 'Monster' } }], extra: [], side: [] };
        const playerInfo = { firstName: 'John', lastName: 'Doe', konamiId: '123456' };
        const pdfBytes = await fillForm(deckList, playerInfo);

        expect(pdfBytes).toBe(mockPdfBytes);
        expect(PDFDocument.load).toHaveBeenCalled();
        expect(mockPdfDoc.getForm().getTextField).toHaveBeenCalledWith('First  Middle Names');
        expect(mockPdfDoc.getForm().getTextField('First  Middle Names').setText).toHaveBeenCalledWith(playerInfo.firstName);
    });

    test('isValidFile should throw an error with no file', () => {
        expect(() =>isValidFile()).toThrow("No file found")
    })
    test('isValidFile should throw an error when the file type is not ydk', () => {
        const invalidFile = { originalname: 'test.txt', size: MAX_FILE_SIZE - 1 }; 
        expect(() => isValidFile(invalidFile)).toThrow("Invalid file type");
      });

    it(' isValidFile should throw an error when the file size exceeds the maximum allowed size', () => {
        const largeFile = { originalname: 'test.ydk', size: MAX_FILE_SIZE + 1 }; 
        expect(() => isValidFile(largeFile)).toThrow("Max file size exceeded");
      });
    
      it('isValidFile should return true for a valid file', () => {
        const validFile = { originalname: 'test.ydk', size: MAX_FILE_SIZE - 1 };
        expect(() => isValidFile(validFile)).not.toThrow();
      });
});
