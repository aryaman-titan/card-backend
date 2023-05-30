const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const JSZip = require('jszip');

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

// Define a route for uploading the zip file
app.post('/upload', upload.single('file'), async (req, res) => {
  const { username } = req.body;
  const zipFilePath = req.file.path;
  const userStaticDirectory = path.join(staticFilesDirectory, username);

  // Check if the username directory already exists
  // if (fs.existsSync(userStaticDirectory)) {
  //   res.status(409).send('Username already exists');
  //   return;
  // }

  // Create the username directory
  fs.mkdirSync(userStaticDirectory, { recursive: true });

  // Extract the uploaded zip file
  fs.promises.readFile(zipFilePath)
    .then((data) => {
      // Load the zip file
      return JSZip.loadAsync(data);
    })
    .then((zip) => {
      // Extract the files
      const promises = [];
      zip.forEach((relativePath, file) => {
        const filePath = path.join(userStaticDirectory, relativePath);
        if (file.dir) {
          fs.mkdirSync(filePath, { recursive: true });
        } else {
          promises.push(file.async('nodebuffer')
            .then((content) => {
              fs.promises.writeFile(filePath, content);
            }));
        }
      });
      return Promise.all(promises);
    })
    .then(() => {
      // Delete the uploaded zip file
      fs.unlinkSync(zipFilePath);

      res.status(200).send('File uploaded and decompressed successfully');
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error extracting zip file');
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
