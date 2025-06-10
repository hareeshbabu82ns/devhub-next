import datetime
import os
import sqlite3
import sys
import pymongo
from lexicon_parser import LexiconHTMLParser
from indic_transliteration import sanscript
from indic_transliteration.sanscript import SchemeMap, SCHEMES, transliterate
from utils import generate_phonetic_string

# MONGO_DB_PASSWORD = pwd  \
#     MONGO_DB_HOST = 192.168.0.10  \
#     MONGO_DB_PORT = 3333  \
#     python sanskrit_utils/loaders/LexiconDicToMongodb.py

mdbHost = os.environ.get('MONGO_DB_HOST', 'localhost')
mdbPort = os.environ.get('MONGO_DB_PORT', '21017')
mdbDB = os.environ.get('MONGO_DB_DB', 'devhubjs')
mdbUser = os.environ.get('MONGO_DB_USER', 'devhubjs')
mdbPassword = os.environ.get('MONGO_DB_PASSWORD', '')

# mongodb://sansutils:pwd@192.168.0.10:3333/sansutils
mdbUrl = f'mongodb://{mdbUser}:{mdbPassword}@{mdbHost}:{mdbPort}/{mdbDB}'
# mdbUrl = 'mongodb://{mdbUser}:{mdbPassword}'
print('MongoDB connecting to:', mdbUrl)

myclient = pymongo.MongoClient(mdbUrl)

mydb = myclient[mdbDB]

dictEntriesCollection = mydb["DictWords"]
# s is always SLP1
SANS_WORD_TAG = {
    'ben': 'i',  # has both i and s
    'bhs': 'b',
    'ieg': 'i',
    'inm': 'i',
    'lan': 'b',
    'mci': 'i',
    'mw72': 'i',  # has both i and s
    'pgn': 'i',
    'pui': 'i',
    'snp': 'i',
    'vei': 'b',
    'default': 's',
}
SANS_WORD_LANG = {
    'ben': sanscript.IAST,
    'bhs': sanscript.IAST,
    'inm': sanscript.IAST,
    'lan': sanscript.IAST,
    'mci': sanscript.IAST,
    'mw72': sanscript.IAST,
    'pgn': sanscript.IAST,
    'pui': sanscript.IAST,
    'snp': sanscript.IAST,
    'vei': sanscript.IAST,
    'default': sanscript.SLP1,
}
# All Dictionaries
# LEXICON_DICT_LIST = [
#     'acc',    'ae',    'ap90',    'armh',    'ben',
#     'bhs',    'bor',    'cae',    'gst',    'ieg',
#     'inm',    'krm',    'lan',    'mci',    'md',
#     'mw',    'mw72',    'mwe',    'pe',    'pgn',
#     'pui',    'shs',    'skd',    'snp',    'vcp',
#     'vei',    'wil',    'yat', 'eng2te'
# ]
LEXICON_DICT_LIST = ['eng2te']

# pe - no transliteration needed

# Sanskrit Dictionaries
LEXICON_SAN_DICT_LIST = [
    'acc', 'ap90', 'armh', 'ben',
    'bhs', 'cae', 'gst', 'ieg',
    'inm', 'krm', 'lan', 'mci',
    'md', 'mw', 'mw72', 'pe', 'pgn',
    'pui', 'shs', 'skd', 'snp',
    'vcp', 'vei', 'wil', 'yat'
]

LEXICON_SAN_SAN_DICT_LIST = [
    'dhatu_pata',
]

# export const DICTIONARY_ORIGINS_DDLB = [
#   { label: "Dhatu Pata", value: "DHATU_PATA" },
#   { label: "English to Telugu", value: "ENG2TEL" },

#   { label: "Abhidhānaratnamālā of Halāyudha San-San", value: "ARMH" },
#   { label: "Vacaspatyam San-San", value: "VCP" },
#   { label: "Sabda-kalpadrum San-San", value: "SKD" },

#   { label: "Wilson San-Eng", value: "WIL" },
#   { label: "Yates San-Eng", value: "YAT" },
#   { label: "Goldstücker San-Eng", value: "GST" },
#   { label: "Benfey San-Eng", value: "BEN" },
#   { label: "Monier-Williams San-Eng", value: "MW72" },
#   { label: "Apte Practical San-Eng", value: "AP90" },
#   { label: "Lanman`s Sanskrit Reader Vocabulary", value: "LAN" },
#   { label: "Cappeller San-Eng", value: "CAE" },
#   { label: "Macdonell San-Eng", value: "MD" },
#   { label: "Monier-Williams San-Eng", value: "MW" },
#   { label: "Shabda-Sagara San-Eng", value: "SHS" },

