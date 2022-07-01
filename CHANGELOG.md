# 1.6.0
## ✨ Features
- Using [editor-layer-index](https://osmlab.github.io/editor-layer-index/) to have a lot of aerial imagery
    - Fix: DoFabien/OsmGo#94 DoFabien/OsmGo#96 DoFabien/OsmGo#99 DoFabien/OsmGo#110
- Rework the way data are sent to OSM
- Adding a new "work in progress" screen when sending data to OSM
- Arabic translation complete. Thanks to [abdullahO2](https://github.com/abdullahO2)
- Italian translation complete. Thanks to [MarcoR](https://www.osm.org/user/MarcoR)

## 🍏 Improvements
- Use standard copy/paste icons to store/restore tags on specific object
- Update tags/presets translations from id-tagging-schema and taginfo
- Add support for tag fire_hydrant:position and fire_hydrant:diameter
- Speedup menu animations
- For tag opening_hours set minute interval to 5 minutes
- Rework fr/en UI labels and texts
- Rework UI label and texts in about screen
- In log in page, you can now see your password while typing
- Credit OSM directly on the main screen (map)
- Improve readability of markers "names" displayed under markers on the map
- Lock modifications when data are loading

## 🐞 Bug fixes
- DoFabien/OsmGo#51
- DoFabien/OsmGo#52
- DoFabien/OsmGo#76
- DoFabien/OsmGo#78
- DoFabien/OsmGo#79
- DoFabien/OsmGo#82
- DoFabien/OsmGo#89
- DoFabien/OsmGo#92
- DoFabien/OsmGo#93
- DoFabien/OsmGo#94
- DoFabien/OsmGo#95
- DoFabien/OsmGo#96
- DoFabien/OsmGo#99
- DoFabien/OsmGo#102 Trying to fix "duplicates POI sent"
- DoFabien/OsmGo#103
- DoFabien/OsmGo#107 Trying to make the app work on iOS
- DoFabien/OsmGo#109 Trying to fix by limiting the number of objects in memory to 10k (can be changed in settings)
- DoFabien/OsmGo#110
- DoFabien/OsmGo#111
- DoFabien/OsmGo#118

## 📚 Documentation
- Rework user documentation with a new Jekyll theme
    - Fix DoFabien/OsmGo#88
    - Fix DoFabien/OsmGo#91
- Upgrade READMEs
    - Move sections translate & develop to file CONTRIBUTING.md
- Add comments in scripts code

## 🔧 Technicals
- Replacing Mapbox GL JS by MapLibre GL JS 2.1.9
- Upgrade scripts to target iD editor tag/preset that have been moved in repo id-tagging-schema
- Upgrade Angular from 10 to 12
- Upgrade Capacitorjs from 2.4 to 3.2
- Add recommended capacitor plugins: app, haptics, keyboard & status-bar
- Update POI SVG icons and sprites
- Replace svg2img by svg-render
- Upgrade script osmToOsmgo to make it cross environment compatible
- Android:
    - Upgrade Gradle plugin from 3.6.3 to 4.2.1
    - Set compileSdkVersion & targetSdkVersion to 29 (Android 10)
    - Migrate to androidx and jetifier
    - Add "Osm Go Beta" logo when compiling app in debug mode (allow user to install 2 versions of Osm Go!)

# 1.5.0
## 🍏 Improvements
- Upgrade dependencies: Mapbox GL JS 1.12.0, Angular 10, etc.
- Add Basque language DoFabien/OsmGo#71

## ✨ Features
- First iteration of opening_hours interface. It uses a part of [YoHours](https://framagit.org/PanierAvide/YoHours) by Adrien Pavie (DoFabien/OsmGo#63)
    - This first version only allows you to add simple "opening_hours" format (without specific days, weeks or holidays)

# 1.3.0
- Fix DoFabien/OsmGo#66: Restaurant as self-service laundry
- Import tags from id
- Update Mapbox GL JS: 1.12.0

# 1.2.0
- Import tags from id 2.17
- Update Mapbox GL JS: 1.10.0
- DoFabien/OsmGo#62 Fix butcher (kosher, halal)

# 1.1.1
## Bug Fixes
- JS target ES5 for compatibility with < Android 7

# 1.1.0
## Bug Fixes
- DoFabien/OsmGo#61 Sprites x1 or x2

## Translation
- en & de: @m-rey
- cs: @kudlav

# 1.0.0
## Tags & presets
- Refactoring Tags & Presets configuration
    - Configuration by tags (not only by primary key/value).
        - amenity=fast_food => Fast food
        - amenity=fast_food & cuisine=pizza => Fast food Pizza
    - One files for all languages
    - Tags & presets can be filter by country code
- Import tags & presets from iD
- Import deprecated presets from ID
- Import "brand" from name-suggestion-index/
- Import languages translation from iD ! (tags & presets)
- Add keys: aerialway, playground, attraction, barrier, power, telecom, etc.
- Import descriptions from TagInfo

## ✨ Features
- You can save and restore fields
- You can fix deprecated presets automatically (with a button)
- Deprecated items are now highlighted on the map
- Ability to hide / show some tags in a dedicated menu
- You can choose between "check_date" and "survey_date" in settings menu

## Deleting Features
- Deleting the live update mode
- OsmGo-Admin has its [own repository](https://github.com/DoFabien/OsmGo-admin)

## 🍏 Improvements
- Ionic 5 & Angular 9
- Adding some unit test
- Mapbox GL JS 1.7.0
- Icons are now stored in a sprite (no SVG)

## UI
- Select multi features components
- If the name is undefined, but the ref attribute is present, the latter will be displayed on the map
- The last 20 tags used are saved and display in a list. If you want to choose another preset, you must type 3 letters in the search bar
- Add icon and color on the information sheet

# 0.12.0
## Features
- osmgo.com (translation interface: admin.osmgo.com)
- Add Capacitor instead of Cordova
- Osm Go! PWA is now fully operational (tested on Chrome and Android 9)
- Osm Go has its own .osm converter! (./scripts/osmToOsmgo)
- Data converter and all heavy calculation that run entirely in the background (in a webworker)
- Osm Go now uses OAuth to log in on web and PWA (it still use basic authentication on Android app)
- We can activate the "developer mode" and switch to the OSM dev server
    - To activate it, go to About page & tap 5 times on version card. Now you can switch to the osm dev server in settings

## Tags
- Changing the structure of tags configuration
    - deleting "lbl_alt"
    - adding "terms", "description", "warning"
- Add tags club=*
- Add tags translation from iD

## Bug Fixes
- It's now forbidden to move a node belonging to a way
- It's now possible to delete a node belonging to a way (not the node itself, only the tags)
- missing translation (DoFabien/OsmGo#37)

# 0.11.0
## Miscellaneous
- Back to cordova (capacitor is buggy and we can't build an APK without Firebase, GMS, etc.)
- PWA improvement (cache with serviceworker, icon, etc.)
- Download data: OverpassApi is too slow... => Api06 as default

## Interface
- Display the geolocation status if denied
- Display an icon on map on old objects (4 y by default) and objects with "fixme" tag (you can disable & configure this)

# 0.10.0
## Miscellaneous
- Migrating from Cordova to Capacitor
- There is now only one sprite (instead of one sprite per country). This image is generated from the fr-FR configuration.
    - If an icon is missing, the application will dynamically generate it
- The list of base maps now depends on the configuartion of the countries (basemap.json)
- Upgrade Mapbox GL JS 1.3.0
- Swipe left on the menu => close
- First tests with PWA: https://osmgo.dogeo.fr

# 0.9.4
## Fix
- Translation (DoFabien/OsmGo#21, DoFabien/OsmGo#22)
- Add source=survey to the changeset (instead of the object) (DoFabien/OsmGo#23)

## Miscellaneous
- Add link to this Github repository to About page (DoFabien/OsmGo#24)
- Upgrade Mapbox GL JS 1.2.0

# 0.9.2
## Fix
- Le token d'API Mapbox a changé... (?)

# 0.9.1
## Fix
- Il n'est plus possible d'envoyer 2 fois un même changeset... Cela pouvait créer des doublons !

# 0.9.0
## Interface
- i18n: English version as default language !

## Divers
- OsmGoAdmin permet de traduire l'interface et de créer des configurations des tags & presets selon les langues/pays

# 0.8.0
## Divers
- Ajout et corrections de tags
- Par défaut, à la création ou à la modification d'un objet, une source "survey" est ajouté.
    - Si il n'y a aucune "source" : source = survey
    - Si il y a une source mais qu'il n'y a pas le mot "survey", : source : survey; {l'ancienne source}
- L'ajout de la source peut être désactivé dans les paramètres
- Suppression de dépendances et de fichiers qui n'étaient plus utilisés ou facilement remplaçable par plus simple (leaflet extra marker, etc.)
- La dépendance "sharp" a été remplacé par "svg2img", plus rapide et compatible Windows (pour la génération des sprites)
- mapbox.mapbox-streets-v7.json est désormais en local...

### Fix
- DoFabien/OsmGo#15 devrait être fixé pour toutes les plateformes
- Pour les tags non connus, le nom et et la clé principale apparaissait ce qui créait un doublon d'affichage
- Un objet qui n'a pas été modifié ne peut plus être envoyé à OSM


### Osm Go Admin
Introduction d'Osm Go tag qui est un outil d'aide a la création et a la modifications des tags et presets. Il est au stade embryonnaire mais peut déjà être utile. Il est sous forme d'une application web avec une partie frontend (angular) et backend (express).
A terme, il pourra être utilisé pour faciliter la collaboration, les traductions et éventuellement pouvoir personaliser ses popres tags par utilisateur.
Un script permet de creer les statistiques d'utilisations des tags à partir d'un PBF (actuelement sur le France).
Plus de docs bientôt...

# 0.7.3
## Divers
- Mapbox GL JS 0.54.0

### Fix
- DoFabien/OsmGo#15

# 0.7.2
### Fix
- Les "clés" peuvent contenir des majuscules... (ex : ref:FR_FINESS)

## Interface
- Affichage de la dernière modification depuis maintenant. Ex : Modifié il y a 4 mois

# 0.7.0
## Divers
- Migration de Ionic 3 à Ionic 4
- Mapbox GL JS 0.53.0

## Interface
- Modification de quelques CSS
- Un utilisateur non connecté peut désormais suivre ses modifications et les supprimer (il ne peut bien sûr pas les envoyer)
- Retour haptique lors d'un clique sur un objet (avant l'ouverture de la fiche)
- Le commentaire du dernier changeset est enregistré et proposé par défaut pour le suivant


# 0.6.0
### Fix
- Fiche : affichage de l'utilisateur après l'envoi d'une modification
- Fiche : le bouton survey:date devient un bouton classique avec une alerte de confirmation
- Le markers sans tag connu pouvaient ne pas apparaître

## Interface
- Ajout et harmonisation des icons
- Lors d'un clic sur plusieur objet, on devra choisir le quel on veut séléctionner

## Config
- Un tag peut être "obsolète", il n'apparaîtra pas dans la liste des tags
- Possibilité d'ajouter des valeurs par défaut pour la création d'un objet
- Ajout de la key "highway"
- Possibilité de ne pas prendre en compte certaines valeurs si l'objet est un "way"
- Ajout de tags et de presets

## Divers
- Utilisation d'un unique web worker pour traiter les données (style/ filtre / wayTopoint / merge)
- Upgrade Mapbox GL JS 0.50.0
- Le repértoire "platforms" est sorti du .gitignore (=> FDroid)

# 0.5.(1-2-3)
### Fix
- Certains markers pouvaient de pas s'afficher ("none" à la place de "")
- La key "tag" était systématiquement écrasé

# 0.5.0
## Interface
- Ajout de nombreux tags (dont la historic=*)

## Features
- Possibilité de filtrer les objets linéaires et surfaciques supérieur à une certaine surface/longueur
- Possibilité d'avoir des presets spécifiques sur une même key

## Divers
- Simplification du code de la fiche
- Mapbox GL JS 0.49.0

# 0.4.0

## Interface
- Utilisation des "select" (combobox) de Ionic
- Ajout d'un tooltip à l'ouverture indiquant de télécharger les données en cliquant sur le bouton qui va bien
- Le "toast" affichant le nombre d'objets déjà stocké à l'ouverturr s'affiche désormais en haut. La partie basse contient les 3 boutons les plus utiles, autant ne pas les cacher.
- La barre de statut n'est plus cacher.
- Le symbole représentant la position de l'utilisateur à changé de forme et de type. Il est de type ["marker"](https://www.mapbox.com/mapbox-gl-js/api/#marker), son changement d'état n'engendre pas le rendu de toute la carte, le CPU et la batterie apprécient.
- Si l'orientation n'est pas disponible le symbole devient un point.
- Le cercle indiquant la précision de la localisation est maintenant de type ["circle"](https://www.mapbox.com/mapbox-gl-js/style-spec#layers-circle). C'est plus joli et moins couteux en ressource.

## Features
- Il est possible d'accéder à la carte sans géolocalisation. Soit en refusant l'accès, soit en cliquant sur le bouton qui permet de forcer l'accès à la carte
- Il est possible, depuis la fiche de consultation, d'ajouter un tag "survey:date" à la date du jour. Pour cela il suffit de presser longuement le bouton vert en bas à droite
- Il est possible de choisir l'imagerie aerienne de Mapbox dans les paramètres. Celle ci remplace celle de l'IGN qui est plus précise mais ne couvrant que la France

## Fix
- Lors du téléchargement des données à travers l'overpassapi, ce dernier peut envoyer un timout avec un code 200. Il y'a donc maintenant une verification du contenu (balise "remark")
- La création d'une nouvelle clé pouvait poser des problèmes à cause du "toLowercase" à chaque frappe
- Lorsque le menu, la fiche ou une autre page sont ouverts, le rendu de la carte est désactivé, sinon, ceci pouvait provoquer de gros ralentissements (seulement depuis la version 0.42 de mapbox, étrange..)

## Divers
- On ne peut télécharger des données qu'a partir du zoom 14, c'est déjà énorme et pas forcement conseillé...
- Il n'est plus possible d'incliner la carte à 60° (pitch). Ce n'était vraiment pas d'une grande utilité et ça engendrait pas mal de contraintes liées à la perspective.
- Adaptation pour un usage web
- Mapbox GL JS 0.42 => 0.47
