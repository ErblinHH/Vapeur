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

async function initTypes() {
    const defaultTypes = [
        { name: "Action" },
        { name: "Aventure" },
        { name: "RPG" },
        { name: "Simulation" },
        { name: "Sport" },
        { name: "MMORPG" },
    ];

    try {
        for (const gameType of defaultTypes) {
            // Utilisation de `findFirst` si `name` n'est pas unique
            const existingType = await prisma.type.findFirst({
                where: { name: gameType.name },
            });

            if (!existingType) {
                await prisma.type.create({ data: gameType });
                console.log(`Type créé : ${gameType.name}`);
            } else {
                console.log(`Type déjà existant : ${gameType.name}`);
            }
        }
    } catch (error) {
        console.error("Erreur lors de l'initialisation des types :", error);
    }
}


app.listen(port, async () => {
    console.log(`Server is running on http://localhost:${port}`);

    await initTypes();
});



app.get('/', (req, res) => {
    res.render("homePage");
});

app.get('/games', async (req, res) => {
    try {
        const games = await prisma.game.findMany({
            orderBy:{
                name:'asc',
            },
    });
        res.render("games/viewAll", { games });
    } catch (error) {
        console.error("Error fetching games:", error); 
        res.status(500).send("Une erreur est survenue lors de la récupération des jeux."); 
    }
});


app.get('/game/:id', async (req, res) => {
    const { id } = req.params; // Extraction de l'ID depuis les paramètres de l'URL
    try {
        const game = await prisma.game.findUnique({
            where: {
                id: parseInt(id), // Conversion de l'ID en entier
            },
            include: {
                editor: true,  // Inclut l'éditeur du jeu
                type: true,    // Inclut le type du jeu
            },
            
        });

        if (game) {
            res.render("games/view", { game });
        } else {
            res.status(404).send("Game not found.");
        }
    } catch (error) {
        console.error("Error fetching game:", error); // Log de l'erreur pour le développeur
        res.status(500).send("Une erreur est survenue. Détails: " + error.message);
    }
});


app.get('/types', async (req, res) => {
    try {
        const types = await prisma.type.findMany({
            orderBy:{
                name:'asc',
            },
    });
        res.render("types/viewAll", { types });
    } catch (error) {
        console.error("Error fetching types:", error); 
        res.status(500).send("Une erreur est survenue lors de la récupération des genres."); 
    }
});

app.get('/type/:id', async (req, res) => {
    const { id } = req.params; // Extraction de l'ID depuis les paramètres de l'URL
    try {
        const type = await prisma.type.findUnique({
            where: {
                id: parseInt(id), // Conversion de l'ID en entier
            },
            include: {
                games:{
                    orderBy : {
                        name:'asc',
                    },
                }, 
            },
            
        });

        if (type) {
            res.render("types/view", { type });
        } else {
            res.status(404).send("Type not found.");
        }
    } catch (error) {
        console.error("Error fetching type:", error); // Log de l'erreur pour le développeur
        res.status(500).send("Une erreur est survenue. Détails: " + error.message);
    }
});


app.get('/editors', async (req, res) => {
    try {
        const editors = await prisma.editor.findMany({
            orderBy:{
                name:'asc',
            },
    });
        res.render("editors/viewAll", { editors });
    } catch (error) {
        console.error("Error fetching editors:", error); 
        res.status(500).send("Une erreur est survenue lors de la récupération des editeurs."); 
    }
});

app.get('/editor/:id', async (req, res) => {
    const { id } = req.params; // Extraction de l'ID depuis les paramètres de l'URL
    try {
        const editor = await prisma.editor.findUnique({
            where: {
                id: parseInt(id), // Conversion de l'ID en entier
            },
            include: {
                games:{
                    orderBy : {
                        name:'asc',
                    },
                }, 
            },
            
        });

        if (editor) {
            res.render("editors/view", { editor });
        } else {
            res.status(404).send("Type not found.");
        }
    } catch (error) {
        console.error("Error fetching editor:", error); // Log de l'erreur pour le développeur
        res.status(500).send("Une erreur est survenue. Détails: " + error.message);
    }
});
