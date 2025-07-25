- sourced from https://sanskritsahitya.com/ and https://ashtadhyayi.com/

```sh
git clone https://github.com/hareeshbabu82ns/sanskritsahitya-com-data.git
git clone https://github.com/hareeshbabu82ns/ashtadhyayi-com-data.git
git clone https://github.com/hareeshbabu82ns/data.git
```

### json file structure:

```ts
{
  "title": "नाट्यशास्त्रम्",
  "custom": {"anv": {"name": "अन्वयः", "lang": "sa", "markdown": false, "order": 1}, "es": {"name": "Summary", "lang": "en", "order": 3}, "md": {"name": "M N Dutt", "lang": "en", "order": 2, "showInline": true}},
  "terms": {"chapterSg": "अध्यायः", "chapterPl": "अध्यायाः"},
  "books": [
    {"number": "1", "name": "आदिपर्व"},
    {"number": "2", "name": "सभापर्व"},
    {"number": "3", "name": "अरयण्कपर्व"},
  ],
  "chapters": [
    {"number": "1", "name": "प्रथमोऽध्याय:"},
    {"number": "2", "name": "द्वितीयोऽध्याय:"},
    {"number": "3.1", "name": "द्वितीयोऽध्याय:"},
  ],
  "data": [
    {"c": "1", "t": "श्रीरस्तु\nभरतमुनिप्रणीतं नाट्यशास्त्रम्"},
    {"c": "1", "t": "अथ प्रथमोऽध्यायः"},
    {"c": "1", "n": "1", "i": 0, "v": "प्रणम्य शिरसा देवौ पितामहमहेश्वरौ । नाट्यशास्त्रं प्रवक्ष्यामि ब्रह्मणा यदुदाहृतम् ॥",
         "ch": {"n": "अनुष्टुप्", "s": [[["प्र", "l"], ["ण", "g"], ["म्य", "l"], ["शि", "l"], ["र", "l"], ["सा", "g"], ["दे", "g"], ["वौ", "g"]], [["पि", "l"], ["ता", "g"], ["म", "l"], ["ह", "l"], ["म", "l"], ["हे", "g"], ["श्व", "l"], ["रौ", "g"]], [["ना", "g"], ["ट्य", "l"], ["शा", "g"], ["स्त्रं", "g"], ["प्र", "l"], ["व", "g"], ["क्ष्या", "g"], ["मि", "l"]], [["ब्र", "g"], ["ह्म", "l"], ["णा", "g"], ["य", "l"], ["दु", "l"], ["दा", "g"], ["हृ", "l"], ["तम्", "g"]]]}},
    {"c": "2", "t": "अथ भारतीये नाट्यशास्त्रे द्वितीयोऽध्यायः", "sp": "शकुन्तला"},
    {"c": "2", "n": "1", "i": 131, "v": "भरतस्य वचः श्रुत्वा पप्रच्छुर्मुनयस्ततः । भगवन्श्रोतुमिच्छामो यजनं रङ्गसंश्रयम् ॥",
         "ch": {"n": "अनुष्टुप्", "s": [[["भ", "l"], ["र", "l"], ["त", "g"], ["स्य", "l"], ["व", "l"], ["चः", "g"], ["श्रु", "g"], ["त्वा", "g"]], [["प", "g"], ["प्र", "g"], ["च्छु", "g"], ["र्मु", "l"], ["न", "l"], ["य", "g"], ["स्त", "l"], ["तः", "g"]], [["भ", "l"], ["ग", "l"], ["व", "g"], ["न्श्रो", "g"], ["तु", "l"], ["मि", "g"], ["च्छा", "g"], ["मो", "g"]], [["य", "l"], ["ज", "l"], ["नं", "g"], ["र", "g"], ["ङ्ग", "l"], ["सं", "g"], ["श्र", "l"], ["यम्", "g"]]]}},
    {"c": "3.1", "n": "17", "v": "विष्णुना सदृशो वीर्ये सोमवत्प्रियदर्शनः । कालाग्निसदृशः क्रोधे क्षमया पृथिवीसमः ॥", "i": 17,
         "ch": {"n": "अनुष्टुप्", "s": [[["वि", "g"], ["ष्णु", "l"], ["ना", "g"], ["स", "l"], ["दृ", "l"], ["शो", "g"], ["वी", "g"], ["र्ये", "g"]], [["सो", "g"], ["म", "l"], ["व", "g"], ["त्प्रि", "l"], ["य", "l"], ["द", "g"], ["र्श", "l"], ["नः", "g"]], [["का", "g"], ["ला", "g"], ["ग्नि", "l"], ["स", "l"], ["दृ", "l"], ["शः", "g"], ["क्रो", "g"], ["धे", "g"]], [["क्ष", "l"], ["म", "l"], ["या", "g"], ["पृ", "l"], ["थि", "l"], ["वी", "g"], ["स", "l"], ["मः", "g"]]]},
         "es": "Sri Rama is like Visnu in prowess, the Moon in pleasing appearance, the allconsuming fire in anger, the earth in patience, Kubera in chartiy and the Sun in steadfastness.",
         "anv": "वीर्ये In prowess, विष्णुना सदृशः similar to Visnu, सोमवत् in appearance like the Moon, प्रियदर्शनः pleasing to the sight, क्रोधे in anger, कालाग्निसदृशः like the all-consuming fire, क्षमया in patience, पृथिवीसमः equal to earth, त्यागे in charity, धनदेन समः like Kubera, सत्ये in truth (here steadfastness), अपरः धर्मः इव like the Sun.",
         "md": "In prowess, he is like as Vişnu, and boasts of the personal attractions of the Moon. In anger he resembles the fire raging at the time of dissolution; and in forgiveness, he is like that of the Earth.",
         "xx": [[[{"w": "विष्णुना", "l": "विष्णु", "pos": "m", "c": 3, "n": 1, "g": 1}], [{"w": "सदृशो", "l": "सदृश", "pos": "adj", "c": 1, "n": 1, "g": 1}], [{"w": "वीर्ये", "l": "वीर्य", "pos": "n", "c": 7, "n": 1, "g": 3}], [{"w": "सोमवत्", "l": "सोम", "pos": "m", "c": 0, "n": 0, "g": 1}, {"w": "सोमवत्", "l": "वत्", "pos": "ind", "c": 0, "n": 0, "g": 0}], [{"w": "प्रियदर्शनः", "l": "प्रिय", "pos": "adj", "c": 0, "n": 0, "g": 4}, {"w": "प्रियदर्शनः", "l": "दर्शन", "pos": "n", "c": 1, "n": 1, "g": 1}]], [[{"w": "कालाग्निसदृशः", "l": "काल", "pos": "m", "c": 0, "n": 0, "g": 1}, {"w": "कालाग्निसदृशः", "l": "अग्नि", "pos": "m", "c": 0, "n": 0, "g": 1}, {"w": "कालाग्निसदृशः", "l": "सदृश", "pos": "adj", "c": 1, "n": 1, "g": 1}], [{"w": "क्रोधे", "l": "क्रोध", "pos": "m", "c": 7, "n": 1, "g": 1}], [{"w": "क्षमया", "l": "क्षमा", "pos": "f", "c": 3, "n": 1, "g": 2}], [{"w": "पृथिवीसमः", "l": "पृथिवी", "pos": "f", "c": 0, "n": 0, "g": 2}, {"w": "पृथिवीसमः", "l": "सम", "pos": "pron", "c": 1, "n": 1, "g": 1}]]]},
  ],
}
```

