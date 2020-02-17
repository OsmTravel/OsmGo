const path = require("path");
const fs = require("fs");
const stringify = require("json-stringify-pretty-compact");
const argv = require("yargs").argv;

const assetsFolder = path.join(__dirname, "..", "src", "assets");
const tagsOsmgoPath = path.join(assetsFolder, "tagsAndPresets", "tags.json");
const presetsOsmgoPath = path.join(
  assetsFolder,
  "tagsAndPresets",
  "presets.json"
);

const idRepoPath = path.join(__dirname, "..", "..", "iD");
const idTranslationPath = path.join(idRepoPath, "dist", "locales");

let languages = [
  "fr",
  "de",
  "es",
  "pt",
  "it",
  "ru",
  "bg",
  "bn",
  "bs",
  "cs",
  "cy",
  "da",
  "dv",
  "el",
  "eo",
  "et",
  "fa",
  "fi",
  "gl",
  "he",
  "hr",
  "hu",
  "id",
  "is",
  "ja",
  "ko",
  "lt",
  "lv",
  "mk",
  "ms",
  "nl",
  "no",
  "pl",
  "ro",
  "sk",
  "sl",
  "sr",
  "sv",
  "tr",
  "uk",
  "vi",
  "zh"
];

// if (!language) {
//   console.error(language, "oops");
//   return;
// }

let overwrite = false;

if (argv["_"][1] && argv["_"][1] == "o") {
  console.log(overwrite);
  overwrite = true;
}

for (let language of languages) {
  const idTranslationFilePath = path.join(
    idTranslationPath,
    `${language}.json`
  );

  const idTr = JSON.parse(fs.readFileSync(idTranslationFilePath, "utf8"))[
    language
  ];

  // const presetsIDPath = path.join(idRepoPath, 'data', 'presets', 'fields.json')

  const tagsOsmgoConfig = JSON.parse(fs.readFileSync(tagsOsmgoPath, "utf8"));
  const tagsOsmgo = tagsOsmgoConfig.tags;
  const presetsOsmgo = JSON.parse(fs.readFileSync(presetsOsmgoPath, "utf8"));

  const trFields = idTr.presets.fields;
  const trPresets = idTr.presets.presets;
  // console.log(trPresets);

  // TAGS
  const importTrTags = (language) => {
    for (let tag of tagsOsmgo) {
      // console.log(tag.iDRef);
      if (tag.iDRef) {
        if (trPresets[tag.iDRef] && trPresets[tag.iDRef].name) {
          if (!tag.lbl[language] || overwrite) {
            tag.lbl[language] = trPresets[tag.iDRef].name;
          }
        }

        if (trPresets[tag.iDRef] && trPresets[tag.iDRef].terms) {
          if (tag.terms === undefined) {
            tag["terms"] = {};
          }
          if (!tag.terms[language] || overwrite) {
            tag.terms[language] = trPresets[tag.iDRef].terms;
          }
        }
        // console.info(tag)
        //     console.log(trPresets[tag.iDRef]);
        // console.log(tag.lbl[language])
      }
    }

    fs.writeFileSync(tagsOsmgoPath, stringify(tagsOsmgoConfig), "utf8");
  };

  const importFields = (language) => {
    for (let k in presetsOsmgo) {
      const osmGoPreset = presetsOsmgo[k];
    //   console.log(osmGoPreset);
      if (trFields[k]) {
        if (trFields[k].label) {
          if (!osmGoPreset.lbl[language] || overwrite) {
            osmGoPreset.lbl[language] = trFields[k].label;
          }
        }

        if (trFields[k].options) {
          const iDoptions = trFields[k].options;
          
          if (!osmGoPreset.options){
            osmGoPreset.options = []
          }
         
          for (let osmgoOpt of osmGoPreset.options) {
            if (iDoptions[osmgoOpt.v]) {
              if (typeof iDoptions[osmgoOpt.v] === "string") {
                if (!osmgoOpt.lbl[language] || overwrite) {
                  osmgoOpt.lbl[language] = iDoptions[osmgoOpt.v];
                }
              } else {
                if (iDoptions[osmgoOpt.v].title) {
                  if (!osmgoOpt.lbl[language] || overwrite) {
                    osmgoOpt.lbl[language] = iDoptions[osmgoOpt.v].title;
                  }
                }
              }
            }
          }
        }
      }
      //
    }

    fs.writeFileSync(presetsOsmgoPath, stringify(presetsOsmgo), "utf8");
  };

  importTrTags(language);
  importFields(language);
}
