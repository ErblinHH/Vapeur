const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bodyParser = require("body-parser");

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;

app.get('/', (req, res) => {
    res.send('Hello  test 4');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});