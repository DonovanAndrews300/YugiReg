import express from "express";
import cors from 'cors';
import multer from "multer"; 
import { config } from 'dotenv';
import { DEFAULT_PORT, MAX_FILE_SIZE} from "./constants.js"

config();
import { getDeck, fillForm } from "./helpers.js";




const app = express();
app.use(cors());
const port = process.env.PORT || DEFAULT_PORT;
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});

const upload = multer({ storage: multer.memoryStorage() });

const handlePostYDKRoute = async (req, res) => {
  if (!req.file) {
    res.send("no ydk");
    return; // make sure to return here to avoid setting headers after sending response
  }
if(req.file.size > MAX_FILE_SIZE) {
  res.send("max file size exceeded");
  return
}
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", "attachment; filename=\"filledform.pdf\"");
  const file = req.file; 
  const playerInfo = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    konamiId: req.body.konamiId
  }
  const loadedDeck = await getDeck(file.buffer);
  const filledForm = await fillForm(loadedDeck,playerInfo);
  res.send(Buffer.from(filledForm));
};

const handleDefaultGetRoute = (req, res) => {
  res.send("welcome to server");
};

app.get("/", handleDefaultGetRoute);
app.post("/", upload.single("file"), handlePostYDKRoute);
