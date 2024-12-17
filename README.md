Vapeur

Vapeur est une application web pour gérer une collection de jeux vidéo avec des fonctionnalités de CRUD (Créer, Lire, Mettre à jour, Supprimer) pour les jeux, genres et éditeurs.

 Installation :

    git@github.com:ErblinHH/Vapeur.git
Accédez au dossier du projet :

    cd vapeur
Installez les dépendances :

    npm install express prisma sqlite3
    npx prisma init
    npx prisma migrate dev --name init
    npx prisma generate


Démarrez l'application :

    node Serveur.js

🛠️ Technologies utilisées

    Node.js
    Express.js
    SQLite
    Prisma
