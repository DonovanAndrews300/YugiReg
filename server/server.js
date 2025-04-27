import express from "express";
import cors from "cors";
import multer from "multer";
import { config } from "dotenv";
import { DEFAULT_PORT } from "./constants.js";
import { writeFromYGOPRO, writeToFormatTable, getDeckFromFile, fillForm, isValidFile, getFormatFilters, getDeck } from "./helpers.js"; // Import the new getDeckFromFile

config();

const app = express();
app.use(cors());
const port = process.env.PORT || DEFAULT_PORT;

// Function to initialize data on server start
const initializeData = async () => {
  try {
    await writeFromYGOPRO();
  } catch (error) {
    console.error("Error initializing card data:", error);
  }

  try {
    await writeToFormatTable();
    console.log("Format data initialized.");
  } catch (error) {
    console.error("Error initializing format data:", error);
  }
  console.log("Data initialization complete.");
};

// Call initializeData when the server starts
initializeData().then(() => {
  app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
  });
});

const upload = multer({ storage: multer.memoryStorage() });
const handlePostYDKRoute = async (req, res) => {
  const file = req.file;
  try {
    isValidFile(file); // This now checks for .ydk, .xlsx, and .csv
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", "attachment; filename=\"filledform.pdf\"");

    const playerInfo = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      konamiId: req.body.konamiId,
      filter: req.body.filter
    };

    let loadedDeck;
    if (file.originalname.endsWith(".ydk")) {
      loadedDeck = await getDeck(file.buffer); // Use getDeck for .ydk
    } else {
      loadedDeck = await getDeckFromFile(file.buffer, file.originalname); // Use getDeckFromFile for others
    }
    const filledForm = await fillForm(loadedDeck, playerInfo);
    res.send(Buffer.from(filledForm));
  }
  catch (err) {
    res.status(500);
    console.error(err);
    res.json({
      message: err.message
    });
  }
};

const handleDefaultGetRoute = (req, res) => {
  res.send("welcome to server");
};

const handleGetFiltersRoute = async (req, res) => {
  try {
    const filters = await getFormatFilters();
    res.send(JSON.stringify(filters));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

app.get("/", handleDefaultGetRoute);
app.post("/", upload.single("file"), handlePostYDKRoute);
app.get("/filters", handleGetFiltersRoute);