#   { label: "Monier-Williams Eng-San", value: "MWE" },
#   { label: "Borooah Eng-San", value: "BOR" },
#   { label: "Apte Student`s Eng-San", value: "AE" },

#   { label: "Index to the Names in the Mahabharata", value: "INM" },
#   { label: "The Vedic Index of Names and Subjects", value: "VEI" },
#   { label: "The Purana Index", value: "PUI" },
#   { label: "Edgerton Buddhist Hybrid Sanskrit Dictionary", value: "BHS" },
#   { label: "Aufrecht`s Catalogus Catalogorum", value: "ACC" },
#   { label: "Kṛdantarūpamālā", value: "KRM" },
#   { label: "Indian Epigraphical Glossary", value: "IEG" },
#   { label: "Meulenbeld`s Sanskrit Names of Plants", value: "SNP" },
#   { label: "Puranic Encyclopedia", value: "PE" },
#   {
#     label: "Personal and Geographical Names in the Gupta Inscriptions",
#     value: "PGN",
#   },
#   { label: "Mahabharata Cultural Index", value: "MCI" },
# ] as Option[];

# All Dictionaries File Names
LEXICON_ALL_DICT = [
    'ae', 'acc', 'ap90', 'armh', 'bor',
    'ben', 'bhs', 'cae', 'gst', 'ieg',
    'inm', 'krm', 'lan', 'mci', 'md',
    'mw', 'mwe', 'mw72', 'pe', 'pui',
    'shs', 'skd', 'snp', 'vcp', 'vei',
    'wil', 'yat', 'pgn', 'eng2te', 'dhatu_pata'
]
# Dictionary - Database Names mapping
LEXICON_ALL_DICT_TO_DB_MAP = dict(
    (dictName, dictName.upper())
    for dictName in LEXICON_ALL_DICT
)
LEXICON_ALL_DICT_TO_DB_MAP['dhatu_pata'] = 'DHATU_PATA'
LEXICON_ALL_DICT_TO_DB_MAP['eng2te'] = 'ENG2TEL'
LEXICON_ALL_DICT_TO_DB_MAP['eng2en'] = 'ENG2ENG'

# Database - Table Names mapping
LEXICON_ALL_DICT_TO_TABLE_NAMES_MAP = dict(
    (dbName, dbName if dbName != 'dhatu_pata' else 'dictEntries') for dbName in LEXICON_ALL_DICT
)
LEXICON_ALL_DICT_TO_TABLE_NAMES_MAP['eng2en'] = 'entries'

# Table Names - Word Field mapping
LEXICON_ALL_TABLE_WORD_FIELD_MAP = dict(
    (dbName, 'key') for dbName in LEXICON_ALL_DICT_TO_TABLE_NAMES_MAP.values()
)
LEXICON_ALL_TABLE_WORD_FIELD_MAP['eng2te'] = 'eng_word'
LEXICON_ALL_TABLE_WORD_FIELD_MAP['dhatu_pata'] = 'word'
LEXICON_ALL_TABLE_WORD_FIELD_MAP['eng2en'] = 'word'

# Table Names - Description Field mapping
LEXICON_ALL_TABLE_DESC_FIELD_MAP = dict(
    (dbName, 'data') for dbName in LEXICON_ALL_DICT_TO_TABLE_NAMES_MAP.values()
)
LEXICON_ALL_TABLE_DESC_FIELD_MAP['dhatu_pata'] = 'desc'
LEXICON_ALL_TABLE_DESC_FIELD_MAP['eng2te'] = 'pos,pos_type,meaning'
LEXICON_ALL_TABLE_DESC_FIELD_MAP['eng2en'] = 'wordtype,definition'

SANSCRIPT_LANGS = [sanscript.DEVANAGARI, sanscript.ITRANS,
                   sanscript.IAST, sanscript.SLP1, sanscript.TELUGU]

SANSCRIPT_LANGS_TO_DB = {
    sanscript.DEVANAGARI: 'SAN',
    sanscript.IAST: 'IAST',
    sanscript.ITRANS: 'ITRANS',
    sanscript.SLP1: 'SLP1',
    sanscript.TELUGU: 'TEL'
}

unhandled_tags = set()


def convert_text(text, fr=sanscript.SLP1, to=sanscript.ITRANS):
    return transliterate(text, fr, to)


