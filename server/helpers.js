
import { AWS_REGION, DYNAMODB_TABLE_NAME, YGOPRO_API_URL } from "./constants";
import { PDFDocument }  from "pdf-lib";
import { readFile } from "fs/promises";
import axios from "axios";
import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
const client = new DynamoDBClient({
  region: AWS_REGION,
});

//Function to update DynamoDb with new cards
export const writeFromYGOPRO = async () => {
  // Fetch cards data from the API
  const response = await axios.get(YGOPRO_API_URL);
  const allCards = response.data.data;

  console.log("Processing cards...");
  for (const card of allCards) {
    await putItem(card);
  }
  console.log("All cards processed.");
};

const putItem = async (card) => {
  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    Item: {
      card_id: { S: card.id.toString() }, // Make sure IDs are strings
      name: { S: card.name },             // Assuming 'name' is a required attribute
      id:{ S:card.id.toString() },
      type:{ S:card.type },
    },
    ConditionExpression: "attribute_not_exists(card_id)" // Only put if card_id does not exist

  };

  try {
    const result = await client.send(new PutItemCommand(params));
  } catch (err) {
    console.error("Error putting item:", err);
  }
};
export const getUniqueYdkIds = async (ydkFile) => {
  const data = Buffer.from(ydkFile, "utf-8");
  const parsedYDK = data.toString("utf-8").trim().split("\n");
  const cardIds = {
    main:[],
    extra:[],
    side:[],
  };
  let currentDeck = "";
  parsedYDK.forEach(deckVal => {
    if (deckVal === "#main") {
      currentDeck = "main";
    }
    if (deckVal === "#extra") {
      currentDeck = "extra";
    }
    if (deckVal === "!side") {
      currentDeck = "side";
    }
    if (!isNaN(deckVal) && !cardIds[currentDeck].includes(deckVal)) {
      cardIds[currentDeck].push(deckVal);
    }
  });

  return cardIds;
};

export const getYdkIds = async (ydkFile) => {
  const data = Buffer.from(ydkFile, "utf-8");
  const parsedYDK = data.toString("utf-8").trim().split("\n");
  const cardIds = {
    main:[],
    extra:[],
    side:[],
  };
  let currentDeck = "";
  parsedYDK.forEach(deckVal => {
    if (deckVal === "#main") {
      currentDeck = "main";
    }
    if (deckVal === "#extra") {
      currentDeck = "extra";
    }
    if (deckVal === "!side") {
      currentDeck = "side";
    }

    if (!isNaN(deckVal)) {
      cardIds[currentDeck].push(deckVal);
    }
  });

  return cardIds;
};

export const getDeck = async (ydk) => {
  const singlesDeckIds = await getUniqueYdkIds(ydk);
  let fullDeck = {
    main: [],
    extra: [],
    side: []
  };

  // Fetching main deck
  for (const id of singlesDeckIds.main) {
    const item = await getItem(DYNAMODB_TABLE_NAME, id);
    if (item) {
      fullDeck.main.push(item);
    }
  }

  // Fetching extra deck
  for (const id of singlesDeckIds.extra) {
    const item = await getItem(DYNAMODB_TABLE_NAME, id);
    if (item) {
      fullDeck.extra.push(item);
    }
  }

  // Fetching side deck
  for (const id of singlesDeckIds.side) {
    const item = await getItem(DYNAMODB_TABLE_NAME, id);
    if (item) {
      fullDeck.side.push(item);
    }
  }

  return fullDeck;
};

const getItem = async (tableName, cardId) => {
  const params = {
    TableName: tableName,
    Key: {
      card_id: { S: cardId.toString() }
    }
  };

  try {
    const { Item } = await client.send(new GetItemCommand(params));

    return Item;
  } catch (error) {
    console.error(`Failed to retrieve item with card_id ${cardId}:`, error);

    return null;
  }
};

