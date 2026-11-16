/**
 * Fixtures mirror the markup of sacred-texts.com after its 2026 redesign
 * (trimmed copies of /categories/hinduism, /book/<slug>, /book/<slug>/<chapter>).
 */
import {
  buildBookStructure,
  isSacredTextsBlockedPage,
  parseBookOverviewPage,
  parseCategoryPage,
  parseChapterPage,
} from "../sacred-texts";

const section = (id: string, title: string, books: string) => `
<section id="${id}" class="category-section svelte-juehwe"><header class="section-head svelte-juehwe"><h2 class="svelte-juehwe">${title}</h2> <span class="ct svelte-juehwe">2
 books</span></header> <ul class="books svelte-juehwe">${books}</ul></section>`;

const book = (slug: string, title: string, extra = "") => `
<li class="book book--book svelte-juehwe"><span class="book-cover book-cover-stub"><span class="stub">${title}</span></span>
<div class="book-body"><a class="book-title svelte-juehwe" href="/book/${slug}">${title}</a>${extra}</div>
<div class="book-meta"><span class="book-year svelte-juehwe">1896</span></div></li>`;

const CATEGORY_HTML = `<html><head><title>Hinduism Books and Texts | Internet Sacred Text Archive</title></head><body>
<a href="/categories/mahabharata">Sacred-Texts: Hinduism</a>
<main class="sections">
<h1>Hinduism</h1>
<section id="the-vedas" class="category-section"><header class="section-head"><h2>The Vedas</h2></header></section>
${section(
  "rig-veda",
  "Rig Veda",
  book("the-rig-veda", "The Rig-Veda", ' <span class="book-author">Ralph T.H. Griffith</span> <div class="book-note">A complete English translation of the Rig Veda.</div>') +
    book("the-rig-veda-in-sanskrit", "Rig-Veda (Sanskrit)"),
)}
${section(
  "the-ramayana",
  "The Ramayana",
  book("ramayan-of-valmiki", "Rámáyan Of Válmíki") +
    book("the-ramayana-in-sanskrit", "The Ramayana in Sanskrit"),
)}
</main>
<aside>
${section("rig-veda", "Rig Veda", book("the-rig-veda", "The Rig-Veda"))}
</aside>
</body></html>`;

const tocRow = (book: string, slug: string, num: number, title: string) =>
  `<a class="bo-toc-row" href="/book/${book}/${slug}"><span class="bo-toc-num">${String(num).padStart(2, "0")}</span> <span class="bo-toc-title">${title}</span> <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg></a>`;

const BOOK_HTML = `<html><head>
<meta name="description" content="Meta description">
<script type="application/ld+json">{"@graph":[{"@type":"WebSite","name":"x"},{"@type":"Book","name":"The Ramayana in Sanskrit","description":"This is a version of the Ramayana in Sanskrit."}],"@context":"https://schema.org"}</script>
</head><body>
<h1 id="book-title" class="bo-title-heading">The Ramayana in Sanskrit</h1>
<span class="bo-badge">613 chapters</span>
<a href="/book/the-ramayana-in-sanskrit/book-1">Read free</a>
<section class="book-overview-module bo-toc-card"><div class="bo-toc-list">
${tocRow("the-ramayana-in-sanskrit", "book-1", 1, "Book 1")}
${tocRow("the-ramayana-in-sanskrit", "book-1-chapter-1", 2, "Book 1: Chapter 1")}
${tocRow("the-ramayana-in-sanskrit", "book-1-chapter-2", 3, "Book 1: Chapter 2")}
</div>
<a href="/book/the-ramayana-in-sanskrit?chaptersPage=2#book-overview-table-of-contents">2</a>
<a href="/book/the-ramayana-in-sanskrit?chaptersPage=25#book-overview-table-of-contents">25</a>
<a href="/book/the-ramayana-in-sanskrit?chaptersPage=2#book-overview-table-of-contents">Next</a>
</section>
<!-- rendered twice by the layout -->
<div class="bo-toc-list">${tocRow("the-ramayana-in-sanskrit", "book-1-chapter-1", 2, "Book 1: Chapter 1")}</div>
</body></html>`;

const AD = `<div class="ista-ad-host ista-fuse-host" data-fuse-zone="header_ad"><span>Advertisement</span> <a href="/subscribe">Join free, go ad-free</a> Why?</div>`;

