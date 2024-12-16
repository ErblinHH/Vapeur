const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bodyParser = require("body-parser");
const hbs = require("hbs");
const path = require('path');

const app = express();
const prisma = new PrismaClient();
const port = 3001;


// Ajouter un helper global 'eq' pour comparer deux valeurs
hbs.registerHelper('eq', function (a, b) {
    return a === b;
});



// Configuration de Handlebars pour Express
app.set("view engine", "hbs"); // On définit le moteur de template que Express va utiliser
app.set("views", path.join(__dirname, "views")); // On définit le dossier des vues (dans lequel se trouvent les fichiers .hbs)
hbs.registerPartials(path.join(__dirname, "views", "partials")); // On définit le dossier des partials (composants e.g. header, footer, menu...)

app.use(express.json());
// Middleware pour traiter les corps de requête URL-encodés (par exemple, formulaires HTML)
app.use(express.urlencoded({ extended: true }));

// Initialise les genres
async function initTypes() {
    // Liste de tout les genres
    const defaultTypes = [
        { name: "Action" },
        { name: "Aventure" },
        { name: "RPG" },
        { name: "Simulation" },
        { name: "Sport" },
        { name: "MMORPG" },
    ];

    try {
        // Pour chaque genre dans la liste
        for (const gameType of defaultTypes) {
            // Récupère si il existe dans la bdd le genre
            const existingType = await prisma.type.findUnique({
                where: { name: gameType.name },
            });

            // Si il n'existe pas
            if (!existingType) {
                // Le crée dans la bdd
                await prisma.type.create({ data: gameType });
                console.log(`Type créé : ${gameType.name}`);
            } else {
                console.log(`Type déjà existant : ${gameType.name}`);
            }
        }
    } 
    // Catch les erreurs
    catch (error) {
        console.error("Erreur lors de l'initialisation des types :", error);
    }
}

// Serveur
app.listen(port, async () => {
    await initTypes(); // Initialise les genres
    console.log(`Server is running on http://localhost:${port}`);
});

// HomePage
app.get('/', (req, res) => {
    res.render("homePage");
});


////////////////////// JEUX //////////////////////

// Affiche tout les jeux
app.get('/games', async (req, res) => {
    try {
        // Récupère la liste de tout les jeux
        const games = await prisma.game.findMany({
            // Dans l'ordre alphabétique
            orderBy:{
                name:'asc',
            },
    });
     // Envoie vers la page d'affichage
        res.render("games/viewAll", { games });
    } 
     // Catch les erreurs
    catch (error) {
        console.error("Error fetching games:", error); 
        res.status(500).send("Une erreur est survenue lors de la récupération des jeux."); 
    }
});

// rajout d'un jeu 
app.get('/games/newGame', async (req, res) => {
    try {
        // Récupérer les éditeurs et types pour les afficher dans le formulaire
        const editors = await prisma.editor.findMany();
        const types = await prisma.type.findMany();
        // Rendre la vue du formulaire
        res.render("games/newGame", { editors, types });
    } catch (error) {
        console.error("Error fetching editors or types:", error);
        res.status(500).send("Une erreur est survenue lors de la récupération des éditeurs ou types.");
    }
});
// Requete POST pour insert le jeu
app.post('/games/newGame', async (req, res) => {
    const { name, description, releaseDate, editorId, typeId } = req.body;

    try {
        // Insérer un nouveau jeu dans la base de données
        await prisma.game.create({
            data: {
                name,
                description,
                releaseDate: new Date(releaseDate),
                editorId: editorId ? parseInt(editorId) : null,
                typeId: parseInt(typeId),
            },
        });

        // Rediriger vers la liste des jeux
          res.redirect('/games');
    } catch (error) {
        console.error("Error adding new game:", error);
        res.status(500).send("Une erreur est survenue lors de l'ajout du jeu.");
    }
});


// Récupère un seul jeu et l'affiche avec son éditeur et son genre
app.get('/game/:id', async (req, res) => {
    const { id } = req.params; // Récupére l'id dans l'url
    try {
        // Requete pour récuperer le jeu
        const game = await prisma.game.findUnique({
            where: {
                id: parseInt(id), 
            },
            // Inclus son éditeur et son genre
            include: {
                editor: true,  
                type: true,    
            },  
        });

        // Si le jeu existe, renvoie vers la page d'affichage
        if (game) {
            res.render("games/view", { game });
        } else { // Le jeu n'existe pas
            res.status(404).send("Game not found.");
        }
    } 
    // Catch les erreurs
    catch (error) {
        console.error("Error fetching game:", error);
        res.status(500).send("Une erreur est survenue. Détails: " + error.message);
    }
});

// Modification d'un jeu
app.get('/game/edit/:id', async (req, res) => {
    const { id } = req.params; // Récupére l'id dans l'url
    try {
        // Récupérer le jeu, les éditeurs et les types
        const game = await prisma.game.findUnique({
            where: { id: parseInt(id) },
        });
        const editors = await prisma.editor.findMany();
        const types = await prisma.type.findMany();

        // Si le jeu existe, renvoie vers la page d'édition
        if (game) {
            res.render("games/editGame", { game, editors, types });
        } else { // Le jeu n'existe pas
            res.status(404).send("Game not found.");
        }
    } 
    // Catch les erreurs
    catch (error) {
        console.error("Error fetching game for edit:", error);
        res.status(500).send("Une erreur est survenue lors de la récupération du jeu.");
    }
});

