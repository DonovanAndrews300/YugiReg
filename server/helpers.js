import { AWS_REGION, DYNAMODB_TABLE_NAMES, YGOPRO_API_URL, MAX_MAIN_DECK_TYPE_CARDS, MAX_FILE_SIZE } from "./constants.js";
import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import puppeteer from "puppeteer";
import axios from "axios";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: AWS_REGION });

// Function to update DynamoDb with new cards
export const writeFromYGOPRO = async () => {
  try {
    const response = await axios.get(YGOPRO_API_URL);
    const allCards = response.data.data;

    console.log("Processing cards...");
    for (const card of allCards) {
      const params = {
        TableName: DYNAMODB_TABLE_NAMES.YGO_CARD_DATABASE,
        Item: {
          card_id: { S: card.id.toString() },
          name: { S: card.name },
          id: { S: card.id.toString() },
          type: { S: card.type },
        },
        ConditionExpression: "attribute_not_exists(card_id)"
      };
      await putItem(params);
    }
    console.log("All cards processed.");
  } catch (error) {
    console.error("Error fetching or processing cards:", error);
  }
};

export const isValidFile = (file) => {
  if (!file) {
    throw new Error("No file found");
  };
  if (!file.name.endsWith(".ydk")) {
    throw new Error("Invalid file type");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Max file size exceeded");
  }
};

const putItem = async (params) => {
  try {
    await client.send(new PutCommand(params));
  } catch (err) {
    console.error("Error putting item to table:", err);
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

export const getFormats = async () => {
  try {
    // Launch a headless browser
    console.log("Launching headless browser");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to the URL
    const url = "https://www.formatlibrary.com/formats/";
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: "networkidle0" });

    // Wait for the JavaScript to load and render the content
    console.log("Waiting for the content to be rendered");
    await page.waitForSelector("#root", { timeout: 10000 });

    const formats = await page.evaluate(() => {
      const rootElement = document.querySelector(".format-menu");
      const children = rootElement.children;
      const contentArray = [];
      for (let i = 0; i < children.length; i++) {
        contentArray.push(children[i].querySelector(".format-button div").innerHTML);
      }

      return rootElement ? contentArray : "No content found in #root";
    });
    console.log("Closing browser");
    await browser.close();

    return formats;
    // Close the browser
  } catch (error) {
    console.error("Error occurred:", error);
    throw error;
  }
};

export const getFormatBanList = async (formatName) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const url = `https://www.formatlibrary.com/formats/${formatName}`;
    console.log(`Navigating to ${url}`);
    const response = await page.goto(url, { waitUntil: "networkidle0" });

    console.log("Waiting for the content to be rendered");
    await page.waitForSelector("#root", { timeout: 20000 });
    const forbiddenList = await page.evaluate(() => {
      const cards = [];
      const root = document.querySelectorAll("#forbidden img");
      if (!root) {
        console.log("No element found with #root");

        return null;
      }
      root.forEach(child => cards.push(child.alt));

      return cards;
    });
    const limitedList = await page.evaluate(() => {
      const cards = [];
      const root = document.querySelectorAll("#limited img");
      if (!root) {
        console.log("No element found with #root");

        return null;
      }
      root.forEach(child => cards.push(child.alt));

      return cards;
    });
    const semiLimitedList = await page.evaluate(() => {
      const cards = [];
      const root = document.querySelectorAll("#semi-limited img");
      if (!root) {
        console.log("No element found with #root");

        return null;
      }
      root.forEach(child => cards.push(child.alt));

      return cards;
    });
    const banList = {
      forbidden:forbiddenList,
      limited:limitedList,
      semiLimited:semiLimitedList
    };
    await browser.close();

    return banList;
  }
  catch (e) {
    console.log(e);
    throw e;
  }

};

export const writeToFormatTable = async () => {
  try {
    const formats = await getFormats();
    console.log(formats);
    for (const format of formats) {
      const banList = await getFormatBanList(format);

      const params = {
        TableName: DYNAMODB_TABLE_NAMES.FORMATS,
        Item: {
          format_name: format,
          ban_list: banList,
        },
      };

      console.log(params);
      await putItem(params);  // Make sure to await the putItem function
    } }
  catch (error) {
    console.log(error);
  }
};
