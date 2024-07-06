import { AWS_REGION, DYNAMODB_TABLE_NAMES, YGOPRO_API_URL, MAX_MAIN_DECK_TYPE_CARDS, MAX_FILE_SIZE } from "./constants.js";
import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import puppeteer from "puppeteer";
import axios from "axios";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient, GetItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";

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
  if (!file.originalname.endsWith(".ydk")) {
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
  const singlesDeckIds = await getYdkIds(ydk);
  let fullDeck = { main: [], extra: [], side: [] };

  for (const id of singlesDeckIds.main) {
    const params = {
      TableName: DYNAMODB_TABLE_NAMES.YGO_CARD_DATABASE,
      Key: { card_id: { S: id.toString() } }
    };
    const item = await getItem(params);
    if (item) fullDeck.main.push(item);
  }

  for (const id of singlesDeckIds.extra) {
    const params = {
      TableName: DYNAMODB_TABLE_NAMES.YGO_CARD_DATABASE,
      Key: { card_id: { S: id.toString() } }
    };
    const item = await getItem(params);
    if (item) fullDeck.extra.push(item);
  }

  for (const id of singlesDeckIds.side) {
    const params = {
      TableName: DYNAMODB_TABLE_NAMES.YGO_CARD_DATABASE,
      Key: { card_id: { S: id.toString() } }
    };
    const item = await getItem(params);
    if (item) fullDeck.side.push(item);
  }

  return fullDeck;
};

const getItem = async (params) => {
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

    const { firstName, lastName, konamiId, filter } = playerInfo;
    form.getTextField("First  Middle Names").setText(firstName);
    form.getTextField("Last Names").setText(lastName);
    form.getTextField("CARD GAME ID").setText(konamiId);
    const countOccurrences = (array, element) => array.filter(item => item.name.S === element.name.S).length;
    const fillDeck = async (deckType, deckCards, filledOutCards, cardNumber) => {
      if (filter) {
        const bannedCards =  await banListValidator(filter, deckCards);
        if (bannedCards) {
          return bannedCards;
        }
      }
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
    const deckTypes = ["Monster", "Spell", "Trap", "Extra Deck", "Side Deck"];
    const bannedCardsArr =
     await deckTypes.reduce(async (accPromise, deckType) => {
       const acc = await accPromise;
       let bannedCards = null;
       if (deckType === "Extra Deck") {
         bannedCards = await fillDeck(deckType, resolvedDeckList.extra, [], 1);
       } else if (deckType === "Side Deck") {
         bannedCards = await fillDeck(deckType, resolvedDeckList.side, [], 1);
       } else {
         bannedCards = await fillDeck(deckType, resolvedDeckList.main.filter(card => card.type.S.includes(deckType)), [], 1);
       }

       if (bannedCards) {
         acc.push(bannedCards);
       }

       return acc;
     }, [])
    ;
    //Combines together the array of banned cards and returns a complete string of all banned cards

    if (bannedCardsArr.length > 0) {
      const bannedCardsString  = () =>{
        const bannedMap = bannedCardsArr.reduce((accum, curr)=>{
          Object.keys(curr).forEach(key=>{
            accum[key] = !accum[key] ? curr[key] : accum[key] + ", " + curr[key];
          });

          return  accum;
        }, {});

        return `You have cards that are banned. ${bannedMap.forbidden ? `Forbidden: ${bannedMap.forbidden}` : ""} ${bannedMap.limited ? `Limited: ${bannedMap.limited}` : ""} ${bannedMap.semiLimited ? `Semi-Limited: ${bannedMap.semiLimited}` : ""}`;
      };
      throw new Error(bannedCardsString());
    };

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
      //I add Current string here becuase its the most current format. I thought to manually add this because I will probably get all formats at some point but this is much easier than scraping the page for it
      const contentArray = ["Current"];
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
        ConditionExpression: "attribute_not_exists(format_name)"
      };

      console.log(params);
      await putItem(params);  // Make sure to await the putItem function
    } }
  catch (error) {
    console.log(error);
  }
};

export const getFormatFilters = async () => {
  const params = {
    TableName: DYNAMODB_TABLE_NAMES.FORMATS,
  };
  try {
    const command = new ScanCommand(params);
    const data = await client.send(command);
    const formatFilters = data.Items.map(item => item.format_name.S);

    return formatFilters;

  } catch (err) {
    console.error("Error scanning table:", err);
    throw err;
  } };

//This returns an object of all the banned cards
const banListValidator = async (format, cardList) => {
  const params = {
    TableName: DYNAMODB_TABLE_NAMES.FORMATS,
    Key: { format_name: { S: format.toString() } }
  };
  const cardCounts = cardList.reduce((counts, card) => {
    counts[card.name.S] = (counts[card.name.S] || 0) + 1;

    return counts;
  }, {});
  const allBannedCards = {};
  const banList = await getItem(params);
  const forbidden = banList.ban_list.M.forbidden.L.map((item => item.S));
  const limited = banList.ban_list.M.limited.L.map((item => item.S));
  const semiLimited = banList.ban_list.M.semiLimited.L.map((item => item.S));
  const forbiddenCardsInDeck = cardList.filter(card => forbidden.includes(card.name.S));
  const forbiddenCardNames = forbiddenCardsInDeck.reduce((uniqueNames, card) => {
    if (!uniqueNames.has(card.name.S)) {
      uniqueNames.add(card.name.S);
    }

    return uniqueNames;
  }, new Set());

  const forbiddenCardNamesString = Array.from(forbiddenCardNames).join(", ");

  const limitedCardsInDeck = cardList.filter(card => limited.includes(card.name.S) && cardCounts[card.name.S] > 1);
  const limitedCardNames = limitedCardsInDeck.reduce((uniqueNames, card) => {
    if (!uniqueNames.has(card.name.S)) {
      uniqueNames.add(card.name.S);
    }

    return uniqueNames;
  }, new Set());

  const limitedCardNamesString = Array.from(limitedCardNames).join(", ");

  const semiLimitedCardsInDeck = cardList.filter(card => semiLimited.includes(card.name.S) && cardCounts[card.name.S] > 2);
  const semiLimitedCardNames = semiLimitedCardsInDeck.reduce((uniqueNames, card) => {
    if (!uniqueNames.has(card.name.S)) {
      uniqueNames.add(card.name.S);
    }

    return uniqueNames;
  }, new Set());

  const semiLimitedCardNamesString = Array.from(semiLimitedCardNames).join(", ");

  if (forbiddenCardsInDeck.length > 0) {
    allBannedCards["forbidden"] = forbiddenCardNamesString;
  }
  if (limitedCardsInDeck.length > 0) {
    allBannedCards["limited"] = limitedCardNamesString;
  }
  if (semiLimitedCardsInDeck.length > 0) {
    allBannedCards["semiLimited"] = semiLimitedCardNamesString;
  }

  if (Object.values(allBannedCards).length > 0) {
    return allBannedCards;
  }
  else {
    return false;
  }
};
