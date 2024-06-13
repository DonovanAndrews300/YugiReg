import { fillForm, getUniqueYdkIds, writeFromYGOPRO } from "../helpers";
import axios from "axios";
import { PDFDocument } from 'pdf-lib';
import { readFile } from 'fs/promises';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

jest.mock('axios');
jest.mock('pdf-lib');
jest.mock('fs/promises');
jest.mock('@aws-sdk/client-dynamodb');

describe('helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.YGOPRO_API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php";
                process.env.AWS_REGION = 'us-west-2';
        process.env.DYNAMODB_TABLE_NAME = 'MockedTableName';

    });

    test('writeFromYGOPRO should fetch cards from API and store them in DynamoDB', async () => {
        axios.get.mockResolvedValue({ data: { data: [{ id: '123', name: 'Test Card', type: 'Monster' }] } });
        const mockClient = new DynamoDBClient();
        const putItemSpy = jest.spyOn(mockClient, 'send').mockResolvedValue({});

        await writeFromYGOPRO();

        expect(axios.get).toHaveBeenCalledWith(process.env.YGOPRO_API_URL);  // Assuming YGOPRO_API_URL is an environment variable
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
});
