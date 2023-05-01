const express = require('express');
const app = express();
const PORT = process.env.PORT || 3030;
app.use('/mayhem', express.static(__dirname + '/mayhem'));
app.use('/titan', express.static(__dirname + '/titan'));
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});