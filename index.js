const express = require('express');
const app = express();
const PORT = process.env.PORT || 3030;
app.use('/mayhem', express.static(__dirname + '/mayhem'));
app.use('/titan', express.static(__dirname + '/titan'));
app.use('/ayushagarwal', express.static(__dirname + '/ayushagarwal'));
app.use('/dheerajbathla', express.static(__dirname + '/dheerajbathla'));
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});