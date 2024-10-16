"use server";

import config from "@/config";
import * as cheerio from "cheerio";
import { writeFile, readFile } from "fs/promises";
import path from "path";

const entityTitle = 'mahaa bhaaratam';
const baseUrl = "https://sacred-texts.com/hin";
//book sample: "https://sacred-texts.com/hin/m01/index.htm"
//chapter sample: "https://sacred-texts.com/hin/m01/m01004.htm"

// 2. Scrape the meanings of each chapter and put them in a json file
export async function scrapeMeaningPagesJSON(): Promise<void> {
  const filePath = path.resolve( `${config.dataFolder}/mahabharatham/0_structure_meanings.json` );
  const bookStructure = JSON.parse( await readFile( filePath, 'utf-8' ) );

  for ( const parvam of bookStructure ) {
    console.log( `Scraping: ${parvam.title}` );

    for ( const adhyayam of parvam.adhyayams ) {
      console.log( `Scraping: ${adhyayam.title}` );

      const res = await fetch( adhyayam.url );
      const text = await res.text();
      const fileName = adhyayam.url.split( '/' ).pop();
      const filePath = path.resolve( `${config.dataFolder}/mahabharatham/extract_meanings/${fileName}` );
      const filePathJSON = path.resolve( `${config.dataFolder}/mahabharatham/extract_meanings/${fileName}.json` );

      const $ = cheerio.load( text );

      const meanings = $( 'p' ).toArray().map( ( p ) => {
        if ( $( p ).has( 'a' ) ) {
          const aText = $( p ).find( 'a' ).text().trim().replace( /[\n\t]/g, '' );
          if ( aText.startsWith( 'p. ' ) ) {
            return;
          }
        }
        const pText = $( p ).text().trim().replace( /[\n\t]/g, '' );
        if ( pText.startsWith( '"' ) || pText.startsWith( `'` ) ) {
          if ( pText.endsWith( '"' ) || pText.endsWith( `'` ) ) {
            return pText.slice( 1, -1 );
          }
          return pText.slice( 1 );
        }
        return pText;
      } ).filter( ( p ) => p );
      // .filter( ( p ) => {
      //   // filter out items with `p. 3`
      //   return !p.match( /^p\.\s\d+$/ );
      // } );

      await writeFile( filePath, text );
      await writeFile( filePathJSON, JSON.stringify( meanings, null, 2 ) );
      console.log( `${parvam.order}-${adhyayam.order} written to: ${filePath}` );
      // console.log( meanings, filePath );
      // if ( adhyayam.order >= 2 ) {
      //   break;
      // }
    }
    // break;
  }

  // console.log( `Book Structure with Meanings: `, bookStructure );
  // await writeFile( filePath, JSON.stringify( bookStructure, null, 2 ) );
  // console.log( `Mahabharatham meaning structure with meanings written to: ${filePath}` );
}


// 1. Scrape the structure of the book with links to each chapter
export async function scrapeMeaningPages(): Promise<void> {
  const bookStructure: any = [];

  for ( let parvamIdx = 0; parvamIdx < 18; parvamIdx++ ) {

    const paddedIdx = String( parvamIdx + 1 ).padStart( 2, '0' );
    const parvamUrl = `${baseUrl}/m${paddedIdx}/index.htm`;
    const res = await fetch( parvamUrl );
    const text = await res.text();

    const $ = cheerio.load( text );

    const parvamTitle = $( 'h2' ).first().text().trim().replace( /[\n\t]/g, '' );

    const links = $( 'a' ).toArray().map( ( a ) => {
      const href = $( a ).attr( 'href' );
      const title = $( a ).text().trim().replace( /[\n\t]/g, '' );
      if ( href && href.startsWith( `m${paddedIdx}` ) ) {
        return {
          order: parseInt( href.slice( -7, -4 ) ),
          url: `${baseUrl}/m${paddedIdx}/${href}`,
          title,
        };
      }
    } ).filter( ( a ) => a );

    const parvam = {
      order: parvamIdx,
      url: parvamUrl,
      title: parvamTitle,
      adhyayams: links,
    }

    bookStructure.push( parvam );
    // break;
  }

  // console.log( `Book Structure: `, bookStructure );
  const filePath = path.resolve( `${config.dataFolder}/mahabharatham/0_structure_meanings.json` );
  await writeFile( filePath, JSON.stringify( bookStructure, null, 2 ) );
  console.log( `Mahabharatham meaning structure written to: ${filePath}` );

}