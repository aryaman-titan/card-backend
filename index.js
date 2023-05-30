const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { exec } = require('child_process');

const port = process.env.PORT || 3000;


const app = express();

// Define the static files directory
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
  fs.readdir(staticFilesDirectory, (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error listing users');
      return;
    }

    // const users = files.filter(file => fs.lstatSync(path.join(staticFilesDirectory, file)).isDirectory());
    res.status(200).json(files);
  });
});

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
app.post('/upload', upload.single('file'), async (req, res) => {
  const { username } = req.body;
  const zipFilePath = req.file.path;
  const userStaticDirectory = path.join(staticFilesDirectory, username);

  // Check if the username directory already exists
  if (fs.existsSync(userStaticDirectory)) {
    res.status(409).send('Username already exists');
    return;
  }

  // Create the username directory
  fs.mkdirSync(userStaticDirectory, { recursive: true });

  const tempDirectory = path.join(staticFilesDirectory, 'temp');

  // Create the temporary directory if it doesn't exist
  if (!fs.existsSync(tempDirectory)) {
    fs.mkdirSync(tempDirectory);
  }

  // Extract the uploaded zip file to a temporary directory
  const command = `unzip -o ${zipFilePath} -d ${tempDirectory}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error extracting zip file');
      return;
    }

    // Move the contents of the subfolder to the user-specific directory
    const subfolderName = fs.readdirSync(tempDirectory)[0];
    const subfolderPath = path.join(tempDirectory, subfolderName);
    fs.renameSync(subfolderPath, userStaticDirectory);

    // Delete the temporary directory and the uploaded zip file
    fs.rmdirSync(tempDirectory);
    fs.unlinkSync(zipFilePath);

    res.status(200).send('File uploaded and decompressed successfully');
  });
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
