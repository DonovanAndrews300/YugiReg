const express = require("express");
const multer = require("multer");
const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});
const port = process.env.PORT || 3000;
require("dotenv").config();
const { DynamoDBClient, BatchGetItemCommand } = require("@aws-sdk/client-dynamodb");

app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
const upload = multer({ storage: multer.memoryStorage() });
const { PDFDocument } = require("pdf-lib");
const { readFile } = require("fs/promises");

// a client can be shared by different commands.
const client = new DynamoDBClient({
  region: "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const getUniqueYdkIds = async (ydkFile) => {
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

const getYdkIds = async (ydkFile) => {
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

const getDeck = async (ydk) => {
  const singlesDeckIds = await getUniqueYdkIds(ydk);
  const fullDeckIds = await getYdkIds(ydk);
  const mainDeckParams =  {
    RequestItems: {
      "YGOCardDatabase": {
        Keys: singlesDeckIds.main.map((id) => ({ card_id:{ N:id } }))
      }
    }
  };

  const extraDeckParams = {
    RequestItems: {
      "YGOCardDatabase": {
        Keys: singlesDeckIds.extra.map((id) => ({ card_id:{ N:id } }))
      }
    }
  };
  const sideDeckParams = {
    RequestItems: {
      "YGOCardDatabase": {
        Keys: singlesDeckIds.side.map((id) => ({ card_id:{ N:id } }))
      }
    }
  };

  // Create a BatchGetItemCommand instance
  const getMainDeck = new BatchGetItemCommand(mainDeckParams);
  const getExtraDeck = new BatchGetItemCommand(extraDeckParams);
  const getSideDeck = new BatchGetItemCommand(sideDeckParams);

  let fullDeck = {
    main:[],
    extra:[],
    side:[],
  };

  // Execute the BatchGetItem command
  const loadedMainDeck = await client.send(getMainDeck)
    .then(data => data.Responses.YGOCardDatabase.map(card => card));

  const loadedExtraDeck = await client.send(getExtraDeck)
    .then(data => data.Responses.YGOCardDatabase.map(card => card));

  const loadedSideDeck =  await client.send(getSideDeck)
    .then(data => data.Responses.YGOCardDatabase.map(card => card));
  fullDeckIds.main.forEach(cardId => {
    const idMatch = loadedMainDeck.find(card => card.card_id.N === cardId);
    if (idMatch) {
      fullDeck.main.push(idMatch);
    }
  });
  fullDeckIds.extra.forEach(cardId => {
    const idMatch = loadedExtraDeck.find(card => card.card_id.N === cardId);
    if (idMatch) {
      fullDeck.extra.push(idMatch);
    }
  });
  fullDeckIds.side.forEach(cardId => {
    const idMatch = loadedSideDeck.find(card => card.card_id.N === cardId);
    if (idMatch) {
      fullDeck.side.push(idMatch);
    }
  });

  return fullDeck;
};

async function fillForm (deckList) {
  try {
    const pdfDoc = await PDFDocument.load(
      await readFile("KDE_DeckList.pdf"));
    const resolvedDeckList = await deckList;
    const form = pdfDoc.getForm();
    // const firstAndMiddleNameField = form.getTextField('First  Middle Names')
    // const lastNameField = form.getTextField('Last Names')
    // const konamiIdField = form.getTextField('CARD GAME ID')
    const countOccurrences = (array, element) => {
      let counter = 0;
      array.forEach(item => {
        if (item === element) {
          counter++;
        }
      });

      return counter;
    };
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
        console.log(monsterCard.name.S, monsterCount, form.getTextField(`Monster ${monsterCardNumber}`).getName(), form.getTextField(`Monster Card ${monsterCardNumber} Count`)),
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
}
const handlePostYDKRoute = async (req, res) => {
  if (!req.file) {
    res.send("no ydk");
  }
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", "attachment; filename=\"filledform.pdf\"");
  const file = req.file;
  const loadedDeck = await getDeck(file.buffer);
  const filledForm = await fillForm(loadedDeck);
  res.send(Buffer.from(filledForm));
};
const handleDefaultGetRoute = (req, res) => {
  res.send("welcome to server");
};

app.get("/", handleDefaultGetRoute);
app.post("/", upload.single("file"), handlePostYDKRoute);