export const fillForm = async (deckList, playerInfo) => {
  try {
    const pdfDoc = await PDFDocument.load(
      await readFile("KDE_DeckList.pdf"));
    const resolvedDeckList = await deckList;
    const form = pdfDoc.getForm();
    const countOccurrences = (array, element) => {
      let counter = 0;
      array.forEach(item => {
        if (item === element) {
          counter++;
        }
      });

      return counter;
    };
    const { firstName, lastName, konamiId } = playerInfo;
    form.getTextField("First  Middle Names").setText(firstName);
    form.getTextField("Last Names").setText(lastName);
    form.getTextField("CARD GAME ID").setText(konamiId);
    const monsterCards = resolvedDeckList.main.filter((card) => card.type.S.includes("Monster"));
    let filledOutMonsterCards = [];
    let monsterCardNumber = 1;
    const spellCards = resolvedDeckList.main.filter((card) => card.type.S.includes("Spell"));
    let filledOutSpellCards = [];
    let spellCardNumber = 1;
    const trapCards = resolvedDeckList.main.filter((card) => card.type.S.includes("Trap"));
    let filledOutTrapCards = [];
    let trapCardNumber = 1;
    let filledOutExtraCards = [];
    let extraCardNumber = 1;
    let filledOutSideCards = [];
    let sideCardNumber = 1;

    monsterCards.forEach((monsterCard) => {
      if (!filledOutMonsterCards.includes(monsterCard.name.S)) {

        const monsterCount = countOccurrences(monsterCards, monsterCard);
        form.getTextField(`Monster ${monsterCardNumber}`).setText(monsterCard.name.S);

        form.getTextField(`Monster Card ${monsterCardNumber} Count`).setText(`${monsterCount}`);
        filledOutMonsterCards.push(monsterCard.name.S);
        monsterCardNumber++;
      }
    });
    spellCards.forEach((spellCard) => {
      if (!filledOutSpellCards.includes(spellCard.name.S)) {
        const spellCount = countOccurrences(spellCards, spellCard);
        form.getTextField(`Spell ${spellCardNumber}`).setText(`${spellCard.name.S}`);
        form.getTextField(`Spell Card ${spellCardNumber} Count`).setText(`${spellCount}`);
        filledOutSpellCards.push(spellCard.name.S);
        spellCardNumber++;
      }
    });
    trapCards.forEach((trapCard) => {
      if (!filledOutTrapCards.includes(trapCard.name.S)) {
        const trapCount = countOccurrences(trapCards, trapCard);
        form.getTextField(`Trap ${trapCardNumber}`).setText(`${trapCard.name.S}`);
        form.getTextField(`Trap Card ${trapCardNumber} Count`).setText(`${trapCount}`);
        filledOutTrapCards.push(trapCard.name.S);
        trapCardNumber++;
      }
    });
    resolvedDeckList.extra.forEach((extraCard) => {
      if (!filledOutExtraCards.includes(extraCard.name.S)) {
        const extraCount = countOccurrences(resolvedDeckList.extra, extraCard);
        form.getTextField(`Extra Deck ${extraCardNumber}`).setText(`${extraCard.name.S}`);
        form.getTextField(`Extra Deck ${extraCardNumber} Count`).setText(`${extraCount}`); }
      filledOutExtraCards.push(extraCard.name.S);
      extraCardNumber++;
    });
    resolvedDeckList.side.forEach((sideCard) => {
      if (!filledOutSideCards.includes(sideCard.name.S)) {
        const sideCount = countOccurrences(resolvedDeckList.side, sideCard);
        form.getTextField(`Side Deck ${sideCardNumber}`).setText(`${sideCard.name.S}`);
        form.getTextField(`Side Deck ${sideCardNumber} Count`).setText(`${sideCount}`); }
      filledOutSideCards.push(sideCard.name.S);
      sideCardNumber++;
    });
    form.getTextField("Total Monster Cards").setText(`${monsterCards.length}`);
    form.getTextField("Total Spell Cards").setText(`${spellCards.length}`);
    form.getTextField("Total Trap Cards").setText(`${trapCards.length}`);
    form.getTextField("Total Extra Deck").setText(`${resolvedDeckList.extra.length}`);
    form.getTextField("Total Side Deck").setText(`${resolvedDeckList.side.length}`);
    const pdfBytes = await pdfDoc.save();

    return pdfBytes;

  }
  catch (error) {
    console.log(error);
  }
};