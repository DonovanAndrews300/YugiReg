import { YGOPRO_API_URL, MAX_MAIN_DECK_TYPE_CARDS, MAX_FILE_SIZE } from "./constants.js";
import { PDFDocument } from "pdf-lib";
import { readFile, writeFile, mkdir, readFile as fsReadFile } from "fs/promises";
import { existsSync } from "fs";
import puppeteer from "puppeteer";
import axios from "axios";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const CARD_DATABASE_FILE = path.join(DATA_DIR, "ygocarddatabase.json");
const FORMATS_FILE = path.join(DATA_DIR, "formats.json");
const KDE_DECKLIST_PDF = path.join(process.cwd(), "KDE_DeckList.pdf");

if (!existsSync(DATA_DIR)) {
  mkdir(DATA_DIR, { recursive: true });
}

const readJsonFile = async (filePath) => {
  try {
    const data = await fsReadFile(filePath, "utf-8");

    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
};

const writeJsonFile = async (filePath, data) => {
  try {
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error writing to file ${filePath}:`, error);
    throw error;
  }
};

export const writeFromYGOPRO = async () => {
  try {
    const response = await axios.get(YGOPRO_API_URL);
    const allCards = response.data.data;
    const existingCards = await readJsonFile(CARD_DATABASE_FILE);

    console.log("Processing cards...");
    for (const card of allCards) {
      if (!existingCards[card.id]) {
        existingCards[card.id] = {
          card_id: card.id.toString(),
          name: card.name,
          id: card.id.toString(),
          type: card.type,
        };
      }
    }
    await writeJsonFile(CARD_DATABASE_FILE, existingCards);
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
  const cardDatabase = await readJsonFile(CARD_DATABASE_FILE);
  let fullDeck = { main: [], extra: [], side: [] };

  for (const id of singlesDeckIds.main) {
    if (cardDatabase[id]) {
      fullDeck.main.push(cardDatabase[id]);
    }
  }

  for (const id of singlesDeckIds.extra) {
    if (cardDatabase[id]) {
      fullDeck.extra.push(cardDatabase[id]);
    }
  }

  for (const id of singlesDeckIds.side) {
    if (cardDatabase[id]) {
      fullDeck.side.push(cardDatabase[id]);
    }
  }

  return fullDeck;
};

// Function to fill out PDF form with deck list
export const fillForm = async (deckList, playerInfo) => {
  try {
    const pdfDoc = await PDFDocument.load(await readFile(KDE_DECKLIST_PDF));
    const resolvedDeckList = await deckList;
    const form = pdfDoc.getForm();

    const { firstName, lastName, konamiId, filter } = playerInfo;
    form.getTextField("First  Middle Names").setText(firstName);
    form.getTextField("Last Names").setText(lastName);
    form.getTextField("CARD GAME ID").setText(konamiId);
    const countOccurrences = (array, element) => array.filter(item => item.name === element.name).length;
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
        if (!filledOutCards.includes(card.name)) {
          const count = countOccurrences(deckCards, card);
          //I call this cardString string but the extra deck and side deck fields have different card count names
          const cardString = deckType === "Extra Deck" || deckType === "Side Deck" ? "" : "Card ";
          form.getTextField(`${deckType} ${cardNumber}`).setText(card.name);
          form.getTextField(`${deckType} ${cardString}${cardNumber} Count`).setText(`${count}`);
          // This is to avoid adding duplicates
          filledOutCards.push(card.name);
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
         bannedCards = await fillDeck(deckType, resolvedDeckList.main.filter(card => card.type.includes(deckType)), [], 1);
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

    form.getTextField("Total Monster Cards").setText(`${resolvedDeckList.main.filter(card => card.type.includes("Monster")).length}`);
    form.getTextField("Total Spell Cards").setText(`${resolvedDeckList.main.filter(card => card.type.includes("Spell")).length}`);
    form.getTextField("Total Trap Cards").setText(`${resolvedDeckList.main.filter(card => card.type.includes("Trap")).length}`);
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
  let browser;
  try {
    console.log("Launching browser...");
    browser = await puppeteer.launch({
      headless: "new", // use "new" or false for debugging
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled"
      ],
      defaultViewport: null,
    });

    const page = await browser.newPage();

    // Fake a real User-Agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/115.0.0.0 Safari/537.36"
    );

    const url = "https://www.formatlibrary.com/formats/";
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    console.log("Waiting for format menu...");
    await page.waitForSelector(".format-menu", { timeout: 20000 });

    const formats = await page.evaluate(() => {
      const rootElement = document.querySelector(".format-menu");
      if (!rootElement) return [];

      const contentArray = ["Current"]; // manually add "Current" format
      const children = rootElement.children;
      for (let i = 0; i < children.length; i++) {
        const button = children[i].querySelector(".format-button div");
        if (button) {
          contentArray.push(button.innerText.trim());
        }
      }

      return contentArray;
    });

    console.log("Formats found:", formats);

    return formats;
  } catch (error) {
    console.error("Error occurred while scraping formats:", error);
    throw error;
  } finally {
    if (browser) {
      console.log("Closing browser...");
      await browser.close();
    }
  }
};

export const getFormatBanList = async (formatName) => {
  let browser;
  try {
    console.log(`Launching browser to get ban list for ${formatName}...`);
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
      defaultViewport: null,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    );

    let url = "";
    if (formatName === "Current") {
      url = "https://www.yugioh-card.com/en/limited/";
    } else {
      url = `https://www.formatlibrary.com/formats/${formatName}`;
    }

    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("After page.goto");

    let banList = { forbidden: [], limited: [], semiLimited: [] };

    if (formatName === "Current") {
      console.log("Scraping ban list from Konami website...");
      try {
        await page.waitForSelector(".wp-block-button__link", { timeout: 10000, visible: true });
        await Promise.all([
          page.click(".wp-block-button__link"),
          page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }),
        ]);
        console.log("Successfully navigated to the current ban list page.");

        await page.waitForSelector(".cardlist.centertable", { timeout: 30000 });
        console.log("Table selector found.");

        // Added a try-catch *around* the page.evaluate
        try {
          banList = await page.evaluate(() => {
            try {
              console.log("Inside page.evaluate - Konami");
              const table = document.querySelector(".wp-block-group__inner-container");
              if (!table) {

                return { forbidden: [], limited: [], semiLimited: [] };
              }

              const rows = Array.from(table.querySelectorAll("tr.cardlist_effect, tr.cardlist_fusion, tr.cardlist_synchro, tr.cardlist_xyz, tr.cardlist_link, tr.cardlist_spell, tr.cardlist_trap"));

              const forbidden = [];
              const limited = [];
              const semiLimited = [];

              for (const row of rows) { // Changed to for...of
                try {
                  const cells = Array.from(row.querySelectorAll("td"));
                  if (cells.length >= 3) { // Changed to 3, to prevent errors.
                    const cardName = cells[1].innerText.trim();
                    const advancedFormatStatus = cells[2].innerText.trim().toLowerCase();
                    console.log(`Card: ${cardName}, Status: ${advancedFormatStatus}`);
                    if (advancedFormatStatus === "forbidden") {
                      forbidden.push(cardName);
                    } else if (advancedFormatStatus === "limited") {
                      limited.push(cardName);
                    } else if (advancedFormatStatus === "semi-limited") {
                      semiLimited.push(cardName);
                    }
                  }
                } catch (rowError) {
                  console.error("Error processing a row:", rowError);
                }
              }
              console.log("Konami ban list scraping complete.");

              return { forbidden, limited, semiLimited };
            } catch (evaluateError) {
              console.error("Error in page.evaluate (Konami):", evaluateError);

              return { forbidden: [], limited: [], semiLimited: [] };
            }
          });
          console.log("Final ban list:", banList);

          return banList;
        } catch (e) {
          console.error("Error during page.evaluate:", e);
          throw e; // Re-throw any error from page.evaluate
        }

      } catch (error) {
        console.error("Error during Konami scraping:", error);
        throw error;
      }
    } else {
      console.log("Scraping ban list from Format Library...");
      const timeout = 30000; // Increased timeout for individual selectors
      try {
        await page.waitForSelector("#forbidden", { timeout });
        await page.waitForSelector("#limited", { timeout });
        await page.waitForSelector("#semi-limited", { timeout });

        banList = await page.evaluate(() => {
          const getCardNames = (selector) => {
            const elements = document.querySelectorAll(selector + " img");

            return Array.from(elements).map(img => img.alt.trim());
          };

          return {
            forbidden: getCardNames("#forbidden"),
            limited: getCardNames("#limited"),
            semiLimited: getCardNames("#semi-limited"),
          };
        });
        console.log("Ban list scraped from Format Library.", banList);

        return banList;
      } catch (error) {
        console.error(`Error scraping Format Library for ${formatName}:`, error);
        throw error;
      }
    }
  } catch (error) {
    console.error(`Error in getFormatBanList for ${formatName}:`, error);
    throw error;
  } finally {
    if (browser) {
      console.log("Closing browser...");
      await browser.close();
    }
  }
};