### Structure of the JSON data:

- title: title of the book
- custom: object contains extra fields in data verses
  - key: field name in data
  - value: object
    - name: to be used instead of key for descriptions
    - lang: language of the text with en - english, sa - sanskrit options
    - markdown: boolean indicator (optional)
    - order: number (optional)
- terms: terms used in the book
  - chapterSg: chapter type (singular) (optional, type for chapters array bellow)
  - chapterPl: chapter type (plural) (optional)
  - bookSg: book type (sigular) (optional, type of books array bellow)
  - bookPl: book type (plural) (optionl)
- books: array of book objects
  - number: book index number
  - name: book title
- chapters: array of chapter objects with (optional)
  - number: if chapter number is with '.' like 3.1, it belongs to book 3 and chapter 1
  - name: name of the chapter (optional)
- data: array of verse objects with Each verse object containing:
  - c: chapter number (optional if chapters is not available)
  - n: verse number
  - i: index of the verse in the book
  - t: introductory or explanatory text (will not contain verse text, can be added as another verse)
  - v: verse text
  - sp: speaker of the verse (optional)
  - mn: meaning (optional)
  - es: English translation (optional)
  - anv: anuvada (word-by-word meaning, optional)
  - md: meaning additional (optional)
  - vd: verse description (optional)
  - ch: chandas information
    - n: name of the chandas
    - s: syllable splits, where each syllable is an array of [syllable, type(l-laghu, g-guru)] pairs
  - xx: word splits, Each word is an array of objects with:
    - w: word
    - l: lemma of the word
    - pos: part of speech
    - c: (optional)
    - n: (optional)
    - g: (optional)
    - pl: (optional)
    - vp: (optional)
    - inf: (optional)
    - tm: (optional)
    - nc: (optional)

## Hierarchical Structure Support

The Sanskrit Sahitya import logic now supports hierarchical structures:

### Books[Chapters[Verses[]]] Structure

When a `books` array exists in the JSON data:

- The `bookSg` term from the `terms` object is used to determine the entity type for books
- Books are created as child entities of the root work
- Chapters can belong to specific books using dot notation (e.g., "3.1" means chapter 1 of book 3)
- Verses are assigned to the appropriate chapter or book based on their chapter number

### Flat Chapters[Verses[]] Structure

When no `books` array exists:

- Works as before with chapters directly under the root work
- Supports sub-chapters with dot notation

### Entity Hierarchy

```
Root Work (title)
├── Book 1 (if books array exists)
│   ├── Chapter 1.1
│   │   ├── Verse 1
│   │   └── Verse 2
│   └── Chapter 1.2
└── Book 2
    └── Chapter 2.1
        └── Verse 1
```

### Implementation Details

- **Root Entity**: Uses the main title and work type (default: KAVYAM)
- **Book Entities**: Type derived from `terms.bookSg` or defaults to KAANDAM
- **Chapter Entities**: Type derived from `terms.chapterSg` or defaults to ADHYAAYAM
- **Verse Entities**: Default to SLOKAM type
- **Parent Relations**: Tracked via `parentRelation` field with type and identifiers
- **Attributes**: Enhanced with bookNumber, chapterNumber for proper hierarchy tracking
- **Split Uploads**: Big files like `ramayanam1.json` are split into multiples can be identified with
  - number at the end of file name `ramayanam1.json`, `ramayanam2.json` and so on
  - only the first file contains header info like `books` and `chapters`
  - all subsequent files contain `data` array of verses
  - while processing these files, continue with all subsequent numbered files
  - has to process memory efficient way to avoid memory errors