// New site: verse number inline, IAST column first (Ramayana)
const RAMAYANA_CHAPTER_HTML = `<html><body><article class="prose"><div class="svelte-1p4s8cb"><div class="contents">
<!----><h1>Book 1</h1>Chapter 1
<table> <tbody><tr><td> 1 tapaḥsvādhyāyanirataṃ tapasvī vāgvidāṃ varam<br> nāradaṃ paripapraccha vālmīkir munipuṃgavam<br> 2 ko nv asmin sāmprataṃ loke guṇavān kaś ca vīryavān<br> dharmajñaś ca kṛtajñaś ca satyavākyo dṛḍhavrataḥ<br></td>
<td> 1 तपःस्वाध्यायनिरतं तपस्वी वाग्विदां वरम<br> नारदं परिपप्रच्छ वाल्मीकिर मुनिपुंगवम<br> 2 कॊ नव अस्मिन साम्प्रतं लॊके गुणवान कश च वीर्यवान<br> धर्मज्ञश च कृतज्ञश च सत्यवाक्यॊ दृढव्रतः<br></td></tr></tbody></table>
${AD}<p></p></div></div></article></body></html>`;

// Mahabharata: Devanagari column first, speaker marker after the number
const MBS_CHAPTER_HTML = `<html><body><article><div class="contents">
<h1>Book 18</h1><h3>Chapter 5</h3>
<table><tr><td> 1 [ज]<br> भीष्मद्रॊणौ महात्मानौ धृतराष्ट्रश च पार्थिवः<br> विराटद्रुपदौ चॊभौ शङ्खश चैवॊत्तरस तथा<br> 2 धृष्टकेतुर जयत्सेनॊ राजा चैव स सत्यजित<br> दुर्यॊधन सुताश चैव शकुनिश चैव सौबलः<br></td>
<td> 1 [j]<br> bhīṣmadroṇau mahātmānau dhṛtarāṣṭraś ca pārthivaḥ<br> virāṭadrupadau cobhau śaṅkhaś caivottaras tathā<br> 2 dhṛṣṭaketur jayatseno rājā caiva sa satyajit<br> duryodhana sutāś caiva śakuniś caiva saubalaḥ<br></td></tr></table>
<div class="not-prose">${AD}</div></div></article></body></html>`;

// archive.sacred-texts.com: number in its own <font>, &nbsp; indents
const ARCHIVE_CHAPTER_HTML = `<html><body><h1 align="CENTER">Book 1 </h1><h3 align="CENTER">Chapter 1 </h3><table width="100%"><tr><td width="50%">
 &nbsp;<font color="GREEN" size="-1">1</font>
  tapaḥsvādhyāyanirataṃ tapasvī vāgvidāṃ varam<br>
 &nbsp; nāradaṃ paripapraccha vālmīkir munipuṃgavam<br>
 &nbsp;<font color="GREEN" size="-1">2</font>
  ko nv asmin sāmprataṃ loke guṇavān kaś ca vīryavān<br>
</td></tr></table></body></html>`;

const PROSE_CHAPTER_HTML = `<html><body><article><div class="contents">
<h1><i>KH</i>ÂNDOGYA-UPANISHAD.</h1> <h2>FIRST PRAPÂ<i>TH</i>AKA.</h2>
<p>1. LET a man meditate on the syllable <a></a><a href="#fn-1" id="fnref-1" data-footnote-ref="1:2">2</a> Om, called the udgîtha.</p>
<p>2. The essence of all beings is the earth, the essence of water</p>
<p> </p><p><a>p. 2</a></p>
<p>[paragraph continues] the plants, the essence of plants man.</p>
<p>3. That udgîtha (Om) is the best of all essences.</p>
${AD}
<section data-footnotes><ol><li id="fn-1">A footnote</li></ol></section>
</div></article></body></html>`;

