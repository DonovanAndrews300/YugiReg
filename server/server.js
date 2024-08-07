import express from "express";
import cors from "cors";
import multer from "multer";
import { config } from "dotenv";
import { DEFAULT_PORT } from "./constants.js";

config();
import { getDeck, fillForm, isValidFile, getFormatFilters } from "./helpers.js";

const app = express();
app.use(cors());
const port = process.env.PORT || DEFAULT_PORT;
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});

const upload = multer({ storage: multer.memoryStorage() });
const handlePostYDKRoute = async (req, res) => {
  const file = req.file;
  isValidFile(file);
  try {

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", "attachment; filename=\"filledform.pdf\"");

    const playerInfo = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      konamiId: req.body.konamiId,
      filter: req.body.filter
    };
    const loadedDeck = await getDeck(file.buffer);
    const filledForm = await fillForm(loadedDeck, playerInfo);
    res.send(Buffer.from(filledForm));
  }
  catch (err) {
    res.status(500);
    console.log(err);
    res.json({
      message: err.message
    });
  }
};

const handleDefaultGetRoute = (req, res) => {
  res.send("welcome to server");
};

const handleGetFiltersRoute = async (req, res) => {
  const filters = await getFormatFilters();
  res.send(JSON.stringify(filters));
};

app.get("/", handleDefaultGetRoute);
app.post("/", upload.single("file"), handlePostYDKRoute);
app.get("/filters", handleGetFiltersRoute);
