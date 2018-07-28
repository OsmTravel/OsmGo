# 0.4.0

## Interface
    * Utilisation des "select" (combobox) de Ionic
    * Ajout d'un tooltip à l'ouverture indiquant de télécharger les données en cliquant sur le bouton qui va bien
    * Le "toast" affichant le nombre d'objets déjà stocké à l'ouverturr s'affiche désormais en haut. La partie basse contient les 3 boutons les plus utiles, autant ne pas les cacher.
    * La barre de statut n'est plus cacher.
    * Le symbole représentant la position de l'utilisateur à changé de forme et de type. Il est de type ["marker"](https://www.mapbox.com/mapbox-gl-js/api/#marker), son changement d'état n'engendre pas le rendu de toute la carte, le CPU et la batterie apprécient.
    * Si l'orientation n'est pas disponible le symbole devient un point.
    * Le cercle indiquant la précision de la localisation est maintenant de type ["circle"](https://www.mapbox.com/mapbox-gl-js/style-spec#layers-circle). C'est plus joli et moins couteux en ressource.

## Features
    * Il est possible d'accéder à la carte sans géolocalisation. Soit en refusant l'accès, soit en cliquant sur le bouton qui permet de forcer l'accès à la carte
    * Il est possible, depuis la fiche de consultation, d'ajouter un tag "survey:date" à la date du jour. Pour cela il suffit de presser longuement le bouton vert en bas à droite
    * Il est possible de choisir l'imagerie aerienne de Mapbox dans les paramètres. Celle ci remplace celle de l'IGN qui est plus précise mais ne couvrant que la France

## Fix
    * Lors du téléchargement des données à travers l'overpassapi, ce dernier peut envoyer un timout avec un code 200. Il y'a donc maintenant une verification du contenu (balise "remark")
    * La création d'une nouvelle clé pouvait poser des problèmes à cause du "toLowercase" à chaque frappe
    * Lorsque le menu, la fiche ou une autre page sont ouverts, le rendu de la carte est désactivé, sinon, ceci pouvait provoquer de gros ralentissements (seulement depuis la version 0.42 de mapbox, étrange..)

## Divers
    * On ne peut télécharger des données qu'a partir du zoom 14, c'est déjà énorme et pas forcement conseillé...
    * Il n'est plus possible d'incliner la carte à 60° (pitch). Ce n'était vraiment pas d'une grande utilité et ça engendrait pas mal de contraintes liées à la perspective.
    * Adaptation pour un usage web
    * Mapbox GL JS 0.42 => 0.47

    