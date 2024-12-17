Vapeur

Vapeur est une application web pour gérer une collection de jeux vidéo avec des fonctionnalités de CRUD (Créer, Lire, Mettre à jour, Supprimer) pour les jeux, genres et éditeurs.

 Installation :

    git@github.com:ErblinHH/Vapeur.git
Accédez au dossier du projet :

    cd vapeur
Si vous n'avez pas déjà prisma:

    npm install express prisma sqlite3
    
 Initialisation de la base de données : 
    
    npx prisma migrate dev init
    npx prisma generate


Démarrez l'application :

    node Serveur.js

Technologies utilisées

    Node.js
    Express.js
    SQLite
    Prisma
