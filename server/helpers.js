import { AWS_REGION, DYNAMODB_TABLE_NAME, YGOPRO_API_URL, MAX_MAIN_DECK_TYPE_CARDS } from "./constants.js";
import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import axios from "axios";
import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: AWS_REGION });

// Function to update DynamoDb with new cards
export const writeFromYGOPRO = async () => {
  try {
    const response = await axios.get(YGOPRO_API_URL);
    const allCards = response.data.data;
  
    console.log("Processing cards...");
    for (const card of allCards) {
      await putItem(card);
    }
    console.log("All cards processed.");
  } catch (error) {
    console.error("Error fetching or processing cards:", error);
  }
};

const putItem = async (card) => {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    Item: {
      card_id: { S: card.id.toString() },
      name: { S: card.name },
      id: { S: card.id.toString() },
      type: { S: card.type },
    },
    ConditionExpression: "attribute_not_exists(card_id)"
  };

  try {
    console.log(params);
    await client.send(new PutItemCommand(params));
  } catch (err) {
    console.error("Error putting item:", err);
  }
};

// Helper function to parse YDK file
const parseYdkFile = (ydkFile) => {
  const data = Buffer.from(ydkFile, "utf-8");

  return data.toString("utf-8").trim().split("\n");
};

// Function to get unique card IDs from YDK file
export const getUniqueYdkIds = async (ydkFile) => {
  const parsedYDK = parseYdkFile(ydkFile);
  const cardIds = { main: [], extra: [], side: [] };
  let currentDeck = "";

  parsedYDK.forEach(deckVal => {
    if (deckVal === "#main") currentDeck = "main";
    if (deckVal === "#extra") currentDeck = "extra";
    if (deckVal === "!side") currentDeck = "side";

    if (!isNaN(deckVal) && !cardIds[currentDeck].includes(deckVal)) {
      cardIds[currentDeck].push(deckVal);
    }
  });

  return cardIds;
};

// Function to get all card IDs from YDK file
//You get all ids this time to help build the full deck from mapping the card ids to the cards
export const getYdkIds = async (ydkFile) => {
  const parsedYDK = parseYdkFile(ydkFile);
  const cardIds = { main: [], extra: [], side: [] };
  let currentDeck = "";

  parsedYDK.forEach(deckVal => {
    if (deckVal === "#main") currentDeck = "main";
    if (deckVal === "#extra") currentDeck = "extra";
    if (deckVal === "!side") currentDeck = "side";

    if (!isNaN(deckVal)) {
      cardIds[currentDeck].push(deckVal);
    }
  });

  return cardIds;
};

// Function to get a deck from YDK file
export const getDeck = async (ydk) => {
  const singlesDeckIds = await getUniqueYdkIds(ydk);
  let fullDeck = { main: [], extra: [], side: [] };

  for (const id of singlesDeckIds.main) {
    const item = await getItem(DYNAMODB_TABLE_NAME, id);
    if (item) fullDeck.main.push(item);
  }

  for (const id of singlesDeckIds.extra) {
    const item = await getItem(DYNAMODB_TABLE_NAME, id);
    if (item) fullDeck.extra.push(item);
  }

  for (const id of singlesDeckIds.side) {
    const item = await getItem(DYNAMODB_TABLE_NAME, id);
    if (item) fullDeck.side.push(item);
  }

  return fullDeck;
};

const getItem = async (tableName, cardId) => {
  const params = {
    TableName: tableName,
    Key: { card_id: { S: cardId.toString() } }
  };

  try {
    const { Item } = await client.send(new GetItemCommand(params));

    return Item;
  } catch (error) {
    console.error(`Failed to retrieve item with card_id ${cardId}:`, error);

    return null;
  }
};

// Function to fill out PDF form with deck list
export const fillForm = async (deckList, playerInfo) => {
  try {
    const pdfDoc = await PDFDocument.load(await readFile("KDE_DeckList.pdf"));
    const resolvedDeckList = await deckList;
    const form = pdfDoc.getForm();

    const { firstName, lastName, konamiId } = playerInfo;
    form.getTextField("First  Middle Names").setText(firstName);
    form.getTextField("Last Names").setText(lastName);
    form.getTextField("CARD GAME ID").setText(konamiId);

    const countOccurrences = (array, element) => array.filter(item => item === element).length;

    const fillDeck = (deckType, deckCards, filledOutCards, cardNumber) => {
      deckCards.forEach((card) => {
        if ((deckType === "Monster" || deckType === "Spell" || deckType === "Trap") && cardNumber > MAX_MAIN_DECK_TYPE_CARDS) {
          throw new Error(`Exceeds the maximum allowed ${deckType} cards.`);
        }

        if (!filledOutCards.includes(card.name.S)) {
          const count = countOccurrences(deckCards, card);
          //I call this cardString string but the extra deck and side deck fields have different card count names
          const cardString = deckType === "Extra Deck" || deckType === "Side Deck" ? "" : "Card ";
          form.getTextField(`${deckType} ${cardNumber}`).setText(card.name.S);
          form.getTextField(`${deckType} ${cardString}${cardNumber} Count`).setText(`${count}`);
          // This is to avoid adding duplicates
          filledOutCards.push(card.name.S);
          cardNumber++;
        }
      });
    };

    fillDeck("Monster", resolvedDeckList.main.filter(card => card.type.S.includes("Monster")), [], 1);
    fillDeck("Spell", resolvedDeckList.main.filter(card => card.type.S.includes("Spell")), [], 1);
    fillDeck("Trap", resolvedDeckList.main.filter(card => card.type.S.includes("Trap")), [], 1);
    fillDeck("Extra Deck", resolvedDeckList.extra, [], 1);
    fillDeck("Side Deck", resolvedDeckList.side, [], 1);

    form.getTextField("Total Monster Cards").setText(`${resolvedDeckList.main.filter(card => card.type.S.includes("Monster")).length}`);
    form.getTextField("Total Spell Cards").setText(`${resolvedDeckList.main.filter(card => card.type.S.includes("Spell")).length}`);
    form.getTextField("Total Trap Cards").setText(`${resolvedDeckList.main.filter(card => card.type.S.includes("Trap")).length}`);
    form.getTextField("Total Extra Deck").setText(`${resolvedDeckList.extra.length}`);
    form.getTextField("Total Side Deck").setText(`${resolvedDeckList.side.length}`);

    const pdfBytes = await pdfDoc.save();

    return pdfBytes;

  } catch (error) {
    console.error("Error filling form:", error);
    throw new Error(error);
  }
};