// Trimmed copy of the live /book/the-mahabharata-in-sanskrit/book-17-chapter-3
// (an ad <article> precedes the reader article; two .contents on the page).
const LIVE_MBS_17_3_HTML = `<html><body>
<article class="pg-placement"><div class="ista-ad-host ista-fuse-host" data-fuse-zone="header_ad"><span class="ista-ad-frame-label">Advertisement</span></div></article>
<article class="prose max-w-none prose-zinc dark:prose-invert svelte-1p4s8cb" data-slot="reader-content"><!--[-1--><!--]--> <div data-slot="reader-prose" class="svelte-1p4s8cb"><!----><div class="contents" data-slot="ad-content"><!----><h1>The Mahabharata in Sanskrit</h1> <h3>Book 17<br>Chapter 3 </h3><table> <tbody><tr><td> 1 [वै]<br> ततः संनादयञ शक्रॊ दिवं भूमिं च सर्वशः<br> रथेनॊपययौ पार्थम आरॊहेत्य अब्रवीच च तम<br> 2 स भरातॄन पतितान दृष्ट्वा धर्मराजॊ युधिष्ठिरः<br> अब्रवीच छॊकसंतप्तः सहस्राक्षम इदं वचः<br> 8 [इन्द्र]<br> अमर्त्यत्वं मत सामत्वं च राजञ; शरियं कृत्स्नां महतीं चैव कीर्तिम<br> संप्राप्तॊ ऽदय सवर्गसुखानि च तवं; तयज शवानं नात्र नृशंसम अस्ति<br> </td> <td> 1 [vai]<br> tataḥ saṃnādayañ śakro divaṃ bhūmiṃ ca sarvaśaḥ<br> rathenopayayau pārtham ārohety abravīc ca tam<br> 2 sa bhrātṝn patitān dṛṣṭvā dharmarājo yudhiṣṭhiraḥ<br> abravīc chokasaṃtaptaḥ sahasrākṣam idaṃ vacaḥ<br> 8 [indra]<br> amartyatvaṃ mat sāmatvaṃ ca rājañ; śriyaṃ kṛtsnāṃ mahatīṃ caiva kīrtim<br> saṃprāpto 'dya svargasukhāni ca tvaṃ; tyaja śvānaṃ nātra nṛśaṃsam asti<br> </td> </tr></tbody></table><div data-ad-vro="0" class="not-prose"><!----><div class="ista-ad-host ista-fuse-host" data-fuse-zone="incontent_1" aria-label="Advertisement"><div class="ista-ad-frame-bar"><span class="ista-ad-frame-label">Advertisement</span> <a class="ista-ad-frame-adfree" href="/subscribe">Join free, go ad-free</a> <button type="button">Why?</button></div></div></div> <p></p><p> </p><p> </p><!----></div><!----><!----></div> <!--[-1--><!--]--></article>
</body></html>`;

