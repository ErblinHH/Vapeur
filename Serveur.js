const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bodyParser = require("body-parser");
const hbs = require("hbs");
const path = require('path');

const app = express();
const prisma = new PrismaClient();
const port = 3001;

// Configuration de Handlebars pour Express
app.set("view engine", "hbs"); // On définit le moteur de template que Express va utiliser
app.set("views", path.join(__dirname, "views")); // On définit le dossier des vues (dans lequel se trouvent les fichiers .hbs)
hbs.registerPartials(path.join(__dirname, "views", "partials")); // On définit le dossier des partials (composants e.g. header, footer, menu...)

app.get('/', (req, res) => {
    res.render("homePage");
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

app.get('/games',async (req, res) =>{
    const games = await prisma.game.findMany();
    res.render("games/viewAll", {games});
});