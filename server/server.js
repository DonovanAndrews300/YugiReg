import express from "express";
import cors from 'cors'
import multer from "multer";
import {getDeck, fillForm} from "./helpers.js"
const app = express();


app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});
const port = process.env.PORT || 3000;
import('dotenv').then(({ config }) => config());
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});

const upload = multer({ storage: multer.memoryStorage() });

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
