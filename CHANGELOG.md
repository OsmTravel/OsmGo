# 0.12.0
## Features
 - osmgo.com ( translation interface : admin.osmgo.com )
 - Add Capacitor instead of Cordova
 - Osm Go! PWA is now fully operational ( tested on Chrome and Android 9) 
 - Osm Go has its own .osm converter! (./scripts/osmToOsmgo)
 - Data converter and all heavy calculation that run entirely in the background (in a webworker)
 - Osm Go now uses OAuth to log in on web and PWA ( it still use basic authentification on Android app)
 - We can activate the "developer mode" and switch to the OSM dev server
   - To activate it, go to About page & tap 5 times on version card.  Now you can switch to the osm dev server in settings

## Tags
 - Changing the structure of tags configuration
   - deleting "lbl_alt"
   - adding "terms", "description", "warning"
 - Add tags club=*
 - Add tags translation from iD

## Bug Fixes
  - It's now forbidden to move a node belonging to a way
  - It's now possible to delete a node belonging to a way .. not the node itself, the tags only !
  - missing  translation (#37)



# 0.11.0
## Miscellaneous
    - Back to cordova (capacitor is buggy and we can't build an APK without Firebase, GMS, etc...)
    - PWA improvement ( cache with serviceworker, icon, etc...)
    - Download data : OverpassApi is too slow... => Api06 as default

## Interface
    - Display the geolocation status if denied
    - Display an icon on map on old objects (4 y by default) and objects with "fixme" tag (you can disable & configure this)

# 0.10.0
## Miscellaneous 
    - Migrating from Cordova to Capacitor
    - There is now only one sprite (instead of one sprite per country). This image is generated from the fr-FR configuration.
    If an icon is missing, the application will dynamically generate it
    - The list of base maps now depends on the configuartion of the countries (basemap.json)
    - Upgrade Mapbox Gl js 1.3.0
    - Swipe left on the menu => close
    - First tests with PWA : https://osmgo.dogeo.fr

# 0.9.4
## Fix
    - Translation (#21, #22)
    - Add source=survey to the changeset (instead of the object) (#23)

## Miscellaneous
    - Add link to this Github repository to About page (#24)
    - Upgrade Mapbox Gl js 1.2.0

# 0.9.2
## Fix
    - Le token d'API Mapbox a changé ... (?)

# 0.9.1
## Fix
    - Il n'est plus possible d'envoyer 2 fois un même changeset... Cela pouvait créer des doublons ! 

# 0.9.0
## Interface 
    - i18n : English version as default language ! 

## Divers
    - OsmGoAdmin permet de traduire l'interface et de créer des configurations des tags & presets selon les langues/pays

# 0.8.0
## Divers
    * Ajout et corrections de tags
    * Par défaut, à la création ou à la modification d'un objet, une source "survey" est ajouté.
        - Si il n'y a aucune "source" : source = survey
        - Si il y a une source mais qu'il n'y a pas le mot "survey", : source : survey; {l'ancienne source}
    * L'ajout de la source peut être désactivé dans les paramètres
    * Suppression de dépendances et de fichiers qui n'étaient plus utilisés ou facilement remplaçable par plus simple (leaflet extra marker, etc.)
    * La dépendance "sharp" a été remplacé par "svg2img", plus rapide et compatible Windows (pour la génération des sprites )
    * mapbox.mapbox-streets-v7.json est désormais en local...

### Fix    
    * # 15 [Affichage de la carte](https://github.com/DoFabien/OsmGo/issues/15) devrait être fixé pour toutes les plateformes 
    * Pour les tags non connus, le nom et et la clé principale apparaissait ce qui créait un doublon d'affichage
    * Un objet qui n'a pas été modifié ne peut plus être envoyé à OSM


### Osm Go Admin
Introduction d'Osm Go tag qui est un outil d'aide a la création et a la modifications des tags et presets. Il est au stade embryonnaire mais peut déjà être utile. Il est sous forme d'une application web avec une partie frontend (angular) et backend (express).
A terme, il pourra être utilisé pour faciliter la collaboration,  les traductions et éventuellement pouvoir personaliser ses popres tags par utilisateur.
Un script permet de creer les statistiques d'utilisations des tags à partir d'un PBF ( actuelement sur le France).
Plus de docs bientôt...

# 0.7.3
## Divers 
    * Mapbox Gl js 0.54.0

### Fix
    * # 15 [Affichage de la carte](https://github.com/DoFabien/OsmGo/issues/15)

# 0.7.2
### Fix
    * Les "clés" peuvent contenir des majuscules ... (ex : ref:FR_FINESS)

## Interface
    *  Affichage de la dernière modification depuis maintenant. Ex : Modifié il y a 4 mois

# 0.7.0
## Divers
    * Migration de Ionic 3 à Ionic 4
    * Mapbox Gl js 0.53.0

## Interface
    * Modification de quelques CSS
    * Un utilisateur non connecté peut désormais suivre ses modifications et les supprimer (il ne peut bien sûr pas les envoyer)
    * Retour haptique lors d'un clique sur un objet (avant l'ouverture de la fiche)
    * Le commentaire du dernier changeset est enregistré et proposé par défaut pour le suivant


# 0.6.0
### Fix
    * Fiche : affichage de l'utilisateur après l'envoi d'une modification
    * Fiche : le bouton survey:date devient un bouton classique avec une alerte de confirmation
    * Le markers sans tag connu pouvaient ne pas apparaître

## Interface
    * Ajout et harmonisation des icons
    * Lors d'un clic sur plusieur objet, on devra choisir le quel on veut séléctionner

## Config
    * Un tag peut être "obsolète", il n'apparaîtra pas dans la liste des tags
    * Possibilité d'ajouter des valeurs par défaut pour la création d'un objet
    * Ajout de la key "highway"
    * Possibilité de ne pas prendre en compte certaines valeurs si l'objet est un "way"
    * Ajout de tags et de presets

## Divers
    * Utilisation d'un unique web worker pour traiter les données (style/ filtre / wayTopoint / merge )
    * Upgrade Mapbox GL JS 0.50.0
    * Le repértoire "platforms" est sorti du .gitignore ( => FDroid)


# 0.5.(1-2-3)
### Fix
    * Certains markers pouvaient de pas s'afficher ("none" à la place de "" )
    * La key "tag" était systématiquement écrasé

# 0.5.0
## Interface
    * Ajout de nombreux tags (dont la historic=*)

## Features
    * Possibilité de filtrer les objets linéaires et surfaciques supérieur à une certaine surface/longueur
    * Possibilité d'avoir des presets spécifiques sur une même key

## Divers
    * Simplification du code de la fiche
    * Mapbox Gl Js 0.49.0

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

    