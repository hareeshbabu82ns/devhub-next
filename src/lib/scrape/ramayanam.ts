"use server";

import config from "@/config";
import * as cheerio from "cheerio";
import { writeFile, readFile } from "fs/promises";
import path from "path";

const entityTitle = 'raamaayaNam';
const baseUrl = "https://sacred-texts.com/hin/rys";

// 2. Scrape the slokas of each chapter and put them in a json file
export async function scrapeRayayanamPagesJSON(): Promise<void> {
  const filePath = path.resolve( `${config.dataFolder}/ramayanam/0_structure.json` );
  const bookStructure = JSON.parse( await readFile( filePath, 'utf-8' ) );

  for ( const kandam of bookStructure ) {
    console.log( `Scraping: ${kandam.title}` );

    for ( const adhyayam of kandam.adhyayams ) {
      console.log( `Scraping: ${adhyayam.title}` );

      const res = await fetch( adhyayam.url );
      const text = await res.text();
      const fileName = adhyayam.url.split( '/' ).pop();
      const filePath = path.resolve( `${config.dataFolder}/ramayanam/extract/${fileName}` );
      const filePathJSON = path.resolve( `${config.dataFolder}/ramayanam/extract/${fileName}.json` );

      const $ = cheerio.load( text );

      const slokasIast: string[] = [];
      let currentSloka: string[] = [];

      $( 'td:first' ).text().split( "\n" ).map( l => l.trim() ).filter( l => l.length ).forEach( ( line ) => {
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

      const slokasSans: string[] = [];
      currentSloka = [];

      $( 'td:last' ).text().split( "\n" ).map( l => l.trim() ).filter( l => l.length ).forEach( ( line ) => {
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

      const finalAdhyayam = {
        order: adhyayam.order,
        title: adhyayam.title,
        slokasIast,
        slokasSans,
      }

      await writeFile( filePath, text );
      await writeFile( filePathJSON, JSON.stringify( finalAdhyayam, null, 2 ) );
      console.log( `${kandam.order}-${adhyayam.order} written to: ${filePath}` );

      // console.log( finalAdhyayam, filePath );
      // if ( adhyayam.order >= 2 ) {
      //   break;
      // }
    }
    // break;
  }
}

// 1. Scrape the structure of the book with links to each chapter
export async function scrapeRamayanamPages(): Promise<void> {
  const bookStructure: any = [];

  for ( let kandamIdx = 0; kandamIdx < 7; kandamIdx++ ) {

    const paddedIdx = String( kandamIdx + 1 ).padStart( 2, '0' );
    const kandamUrl = `${baseUrl}/rysi${paddedIdx}.htm`;
    const res = await fetch( kandamUrl );
    const text = await res.text();

    const $ = cheerio.load( text );

    const kandamTitle = $( 'h4' ).first().text().trim().replace( /[\n\t]/g, '' );

    const links = $( 'a' ).toArray().map( ( a ) => {
      const href = $( a ).attr( 'href' );
      const title = $( a ).text().trim().replace( /[\n\t]/g, '' );
      if ( href && href.startsWith( `rys${kandamIdx + 1}` ) ) {
        return {
          order: parseInt( href.slice( -7, -4 ) ),
          url: `${baseUrl}/${href}`,
          title,
        };
      }
    } ).filter( ( a ) => a );

    const kandam = {
      order: kandamIdx,
      url: kandamUrl,
      title: kandamTitle,
      adhyayams: links,
    }

    bookStructure.push( kandam );
    // break;
  }

  // console.dir( bookStructure, { depth: 3 } );

  const filePath = path.resolve( `${config.dataFolder}/ramayanam/0_structure.json` );
  await writeFile( filePath, JSON.stringify( bookStructure, null, 2 ) );
  console.log( `Ramayanam book structure written to: ${filePath}` );

}