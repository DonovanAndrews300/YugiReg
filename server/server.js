import express from "express";
import cors from "cors";
import multer from "multer";
import { config } from "dotenv";
import { DEFAULT_PORT } from "./constants.js";

config();
import { getDeck, fillForm, isValidFile, writeToFormatTable } from "./helpers.js";

const app = express();
app.use(cors());
const port = process.env.PORT || DEFAULT_PORT;
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});

const upload = multer({ storage: multer.memoryStorage() });
const handlePostYDKRoute = async (req, res) => {
  //turn this into a helper function isValidRequest
<<<<<<< HEAD
  const file = req.file;
  isValidFile(file);
  try {

=======
  try {
    if (!req.file) {
      res.send("no ydk");

      return; // make sure to return here to avoid setting headers after sending response
    }
    if (req.file.size > MAX_FILE_SIZE) {
      throw new Error("max file size exceeded");
    }
>>>>>>> be41a3a (added helpers for scraping yugioh format site)
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", "attachment; filename=\"filledform.pdf\"");

    const playerInfo = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      konamiId: req.body.konamiId
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

app.get("/", handleDefaultGetRoute);
app.post("/", upload.single("file"), handlePostYDKRoute);