def push_to_mongodb(con, dictName):
    table_name = LEXICON_ALL_DICT_TO_TABLE_NAMES_MAP.get(dictName)
    # fetch structure of the table as per the sqlite db
    table_query_res = con.execute('PRAGMA table_info({})'.format(table_name))
    table_columns = list(table_query_res)
    table_columns_fields = [column[1] for column in table_columns]
    print('Table structure for {}:'.format(table_name))
    for column in table_columns:
        print('Column: {}, Type: {}'.format(column[1], column[2]))
    # table_columns = list(column[1] for column in table_structure)
    table_column_positions = {
        column[1]: idx for idx, column in enumerate(table_columns)}
    print('Table columns:', table_columns_fields)
    print('Table column positions:', table_column_positions)

    # total rows in the table
    total_rows = con.execute(
        f'SELECT COUNT(*) FROM {table_name}').fetchone()[0]
    # limit number of records and delete existing to upload new (for testing)
    # total_rows = 100
    # dictEntriesCollection.delete_many(
    #     {"origin": LEXICON_ALL_DICT_TO_DB_MAP[dictName]})

    # process the rows
    cur = con.cursor()

    print('working on dictionary: ', dictName, 'Table: ', table_name)
    idx = 1
    bulk_records = []
    bulk_records_chunk_size = 5000

    wordIndex = table_column_positions.get(
        LEXICON_ALL_TABLE_WORD_FIELD_MAP[dictName], None)
    descIndex = table_column_positions.get(
        LEXICON_ALL_TABLE_DESC_FIELD_MAP[dictName], None)

    wordFieldName = LEXICON_ALL_TABLE_WORD_FIELD_MAP[dictName]
    lnumFieldName = 'lnum' if 'lnum' in table_columns_fields else None
    orderFieldName = lnumFieldName if lnumFieldName is not None else wordFieldName

    for row in cur.execute(f'SELECT * FROM {table_name} order by {orderFieldName}'):
        # record = {"wordOriginal": row[0],
        #           "wordIndex": row[1],
        #           "descOriginal": row[2],
        #           "origin": dictName}

        word = row[wordIndex] if wordIndex is not None else ''
        description = row[descIndex] if descIndex is not None else ''

        # original row as a dictionary
        row_as_dict = {table_columns_fields[i]: row[i]
                       for i in range(len(row))}
        # print('Row as dict:', row_as_dict)

        # if LEXICON_ALL_TABLE_DESC_FIELD_MAP[dictName] has a comma, then we need to join the fields
        if description == '' and ',' in LEXICON_ALL_TABLE_DESC_FIELD_MAP[dictName]:
            description = ' '.join([row_as_dict.get(field, '') if row_as_dict.get(field, '') is not None else ''
                                    for field in LEXICON_ALL_TABLE_DESC_FIELD_MAP[dictName].split(',') if field in table_column_positions])

        record = {}
        attributes = []
        rowData = {
            "data": row_as_dict,
            "wordField": LEXICON_ALL_TABLE_WORD_FIELD_MAP[dictName],
            "descriptionField": LEXICON_ALL_TABLE_DESC_FIELD_MAP[dictName],
        }

        record["wordIndex"] = idx
        record["origin"] = LEXICON_ALL_DICT_TO_DB_MAP[dictName]

        rowData["wordLang"] = "SLP1"
        rowData["descriptionLang"] = "SLP1"

        if 'lnum' in table_columns_fields:
            record["wordLnum"] = row_as_dict.get('lnum', 0)

        if dictName in ['eng2te']:
            rowData["wordLang"] = "ENG"
            rowData["descriptionLang"] = "TEL"
        elif dictName in ['eng2en']:
            rowData["wordLang"] = "ENG"
            rowData["descriptionLang"] = "ENG"
        elif dictName in ['pe', 'pgn']:
            rowData["descriptionLang"] = "ENG"
        elif dictName in ['dhatu_pata']:
            rowData["wordLang"] = "SAN"
            rowData["descriptionLang"] = "SAN"
        else:
            if dictName not in LEXICON_SAN_DICT_LIST:
                rowData["wordLang"] = "ENG"

        record['word'] = get_word_transripts(word, dictName)
        record['description'] = get_desc_transripts(
            description, dictName, word)

        record['attributes'] = attributes
        record['phonetic'] = generate_phonetic_string(
            record['word'], record['description'])
        record['sourceData'] = rowData

        # print('Phonetic:', record['phonetic'], end='\n\n')

        record['createdAt'] = record['updatedAt'] = datetime.datetime.now()

        bulk_records.append(record)

        # Insert in bulk when we have chunk size records or at the end
        if len(bulk_records) >= bulk_records_chunk_size or idx == total_rows:
            dictEntriesCollection.insert_many(bulk_records)
            bulk_records = []

        # print progress for every 1% increment calculating using total_rows
        percent_complete = idx / total_rows * 100
        percent_complete_int = round(percent_complete, 1)
        # Print progress every 1% change
        if percent_complete_int % 1 == 0:
            print(
                f'Progress: {percent_complete_int:.0f}% - {idx}/{total_rows}')

        # Break if we have processed all rows
        if (idx >= total_rows):
            break
        idx = idx+1

    # print('Total unhandled tags:', len(unhandled_tags),
    #       "\nUnhandled tags:", unhandled_tags)
    con.close()


