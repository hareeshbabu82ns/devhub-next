import { LANGUAGE_SCHEME_MAP } from "@/lib/constants";
import Sanscript from "@indic-transliteration/sanscript";

export const LANGUAGE_SANSCRIPT_DDLB = {
  SAN: { label: "Sanskrit", scheme: "devanagari" },
  TEL: { label: "Telugu", scheme: "telugu" },
  ITRANS: { label: "ITRANS", scheme: "itrans_dravidian" },
  IAST: { label: "IAST", scheme: "iast" },
  SLP1: { label: "SLP1", scheme: "slp1" },
} as Record<string, { label: string; scheme: string }>;

export const LANGUAGE_TO_TRANSLITERATION_DDLB = {
  SAN: { label: "Sanskrit", scheme: "devanagari" },
  TEL: { label: "Telugu", scheme: "telugu" },
} as Record<string, { label: string; scheme: string }>;

export const TRANSLITERATION_SCHEMES_FROM = [
  "itrans_dravidian",
  // "slp1",
  // "hk",
  // "wx",
  // "iast",
];

export const TRANSLITERATION_CHAR_MAP_TO_ITRANS = {
  ru: [ "R^I", "R^i" ],
  lr: [ "L^I", "L^i" ],
  ch: [ "Ch" ],
  th: [ "Th", "t" ],
  dh: [ "Dh" ],
  kh: [ "x" ],
  n: [ "~N", "~n", "N" ],
  t: [ "T" ],
  d: [ "D" ],
  s: [ "sh", "Sh" ],
  l: [ "L" ],
} as Record<string, string[]>;

const expandTransliterationText = ( text: string ): string[] => {
  const textArr: string[] = [ text ];
  Object.keys( TRANSLITERATION_CHAR_MAP_TO_ITRANS ).forEach( ( charKey ) => {
    const charArr = TRANSLITERATION_CHAR_MAP_TO_ITRANS[ charKey ];
    textArr.forEach( ( t ) => {
      if ( t.indexOf( charKey ) >= 0 ) {
        charArr.forEach( ( c ) => {
          textArr.push( t.replace( RegExp( charKey, "g" ), c ) );
        } );
      }
    } );
  } );
  // console.log(textArr);
  return textArr;
};

export const transliterateText = ( {
  text,
  toScheme,
  fromScheme = "itrans_dravidian",
}: {
  text: string;
  fromScheme?: string;
  toScheme: string;
} ): string[] => {
  const transOut = TRANSLITERATION_SCHEMES_FROM.map( ( scheme ) =>
    Sanscript.t( text, scheme, toScheme )
  );
  const replacedTransOut = expandTransliterationText( text );
  const expandedTransOut = replacedTransOut.map( ( t ) =>
    Sanscript.t( t, fromScheme, toScheme )
  );
  const transSet = new Set( [ ...transOut, ...expandedTransOut ] );
  return Array.from( transSet );
};

export type WordAtCursor = {
  start: number;
  end: number;
  word: string;
  prevText: string;
};

export const getWordAtCursor = (
  text: string,
  cursorPos: number
): WordAtCursor => {
  const letterBefore = text[ Math.max( 0, cursorPos - 1 ) ] ?? " ";
  const letterAfter = text[ Math.min( text.length, cursorPos + 1 ) ] ?? " ";
  // console.log(letterBefore, letterAfter, cursorPos, text.length, text);

  if ( letterBefore === " " && letterAfter === " " ) {
    return { start: cursorPos, end: cursorPos, word: "", prevText: "" };
  }

  let start = Math.max( 0, cursorPos - 1 );
  let end = cursorPos;

  while ( text[ start ] !== " " && start >= 0 ) {
    start--;
  }
  while ( text[ end ] !== " " && end < text.length ) {
    end++;
  }
  // console.log(start, end);

  return {
    start: start + 1,
    end,
    word: text.substring( start + 1, end ),
    prevText: "",
  };
};

export function replaceWordAtCursor( {
  textArea,
  word,
  start,
  end,
}: {
  textArea: HTMLTextAreaElement;
  word: string;
  start: number;
  end: number;
} ) {
  const oldText = textArea.value;

  const prefix = oldText.substring( 0, start );
  const suffix = oldText.substring( end );

  const newText = `${prefix}${word}${suffix}`;

  textArea.value = newText;

  textArea.selectionStart = start;
  textArea.selectionEnd = start + word.length;

  textArea.focus();
}


export const transliteratedText = ( textData: { value: string, language: string }[] ) => {
  return textData?.map( ( t ) => {
    if ( t.value.startsWith( "$transliterateFrom=" ) ) {
      const fromLangs = t.value.split( "=" ).pop()?.split( "|" );
      if ( fromLangs ) {
        for ( const fromLang of fromLangs ) {
          const from = LANGUAGE_SCHEME_MAP[ fromLang ];
          const to = LANGUAGE_SCHEME_MAP[ t.language ];
          const text = textData.find( ( v ) => v.language === fromLang )?.value;
          if ( from && to && text ) {
            const resText = Sanscript.t( text, from, to );
            console.log( { from, to, text, original: t.value, resText } );
            return { language: t.language, value: resText };
          }
        }
      }
    }
    return t;
  } );
};
export const transliteratedTextToItrans = ( textData: { value: string, language: string }[] ) => {
  return textData?.map( ( t ) => {
    const fromLang = LANGUAGE_SCHEME_MAP[ t.language ];
    if ( fromLang ) {
      return Sanscript.t( t.value, fromLang, "itrans_dravidian" );
    } else {
      return t.value;
    }
  } );
};

export const dictItemToPhonetic = ( item: {
  word?: { value: string, language: string }[],
  description: { value: string, language: string }[], attributes: { value: string, key: string }[]
} ) => {
  const textArr = [];

  textArr.push( item?.word ? transliteratedTextToItrans( item.word ) : "" );
  textArr.push(
    item?.description ? transliteratedTextToItrans( item.description ) : ""
  );
  textArr.push(
    item?.attributes?.map( ( t ) => t.key + "=" + t.value )?.join( " " ) ?? ""
  );

  const set = new Set( textArr.join( " " ).split( " " ) );
  return Array.from( set ).join( " " );
};