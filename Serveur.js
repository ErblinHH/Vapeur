const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bodyParser = require("body-parser");
const hbs = require("hbs");
const path = require('path');

const app = express();
const prisma = new PrismaClient();
const port = 3001;
const upload = require('./upload'); // Middleware Multer pour gérer l'upload
app.use('/uploads', express.static('uploads')); // Rendre les fichiers uploadés accessibles

// Ajouter un helper global 'eq' pour comparer deux valeurs
hbs.registerHelper('eq', function (a, b) {
    return a === b;
});



// Configuration de Handlebars pour Express
app.set("view engine", "hbs"); // On définit le moteur de template que Express va utiliser
app.set("views", path.join(__dirname, "views")); // On définit le dossier des vues (dans lequel se trouvent les fichiers .hbs)
hbs.registerPartials(path.join(__dirname, "views", "partials")); // On définit le dossier des partials (composants e.g. header, footer, menu...)

// Middleware pour analyser les données POST en JSON
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

// HomePage, affiche les jeux mis en avant
app.get('/', async (req, res) => {
    try {
        // Récupère les jeux mis en avant
        const games = await prisma.game.findMany({
            // Uniquement si le jeu est mis en avant(<=> highlighted = true)
            where: {
                highlighted: true,
            },
            // Dans l'ordre alphabétique
            orderBy:{
                name:'asc',
            },
        });
        // Envoie la page d'accueil avec les jeux mis en avant
        res.render("homePage", { games });
    }
    // Catch les erreurs
    catch (error) {
        console.error("Erreur lors de la récupération des jeux mis en avant :", error);
        // Renvoie vers la page d'accueil avec un message d'erreur
        res.status(500).render("homePage", {
            errorMessage: "Une erreur est survenue lors du chargement des jeux.",
        });
    }
    
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


// Requête POST pour ajouter un jeu et sa photo
app.post('/games/newGame', upload.single('photo'), async (req, res) => {
    const { name, description, releaseDate, editorId, typeId ,filename,gameId} = req.body;

    try {
        // Étape 1 : Insérer le jeu dans la base de données
        const newGame = await prisma.game.create({
            data: {
                name,
                description,
                releaseDate: new Date(releaseDate),
                editorId: editorId ? parseInt(editorId) : null,
                typeId: parseInt(typeId),
            },
        });
        // Étape 2 : Si une photo a été uploadée, l'ajouter à la table Photo
        if (req.file) {
            await prisma.photo.create({
                data: {
                    filename: req.file.path, // Chemin vers l'image dans "uploads/"
                    gameId: newGame.id,      // Associer la photo au jeu
                },
            });
        }

        // Redirection après succès
        res.redirect('/games');
    } catch (error) {
        console.error("Erreur complète :", error); // Log complet de l'erreur
        res.status(500).send("Une erreur est survenue lors de l'ajout du jeu et de la photo.");
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

// Ajout des jeux à mettre en avant
app.get('/games/addHighlighted', async (req, res) => {
    try {
        // Récupère tous les jeux
        const games = await prisma.game.findMany({
            orderBy: {
                name: 'asc',
            },
        });

        // Envoie vers une page de sélection, avec tout les jeux et une checkbox (coché si a ajouté, et inversement)
        res.render('games/addHighlighted', { games });
    } 
    // Catch les erreurs
    catch (error) {
        console.error("Error fetching games:", error);
        res.status(500).send("Une erreur est survenue lors de la récupération des jeux.");
    }
});

// Met à jour le champ highlighted (en fonction du la checkbox du get précédent)
app.post('/games/addHighlighted', async (req, res) => {
    try {
        // Récupérer les données depuis req.body
        const updatedGames = req.body.games; // Les jeux avec leur état 'highlighted' (<=> l'etat de la checkbox)

        // Mettre à jour chaque jeu individuellement
        await Promise.all(
            updatedGames.map(async (game) => {
                await prisma.game.update({
                    where: { id: parseInt(game.id) },
                    data: { highlighted: game.highlighted === 'true' }, // Met le booléen a true si la checkbox est coché et inversement
                });
            })
        );
        // Redirige vers la page d'accueil
        res.redirect('/');
    } 
    // Catch les erreurs
    catch (error) {
        console.error("Error updating games:", error);
        res.status(500).send("Une erreur est survenue lors de la mise à jour des jeux.");
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








// Route pour uploader une photo liée à un jeu
app.post('/game/photo', upload.single('photo'), async (req, res) => {
  try {
    const { gameId } = req.body; // ID du jeu associé à la photo

    // Validation de l'input
    if (!gameId) {
      return res.status(400).json({ message: "L'ID du jeu est requis" });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier trouvé' });
    }

    // Vérifie si le jeu existe
    const gameExists = await prisma.game.findUnique({
      where: { id: parseInt(gameId) },
    });

    if (!gameExists) {
      return res.status(404).json({ message: 'Jeu non trouvé' });
    }

    // Crée une nouvelle entrée pour la photo dans la BDD
    const photo = await prisma.photo.create({
      data: {
        filename: req.file.path, // Chemin de stockage de l'image
        gameId: parseInt(gameId), // Associe la photo au jeu
      },
    });

    res.status(201).json({
      message: 'Photo uploadée et associée au jeu avec succès',
      photo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour récupérer toutes les photos associées à un jeu
app.get('/photos/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    const photos = await prisma.photo.findMany({
      where: { gameId: parseInt(gameId) },
    });

    if (photos.length === 0) {
      return res.status(404).json({ message: "Aucune photo trouvée pour ce jeu" });
    }

    res.json(photos);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = app;