// Requete POST pour modifier le jeu
app.post('/game/edit/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, releaseDate, editorId, typeId } = req.body;

    try {
        // Mettre à jour le jeu dans la base de données
        await prisma.game.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                releaseDate: new Date(releaseDate),
                editorId: editorId ? parseInt(editorId) : null,
                typeId: parseInt(typeId),
            },
        });

        // Rediriger vers la liste des jeux
        res.redirect('/games');
    } catch (error) {
        console.error("Error updating game:", error);
        res.status(500).send("Une erreur est survenue lors de la modification du jeu.");
    }
});

// Suppression d'un jeu
app.get('/game/delete/:id', async (req, res) => {
    const { id } = req.params; // Récupére l'id dans l'url
    try {
        // Requete pour supprimer le jeu
        const game = await prisma.game.delete({
            where: {
                id: parseInt(id),
            },
        });
        // Redirige vers la home page, après la suppression
        res.redirect("/");
    } 

    // Catch les erreurs
    catch (error) {
        console.error("Error deleting game:", error);
        if (error.code === 'P2025') { // Erreur Prisma, si l'id à supprimer n'existe pas
            res.status(404).send("Game not found");
        } else { // Autres erreurs
            res.status(500).send("An error occurred while deleting the game");
        }
    }
});

////////// EDITEURS //////////

// rajout d'un éditeur
app.get('/games/newEditor', async (req, res) => {
    res.render("editors/newEditor");
});
//requete post pour rajouter un editeur 
app.post('/games/newEditor', async (req, res) => {
    const { name } = req.body;

    try {
        // Ajout d'un éditeur dans la base de données
        await prisma.editor.create({
            data: { name },
        });

        // Redirection vers la liste des éditeurs
        res.redirect('/games');
    } catch (error) {
        console.error("Erreur lors de l'ajout de l'éditeur :", error);
        res.status(500).send("Une erreur est survenue lors de l'ajout de l'éditeur.");
    }
});



// Affiche tout les éditeurs
app.get('/types', async (req, res) => {
    try {
        // Récupère la liste de tout les genres
        const types = await prisma.type.findMany({
             // Dans l'ordre alphabétique
            orderBy:{
                name:'asc',
            },
    });
    // Envoie vers la page d'affichage
        res.render("types/viewAll", { types });
    } 
     // Catch les erreurs
    catch (error) {
        console.error("Error fetching types:", error); 
        res.status(500).send("Une erreur est survenue lors de la récupération des genres."); 
    }
});

// GENRES

// Récupère un seul genre et l'affiche avec ses jeux
app.get('/type/:id', async (req, res) => {
    const { id } = req.params; // Récupére l'id dans l'url
    try {
        // Requete pour récuperer le genre
        const type = await prisma.type.findUnique({
            where: {
                id: parseInt(id), 
            },
            // Inclus la liste de ses jeux
            include: {
                games:{
                    // Range les jeux dans l'ordre alphabétique
                    orderBy : {
                        name:'asc',
                    },
                }, 
            },
            
        });

        // Si le genre existe, renvoie vers la page d'affichage
        if (type) {
            res.render("types/view", { type });
        } else { // Le genre n'existe pas
            res.status(404).send("Type not found.");
        }
    // Catch les erreurs
    } catch (error) {
        console.error("Error fetching type:", error); 
        res.status(500).send("Une erreur est survenue. Détails: " + error.message);
    }
});


// EDITEURS

// Affiche tout les éditeurs
app.get('/editors', async (req, res) => {
    try {
        // Récupère la liste de tout les éditeurs
        const editors = await prisma.editor.findMany({
            // Dans l'ordre alphabétique
            orderBy:{
                name:'asc',
            },
    });
    // Envoie vers la page d'affichage
        res.render("editors/viewAll", { editors });
    } 
    // Catch les erreurs
    catch (error) {
        console.error("Error fetching editors:", error); 
        res.status(500).send("Une erreur est survenue lors de la récupération des editeurs."); 
    }
});

// Récupère un seul éditeur et l'affiche avec ses jeux
app.get('/editor/:id', async (req, res) => {
    const { id } = req.params; // Récupére l'id dans l'url
    try {
        // Requete pour récuperer l'éditeur
        const editor = await prisma.editor.findUnique({
            where: {
                id: parseInt(id), // Conversion de l'ID en entier
            },
            // Inclus la liste de ses jeux
            include: {
                games:{
                    // Range les jeux dans l'ordre alphabétique
                    orderBy : {
                        name:'asc',
                    },
                }, 
            },
            
        });
        // Si l'éditeur existe, renvoie vers la page d'affichage
        if (editor) {
            res.render("editors/view", { editor });
        } else { // Editeur n'existe pas
            res.status(404).send("Editor not found.");
        }

    // Catch les erreurs
    } catch (error) {
        console.error("Error fetching editor:", error); 
        res.status(500).send("Une erreur est survenue. Détails: " + error.message);
    }
});



// Suppression d'un éditeur
app.get('/editor/delete/:id', async (req, res) => {
    const { id } = req.params; // Récupére l'id dans l'url
    try {
        // Requete pour supprimer l'éditeur (l'éditeur peut etre null pour un jeu, lorsque qu'il est supprimé, il est automatiquement passé à null)
        const editor = await prisma.editor.delete({
            where: {
                id: parseInt(id),
            },
        });
        // Redirige vers la home page, après la suppression
        res.redirect("/");
    } 

    // Catch les erreurs
    catch (error) {
        console.error("Error deleting editor:", error);
        if (error.code === 'P2025') { // Erreur Prisma, si l'id à supprimer n'existe pas
            res.status(404).send("Editor not found");
        } else { // Autre erreur
            res.status(500).send("An error occurred while deleting the editor");
        }
    }
});