export const writeToFormatTable = async () => {
  try {
    const formats = await getFormats();
    const existingFormats = await readJsonFile(FORMATS_FILE);

    for (const format of formats) {
      if (!existingFormats[format]) {
        const banList = await getFormatBanList(format);
        existingFormats[format] = {
          format_name: format,
          ban_list: banList,
        };
        console.log(`Writing format: ${format}`);
      }
    }
    await writeJsonFile(FORMATS_FILE, existingFormats);
    console.log("All formats processed.");
  }
  catch (error) {
    console.log(error);
  }
};

export const getFormatFilters = async () => {
  try {
    const formatsData = await readJsonFile(FORMATS_FILE);

    return Object.keys(formatsData);
  } catch (err) {
    console.error("Error reading formats file:", err);
    throw err;
  }
};

//This returns an object of all the banned cards
const banListValidator = async (format, cardList) => {
  try {
    const formatsData = await readJsonFile(FORMATS_FILE);
    const formatData = formatsData[format];

    if (!formatData || !formatData.ban_list) {
      console.warn(`Format "${format}" not found or has no ban list.`);

      return false;
    }

    const cardCounts = cardList.reduce((counts, card) => {
      counts[card.name] = (counts[card.name] || 0) + 1;

      return counts;
    }, {});

    const allBannedCards = {};
    const { forbidden = [], limited = [], semiLimited = [] } = formatData.ban_list;

    const forbiddenCardsInDeck = cardList.filter(card => forbidden.includes(card.name));
    const forbiddenCardNames = [...new Set(forbiddenCardsInDeck.map(card => card.name))].join(", ");
    if (forbiddenCardsInDeck.length > 0) {
      allBannedCards["forbidden"] = forbiddenCardNames;
    }

    const limitedCardsInDeck = cardList.filter(card => limited.includes(card.name) && cardCounts[card.name] > 1);
    const limitedCardNames = [...new Set(limitedCardsInDeck.map(card => card.name))].join(", ");
    if (limitedCardsInDeck.length > 0) {
      allBannedCards["limited"] = limitedCardNames;
    }

    const semiLimitedCardsInDeck = cardList.filter(card => semiLimited.includes(card.name) && cardCounts[card.name] > 2);
    const semiLimitedCardNames = [...new Set(semiLimitedCardsInDeck.map(card => card.name))].join(", ");
    if (semiLimitedCardsInDeck.length > 0) {
      allBannedCards["semiLimited"] = semiLimitedCardNames;
    }

    return Object.keys(allBannedCards).length > 0 ? allBannedCards : false;

  } catch (error) {
    console.error("Error validating ban list:", error);

    return false;
  }
};