describe("sacred-texts parsers", () => {
  it("parses a live chapter page (ad article first, h3 with <br>)", () => {
    const c = parseChapterPage(LIVE_MBS_17_3_HTML);
    expect(c.kind).toBe("verses");
    expect(c.heading).toBe("The Mahabharata in Sanskrit");
    expect(c.subheading).toBe("Book 17 Chapter 3");
    expect(c.languages).toEqual(["SAN", "IAST"]);
    expect(c.verses.map((v) => v.number)).toEqual([1, 2, 8]);
    expect(c.verses[2].text.IAST).toBe(
      "[indra]  \namartyatvaṃ mat sāmatvaṃ ca rājañ; śriyaṃ kṛtsnāṃ mahatīṃ caiva kīrtim  \nsaṃprāpto 'dya svargasukhāni ca tvaṃ; tyaja śvānaṃ nātra nṛśaṃsam asti",
    );
  });

  it("detects Cloudflare block pages", () => {
    expect(
      isSacredTextsBlockedPage(
        '<html><head><title>Attention Required! | Cloudflare</title></head><body><div id="cf-error-details"></div></body></html>',
      ),
    ).toBe(true);
    expect(isSacredTextsBlockedPage(CATEGORY_HTML)).toBe(false);
  });

  it("parses category sections and dedupes repeated sections", () => {
    const cat = parseCategoryPage(CATEGORY_HTML, "hinduism");
    expect(cat.title).toBe("Hinduism");
    expect(cat.sections.map((s) => s.id)).toEqual(["rig-veda", "the-ramayana"]);
    expect(cat.sections[0].books[0]).toEqual({
      slug: "the-rig-veda",
      title: "The Rig-Veda",
      url: "https://sacred-texts.com/book/the-rig-veda",
      author: "Ralph T.H. Griffith",
      note: "A complete English translation of the Rig Veda.",
      year: "1896",
    });
    expect(cat.sections[1].books.map((b) => b.slug)).toEqual([
      "ramayan-of-valmiki",
      "the-ramayana-in-sanskrit",
    ]);
  });

  it("parses the book overview: title, description, count, pager, TOC", () => {
    const b = parseBookOverviewPage(BOOK_HTML, "the-ramayana-in-sanskrit");
    expect(b.title).toBe("The Ramayana in Sanskrit");
    expect(b.description).toBe("This is a version of the Ramayana in Sanskrit.");
    expect(b.chapterCount).toBe(613);
    expect(b.lastPage).toBe(25);
    expect(b.chapters).toEqual([
      {
        num: 1,
        title: "Book 1",
        slug: "book-1",
        url: "https://sacred-texts.com/book/the-ramayana-in-sanskrit/book-1",
      },
      {
        num: 2,
        title: "Book 1: Chapter 1",
        slug: "book-1-chapter-1",
        url: "https://sacred-texts.com/book/the-ramayana-in-sanskrit/book-1-chapter-1",
      },
      {
        num: 3,
        title: "Book 1: Chapter 2",
        slug: "book-1-chapter-2",
        url: "https://sacred-texts.com/book/the-ramayana-in-sanskrit/book-1-chapter-2",
      },
    ]);
  });

  it("parses inline-numbered verses and detects column scripts (IAST first)", () => {
    const c = parseChapterPage(RAMAYANA_CHAPTER_HTML);
    expect(c.kind).toBe("verses");
    expect(c.heading).toBe("Book 1");
    expect(c.subheading).toBe("Chapter 1");
    expect(c.languages).toEqual(["IAST", "SAN"]);
    expect(c.verses).toHaveLength(2);
    expect(c.verses[0]).toEqual({
      number: 1,
      text: {
        IAST: "tapaḥsvādhyāyanirataṃ tapasvī vāgvidāṃ varam  \nnāradaṃ paripapraccha vālmīkir munipuṃgavam",
        SAN: "तपःस्वाध्यायनिरतं तपस्वी वाग्विदां वरम  \nनारदं परिपप्रच्छ वाल्मीकिर मुनिपुंगवम",
      },
    });
    expect(c.verses[1].number).toBe(2);
  });

  it("parses Devanagari-first tables and keeps speaker markers", () => {
    const c = parseChapterPage(MBS_CHAPTER_HTML);
    expect(c.languages).toEqual(["SAN", "IAST"]);
    expect(c.subheading).toBe("Chapter 5");
    expect(c.verses).toHaveLength(2);
    expect(c.verses[0].text.SAN.split("  \n")[0]).toBe("[ज]");
    expect(c.verses[0].text.IAST.split("  \n")).toHaveLength(3);
    expect(c.verses[1].text.IAST).toContain("duryodhana");
  });

  it("still parses the archive site's <font> numbered layout", () => {
    const c = parseChapterPage(ARCHIVE_CHAPTER_HTML);
    expect(c.kind).toBe("verses");
    expect(c.verses.map((v) => v.number)).toEqual([1, 2]);
    expect(c.verses[0].text.IAST).toBe(
      "tapaḥsvādhyāyanirataṃ tapasvī vāgvidāṃ varam  \nnāradaṃ paripapraccha vālmīkir munipuṃgavam",
    );
  });

  it("parses prose chapters, dropping ads, page markers and footnote refs", () => {
    const c = parseChapterPage(PROSE_CHAPTER_HTML);
    expect(c.kind).toBe("prose");
    expect(c.heading).toBe("KHÂNDOGYA-UPANISHAD.");
    expect(c.paragraphs).toEqual([
      "1. LET a man meditate on the syllable Om, called the udgîtha.",
      "2. The essence of all beings is the earth, the essence of water the plants, the essence of plants man.",
      "3. That udgîtha (Om) is the best of all essences.",
    ]);
  });

  it("groups 'Book N: Chapter M' tables of contents", () => {
    const s = buildBookStructure([
      { num: 1, title: "Book 1", slug: "book-1", url: "u1" },
      { num: 2, title: "Book 1: Chapter 1", slug: "book-1-chapter-1", url: "u2" },
      { num: 3, title: "Book 1: Chapter 2", slug: "book-1-chapter-2", url: "u3" },
      { num: 4, title: "Book 2", slug: "book-2", url: "u4" },
      { num: 5, title: "Book 2: Chapter 1", slug: "book-2-chapter-1", url: "u5" },
      { num: 6, title: "Preface", slug: "preface", url: "u6" },
    ]);
    expect(s.mode).toBe("grouped");
    expect(s.groups.map((g) => [g.number, g.slug, g.chapters.map((c) => c.number)])).toEqual([
      [1, "book-1", [1, 2]],
      [2, "book-2", [1]],
    ]);
    expect(s.extras.map((e) => e.slug)).toEqual(["preface"]);
  });

  it("keeps other books flat in TOC order", () => {
    const s = buildBookStructure([
      { num: 1, title: "Start Reading", slug: "start-reading", url: "u1" },
      { num: 2, title: "I, 1", slug: "i-1", url: "u2" },
    ]);
    expect(s.mode).toBe("flat");
    expect(s.groups).toHaveLength(1);
    expect(s.groups[0].chapters.map((c) => c.number)).toEqual([1, 2]);
  });
});