def get_desc_transripts(text, dictName, word):
    data = []
    if dictName == 'dhatu_pata':
        for lang in SANSCRIPT_LANGS:
            value = convert_text(
                text, fr=sanscript.DEVANAGARI, to=lang)
            valueTrimmed = value.strip()
            data.append(
                {"lang": SANSCRIPT_LANGS_TO_DB[lang], "value": valueTrimmed})
    elif dictName in ['eng2en']:  # English dictionaries
        valueTrimmed = text.strip()
        data.append(
            {"lang": "ENG", "value": valueTrimmed})
    # HTML stripping is needed but not transliteration
    elif dictName in ['pe', 'md', 'pui', 'pgn']:
        value = convert_lexicon_html_to_markdown(
            dictName, text, key_word=word)
        valueTrimmed = value.strip()
        data.append(
            {"lang": "ENG", "value": valueTrimmed})
    elif dictName in ['eng2te']:  # Telugu dictionaries
        for lang in SANSCRIPT_LANGS:
            value = convert_text(
                text, fr=sanscript.TELUGU, to=lang)
            valueTrimmed = value.strip()
            data.append(
                {"lang": SANSCRIPT_LANGS_TO_DB[lang], "value": valueTrimmed})
    else:
        for lang in SANSCRIPT_LANGS:
            value = convert_lexicon_html_to_markdown(
                dictName, text, key_word=word, toLang=lang)
            valueTrimmed = value.strip()
            data.append(
                {"lang": SANSCRIPT_LANGS_TO_DB[lang], "value": valueTrimmed})
    return data


def get_word_transripts(text, dictName):
    data = []
    if dictName == 'dhatu_pata':
        for lang in SANSCRIPT_LANGS:
            value = convert_text(
                text, fr=sanscript.DEVANAGARI, to=lang)
            valueTrimmed = value.strip()
            data.append(
                {"lang": SANSCRIPT_LANGS_TO_DB[lang], "value": valueTrimmed})
    elif dictName in LEXICON_SAN_DICT_LIST:
        for lang in SANSCRIPT_LANGS:
            data.append(
                {"lang": SANSCRIPT_LANGS_TO_DB[lang], "value": convert_text(text, to=lang)})
    else:
        data.append({"lang": "ENG", "value": text})
    return data


def convert_lexicon_html_to_markdown(dictionary,  content, key_word='', toLang=sanscript.DEVANAGARI):
    sans_word_tag = SANS_WORD_TAG.get(dictionary, 's')
    sans_word_lang = sanscript.IAST if sans_word_tag in [
        'i', 'b'] else sanscript.SLP1
    parser = LexiconHTMLParser()
    if dictionary in LEXICON_SAN_DICT_LIST:
        parser.init(
            dictionary=dictionary,
            sans_word_tag=sans_word_tag,
            key_fromLang=sanscript.SLP1,
            key_toLang=toLang,
            key_word=key_word,
            fromLang=sans_word_lang,
            toLang=toLang)
    else:
        parser.init(
            dictionary=dictionary,
            key_fromLang=sanscript.SLP1,
            key_toLang=sanscript.SLP1,
            key_word=key_word,
            toLang=toLang)
    parser.feed(content)
    # unhandled_tags.update(parser.unhandled_tags)

    return parser.mark_down


def add_lexicon_dict_convertions(dict_names=None):
    # Use provided dict_names or default to LEXICON_DICT_LIST if empty/None
    dictionaries_to_process = dict_names if dict_names else LEXICON_DICT_LIST

    for dictName in dictionaries_to_process:
        con = sqlite3.connect(f'tmp/{dictName}.sqlite')
        push_to_mongodb(con, dictName)
        if dictName == 'eng2te':
            con = sqlite3.connect(f'tmp/{dictName}.sqlite')
            push_to_mongodb(con, 'eng2en')


# without arguments
# python sanskrit_utils/loaders/DevHubLexiconDicToMongodb.py
# with arguments
# python sanskrit_utils/loaders/DevHubLexiconDicToMongodb.py acc vcp eng2te
if __name__ == '__main__':
    # Get dictionary names from command line arguments
    dict_names = sys.argv[1:] if len(sys.argv) > 1 else None
    add_lexicon_dict_convertions(dict_names)
