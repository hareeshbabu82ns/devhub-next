"use server";

import config from "@/config";
import * as cheerio from "cheerio";
import { readFileSync, writeFileSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { db } from "../db";
import { Prisma } from "@prisma/client";
import { transliteratedText, transliterateText } from "@/app/(app)/sanscript/_components/utils";

const baseUrl = "https://sacred-texts.com/hin/mbs";
//book sample: "https://sacred-texts.com/hin/mbs/mbsi05.htm"
//chapter sample: "https://sacred-texts.com/hin/mbs/mbs05197.htm"

/*
01 = Adi Parva: The Book of the Beginning: Introduction, birth and upbringing of the princes. History of the Bharata race and the Bhrigu race

  Book 01 Chapter 35 - Names of the principal Naga chiefs
  Book 01 Chapter 57 - Names of all those Nagas that fell into the fire of the snake-sacrifice
  Book 01 Chapter 63 - Uparichara (Vasu), conquered kingdom of Chedi
  Book 01 Chapter 65 - Birth of all creatures
  Book 01 Chapter 66 - Genealogy of all the principal creatures
  Book 01 Chapter 67 - Genealogy of the Danavas, Asuras, Kauravas, Pandavas, Gandharvas, Apsaras, Rakshasas
  Book 01 Chapter 75 - Genealogies of Yadavas, Kurus, Bharatas
  Book 01 Chapter 94 - History of Puru and Pandavas (Aila dynasty)
  Book 01 Chapter 95 - History and family tree of Puru, Bharatas and Pandavas commencing from Daksha
  Book 01 Chapter 158 - Pandavas move forest to forest
  Book 01 Chapter 188 - Kshatriyas came on Swayamvara of Draupadi

02 = Sabha Parva: The Book of the Assembly Hall: Life at the court, the game of dice, and the exile of the Pandavas. Maya Danava erects the palace and court (sabha), at Indraprastha.

  Book 02 Chapter 9 - Sabha of Varuna attended by Nagas:
  Book 02 Chapter 13 - List of Kshatriyas fled to other countries out of fear of Jarasandha
  Book 02 Chapter 24 - Arjuna subjugated countries in north
  Book 02 Chapter 25 - Arjuna subjugated countries in north
  Book 02 Chapter 26 - Bhimasena subjugated countries in east
  Book 02 Chapter 27 - Bhimasena subjugated countries in east
  Book 02 Chapter 28 - Sahadeva subjugated countries in south
  Book 02 Chapter 29 - Nakula subjugated countries in south
  Book 02 Chapter 31 - Kshatriyas brought tributes on Rajasuya sacrifice of Yudhisthira
  Book 02 Chapter 47 - Kings who brought tributes to Yudhishthira
  Book 02 Chapter 48 - Kings who brought tributes to Yudhishthira

03 = Vana Parva: The Book of the Forest: The twelve years in exile in the forest (aranya).

  Book 03 Chapter 48 - Rajasuya sacrifice of Yudhisthira attended by the chiefs of many islands and countries
  Book 03 Chapter 80 - Merit attached to tirthas
  Book 03 Chapter 81 - Mentions names of Pilgrims
  Book 03 Chapter 82 - Tirthas of Dharma
  Book 03 Chapter 83 - Mentions names of Pilgrims
  Book 03 Chapter 85 - tirthas and regions of eastern country
  Book 03 Chapter 86 - Tirthas of South
  Book 03 Chapter 87 - Tirthas of West
  Book 03 Chapter 88 - Tirthas of North
  Book 03 Chapter 174 - Pandvas journey twelfth year of their sojourn in forests, reach Saraswati River

04 = Virata Parva - The Book of Virata: The year in exile spent at the court of Virata.

  Book 04 Chapter 1 - Pandavas pass their days undiscovered in Viratanagara; mention the surrounding kingdoms

05 = Udyoga Parva - The Book of the Effort: Preparations for war

  Book 05 Chapter 72 - Kings of races known for the destruction of their kinsmen
  Book 05 Chapter 103 - Bhogavati city and innumerable Nagas described


06 = Bhisma Parva - The Book of Bhishma: The first part of the great battle, with Bhishma as commander for the Kauravas.

  Book 06 Chapter 10 - Geography of Bharatavarsha, Mountains, Rivers, Provinces, Kings & Kshatriyas : Long list of 300 clans


07 = Drona Parva,

08 = Karna Parva

  Book 08 Chapter 4 - Kings slain in war
  Book 08 Chapter 17 - Elephant-warriors fighting war
  Book 08 Chapter 30 - Karna said bitter words to Madra king Shalya quoting brahmanas about the Vahikas, Madrakas;Jarttikas, Arattas.
  Book 08 Chapter 51 - 17th day of war terrible massacre of Kshatriyas


09 = Shalya Parva - The Book of Shalya, last part of battle with Shalya as commander.

  Book 09 Chapter 36 - Baladeva tracks River Sarasvati, mentions people and forest
  Book 09 Chapter 44 - the ceremony for investing Kartikeya with the status of generalissimo (सेनागणाध्यक्ष), the diverse gods, various clans who joined it about 350
  Book 09 Chapter 45 - List of the mothers (about 200) who became companions when Skanda was installed


10 = Sauptika Parva,

11 = Stri Parva ,

12 = Shanti Parva,

13 = Anusasana Parva -
  Book 13 Chapter 4 - Genealogy of Viswamitra.
  Book 13 Chapter 115 - List of Kings who had abstained from eating meat in Karttika month.


14 = Aswamedha Parva,
  Book 14 Chapter 8 - List of names of Shiva

15 = Ashramavasika Parva,

16 = Mausala Parva,

17 = Mahaprasthanika Parva,

18 = Svargarohana Parva
*/
const entityTitle = 'mahaa bhaaratam';

const parvamTitles: string[] = [
  "aadi parvam",
  "sabhaa parvam",
  "vana parvam",
  "viraaTha parvam",
  "udyOga parvam",
  "bhISma parvam",
  "dhrONa parvam",
  "karNa parvam",
  "shelya parvam",
  "sauptika parvam",
  "shtrI parvam",
  "shAMti parvam",
  "anushaashana parvam",
  "ashvamEdhika parvam",
  "aashramavaishika parvam",
  "mausala parvam",
  "mahaaprasthaanika parvam",
  "svargaarohaNa parvam",
];
const chapters = [
  225, 72, 299, 67, 197, 117, 173, 69, 64, 18, 27, 353, 154, 96, 47, 9, 3, 5,
];
const baseStructure = Array( 18 )
  .fill( 0 )
  .map( ( _, idx ) => {
    const paddedIdx = String( idx + 1 ).padStart( 2, "0" );
    return {
      idx,
      // title: `Parvam ${paddedIdx}`,
      title: parvamTitles[ idx ],
      page: `mbsi${paddedIdx}.htm`,
      url: `${baseUrl}/mbsi${paddedIdx}.htm`,
      chapters: Array( chapters[ idx ] )
        .fill( 0 )
        .map( ( _, cidx ) => {
          const paddedChapterIdx = String( cidx + 1 ).padStart( 3, "0" );
          return {
            idx: cidx,
            title: `adhyaayam ${paddedChapterIdx}`,
            page: `mbs${paddedIdx}${paddedChapterIdx}.htm`,
            url: `${baseUrl}/mbs${paddedIdx}${paddedChapterIdx}.htm`,
          };
        } ),
    };
  } );

export async function createMahabharathaEntityDB( parentId: string ) {
  // const filePath = path.resolve( `${config.dataFolder}/mahabharatham/0_structure.json` );
  // const baseStructure = readFileSync( filePath, "utf-8" );
  // console.log( baseStructure );

  let entity = undefined;

  // check if entity exists
  const entityExists = await db.entity.findFirst( {
    where: {
      type: "ITIHASAM",
      text: {
        some: {
          value: entityTitle,
        },
      },
    },
    select: { id: true, childrenRel: { select: { id: true, order: true } } }
  } );

  if ( !entityExists ) {
    const data: Prisma.EntityCreateArgs[ "data" ] = {
      type: "ITIHASAM",
      imageThumbnail: "/default-om_256.png",
      text: transliteratedText( [
        {
          "language": "ITRANS",
          "value": entityTitle
        },
        {
          "language": "SAN",
          "value": "$transliterateFrom=ITRANS"
        },
        {
          "language": "TEL",
          "value": "$transliterateFrom=ITRANS"
        },
      ] ),
      parentsRel: {
        connect: {
          id: parentId
        }
      },
      childrenRel: {
        create: baseStructure.map( ( parvam ) => ( {
          order: parvam.idx,
          type: "PARVAM",
          imageThumbnail: "/default-om_256.png",
          text: transliteratedText( [
            {
              "language": "ITRANS",
              "value": parvam.title
            },
            {
              "language": "SAN",
              "value": "$transliterateFrom=ITRANS"
            },
            {
              "language": "TEL",
              "value": "$transliterateFrom=ITRANS"
            },
          ] ),
        } ) ),
      },
    };
    // console.dir( data, { depth: 6 } );

    // create entity and parvas
    const newEntity = await db.entity.create( {
      data, select: { id: true, childrenRel: { select: { id: true, order: true } } }
    } );
    // console.log( `Entity created: ${newEntity.id}` );
    entity = newEntity;
  } else {
    entity = entityExists;
  }

  if ( !entity ) {
    throw new Error( "Root Mahabharatham Entity not created" );
  }

  console.log( `Root Entity: ${entity.id}` );

  for ( const parvam of baseStructure ) {

    const parvamEntityId = entity.childrenRel.find( ( c ) => c.order === parvam.idx )?.id;
    if ( !parvamEntityId ) {
      throw new Error( `Parvam Entity not found: ${parvam.idx}` );
    }

    for ( const chapter of parvam.chapters ) {
      const filePath = path.resolve( `${config.dataFolder}/mahabharatham/extract_slokas/${chapter.page}.json` );
      const text = await readFile( filePath, 'utf-8' );
      // console.log( text );
      const json = JSON.parse( text ) as any;
      // console.log( json );

      const data: Prisma.EntityCreateArgs[ "data" ] = {
        order: chapter.idx,
        type: "ADHYAAYAM",
        imageThumbnail: "/default-om_256.png",
        text: transliteratedText( json.entities[ 0 ].text ),
        parentsRel: {
          connect: {
            id: parvamEntityId
          }
        },
        childrenRel: {
          create: json.entities[ 0 ].children.map( ( sloka: any ) => ( {
            ...sloka,
            text: transliteratedText( sloka.text ),
          } ) ),
        },
      };

      // console.dir( data, { depth: 5 } );

      // create adhyaayam and slokas
      const newEntity = await db.entity.create( {
        data, select: { id: true }
      } );
      console.log( `adhyaayam Entity created:${parvam.idx}-${chapter.idx} ${chapter.title} ${newEntity.id}` );
      // break;
    }
    // break;
  }
}

export async function fetchSlokas() {
  const filePath = path.resolve( `${config.dataFolder}/mahabharatham/0_structure.json` );
  await writeFile( filePath, JSON.stringify( baseStructure, null, 2 ) );
  // console.log( baseStructure );
  for ( const parvam of baseStructure ) {
    for ( const chapter of parvam.chapters ) {
      const response = await fetch( chapter.url );
      const text = await response.text();
      // console.log( text );
      const filePath = path.resolve( `${config.dataFolder}/mahabharatham/extract/${chapter.page}` );
      await writeFile( filePath, text );
      // break;
    }
    // break;
  }
}

/*
<HTML>
 <HEAD>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
 <META name="description" content="The Mahabharata at Sacred-texts.com (in Sanskrit)">
 <META name="keywords" content="Mahabharata Hinduism Vedic Sanskrit Krishna Bhagavad Gita">
 <TITLE>The Mahabharata in Sanskrit: Book 18: Chapter 5</TITLE>
 </HEAD>
 <BODY>
<TABLE WIDTH="100%"
 <TR>
    <TD WIDTH="50%" VALIGN="TOP">
    <FONT COLOR="GREEN" SIZE="-1">1</FONT>
          [ज]<BR>
          भीष्मद्रॊणौ महात्मानौ धृतराष्ट्रश च पार्थिवः<BR>
          विराटद्रुपदौ चॊभौ शङ्खश चैवॊत्तरस तथा<BR>

        <FONT COLOR="GREEN" SIZE="-1">2</FONT>
          धृष्टकेतुर जयत्सेनॊ राजा चैव स सत्यजित<BR>
          दुर्यॊधन सुताश चैव शकुनिश चैव सौबलः<BR>

    </TD>

    <TD WIDTH="50%" VALIGN="TOP">
        <FONT COLOR="GREEN" SIZE="-1">1</FONT>
          कर्ण पुत्राश च विक्रान्ता राजा चैव जयद्रथः<BR>
          घटॊत्चकादयश चैव ये चान्ये नानुकीर्तिताः<BR>

        <FONT COLOR="GREEN" SIZE="-1">2</FONT>
          ये चान्ये कीर्तितास तत्र राजानॊ दीप्तमूर्तयः<BR>
          सवर्गे कालं कियन्तं ते तस्थुस तद अपि शंस मे<BR>
      </TD>
  </TR>
  </TABLE>
  </BODY>
  </HTML>
 */
export async function processSlokas() {
  // const slokas = [];
  let parvamIdx = 0;
  for ( const parvam of baseStructure ) {
    let chapterIdx = 0;
    for ( const chapter of parvam.chapters ) {
      console.log( `Processing: ${parvamIdx} ${parvam.title} - ${chapterIdx} ${chapter.title}` );
      // const response = await fetch( chapter.url );
      // const text = await response.text();
      const filePath = path.resolve( `${config.dataFolder}/mahabharatham/extract/${chapter.page}` );
      const text = await readFile( filePath, "utf-8" );

      const $ = cheerio.load( text );

      const slokasSans: string[] = [];
      let currentSloka: string[] = [];
      $( 'td:first' ).text().split( "\n" ).map( l => l.trim() ).filter( l => l.length ).forEach( ( line ) => {
        // console.log( line );
        const slokaNumber = line.match( /^\d+$/ )?.[ 0 ];
        if ( slokaNumber ) {
          // console.log( `Sloka Number: ${slokaNumber}` );
          if ( currentSloka.length ) {
            slokasSans.push( currentSloka.join( "  \n" ) );
            currentSloka = [];
          }
        } else {
          currentSloka.push( line );
        }
      } );
      // console.log( slokasSans );
      const slokasIast: string[] = [];
      currentSloka = [];
      $( 'td:last' ).text().split( "\n" ).map( l => l.trim() ).filter( l => l.length ).forEach( ( line ) => {
        // console.log( line );
        const slokaNumber = line.match( /^\d+$/ )?.[ 0 ];
        if ( slokaNumber ) {
          // console.log( `Sloka Number: ${slokaNumber}` );
          if ( currentSloka.length ) {
            slokasIast.push( currentSloka.join( "  \n" ) );
            currentSloka = [];
          }
        } else {
          currentSloka.push( line );
        }
      } );

      const finalJson = {
        version: "current",
        // parvamIdx,
        // parvam: parvam.title,
        entities: [ {
          order: chapterIdx,
          type: "ADHYAAYAM",
          text: [
            {
              "language": "ITRANS",
              "value": chapter.title
            },
            {
              "language": "SAN",
              "value": "$transliterateFrom=ITRANS"
            },
            {
              "language": "TEL",
              "value": "$transliterateFrom=ITRANS"
            },
          ],
          imageThumbnail: "/default-om_256.png",
          children: slokasSans.map( ( sloka, idx ) => ( {
            order: idx,
            type: "SLOKAM",
            imageThumbnail: "/default-om_256.png",
            text: [
              {
                "language": "SAN",
                "value": sloka
              },
              {
                "language": "IAST",
                "value": slokasIast[ idx ]
              },
              {
                "language": "ITRANS",
                "value": "$transliterateFrom=SAN"
              },
              {
                "language": "TEL",
                "value": "$transliterateFrom=SAN"
              },
            ]
          } ) ),
        } ],
      };

      const filePathSlokas = path.resolve( `${config.dataFolder}/mahabharatham/extract_slokas/${chapter.page}.json` );
      writeFileSync( filePathSlokas, JSON.stringify( finalJson, null, 2 ) );

      chapterIdx++;
      // break;
    }
    parvamIdx++;
    // break;
  }
  // return slokas;
}