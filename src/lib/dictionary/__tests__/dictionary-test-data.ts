// base structure
// {
//   scenario: string;
//   sourceData: any;
//   expectedData: any;
// }
export const dictionaryReProcessTestData: Record<string, any> = {
  ae: [
    {
      scenario: "Basic 1 - Eng to San (SLP1)",
      sourceData: {
        data: {
          key: "abstract",
          lnum: 52,
          data: '<H1><h><key1>abstract</key1><key2>abstract</key2></h><body><b>Abstract,</b>  <i>v. t.</i> <s>saMkzip</s> 6 P, <s>saMhf</s> 1 P. <b>2</b> <div n="lb"/><s>AdA</s> 3 A, <s>apa-ava-kfz</s> 1 P, <s>apahf</s> 1 P. <i>-s.</i> <div n="lb"/><s>sAraH, saMgrahaH, saMkzepaH</s>. <i>-a.</i> <s>viBinna; kevala;</s> <div n="lb"/><s>amUrta</s>. <b>2</b> <s>AnvIkzika</s> (<s>kI</s> <i>f.</i>), <s>nigUQa,</s> <div n="lb"/><b>-edly, -ly,</b> <i>adv.</i> <s>viviktaM</s>. <b>2</b> <s>kevalaM, mAtraM</s>. <div n="lb"/><b>-ion,</b> <i>s.</i> <s>samADiH, praRiDAnaM, DyAnEkAgratA</s>. <div n="lb"/><b>2</b> <s>apaharaRaM, AdAnaM</s>. <b>3</b> <s>viBedaH, pfTakkaraRaM</s>.</body><tail><L>52</L><pc>003</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "ENG",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 52,
        origin: "AE",
        word: [
          {
            language: "ENG",
            value: "abstract",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "Abstract,  *v. t.* __संक्षिप्__ 6 P, __संहृ__ 1 P. 2   \n__आदा__ 3 A, __अप-अव-कृष्__ 1 P, __अपहृ__ 1 P. *-s.*   \n__सारः, संग्रहः, संक्षेपः__. *-a.* __विभिन्न; केवल;__   \n__अमूर्त__. 2 __आन्वीक्षिक__ (__की__ *f.*), __निगूढ,__   \n-edly, -ly, *adv.* __विविक्तं__. 2 __केवलं, मात्रं__.   \n-ion, *s.* __समाधिः, प्रणिधानं, ध्यानैकाग्रता__.   \n2 __अपहरणं, आदानं__. 3 __विभेदः, पृथक्करणं__.",
          },
          {
            language: "ITRANS",
            value:
              "Abstract,  *v. t.* __saMkShip__ 6 P, __saMhRRi__ 1 P. 2   \n__AdA__ 3 A, __apa-ava-kRRiSh__ 1 P, __apahRRi__ 1 P. *-s.*   \n__sAraH, saMgrahaH, saMkShepaH__. *-a.* __vibhinna; kevala;__   \n__amUrta__. 2 __AnvIkShika__ (__kI__ *f.*), __nigUDha,__   \n-edly, -ly, *adv.* __viviktaM__. 2 __kevalaM, mAtraM__.   \n-ion, *s.* __samAdhiH, praNidhAnaM, dhyAnaikAgratA__.   \n2 __apaharaNaM, AdAnaM__. 3 __vibhedaH, pRRithakkaraNaM__.",
          },
          {
            language: "IAST",
            value:
              "Abstract,  *v. t.* __saṃkṣip__ 6 P, __saṃhṛ__ 1 P. 2   \n__ādā__ 3 A, __apa-ava-kṛṣ__ 1 P, __apahṛ__ 1 P. *-s.*   \n__sāraḥ, saṃgrahaḥ, saṃkṣepaḥ__. *-a.* __vibhinna; kevala;__   \n__amūrta__. 2 __ānvīkṣika__ (__kī__ *f.*), __nigūḍha,__   \n-edly, -ly, *adv.* __viviktaṃ__. 2 __kevalaṃ, mātraṃ__.   \n-ion, *s.* __samādhiḥ, praṇidhānaṃ, dhyānaikāgratā__.   \n2 __apaharaṇaṃ, ādānaṃ__. 3 __vibhedaḥ, pṛthakkaraṇaṃ__.",
          },
          {
            language: "SLP1",
            value:
              "Abstract,  *v. t.* __saMkzip__ 6 P, __saMhf__ 1 P. 2   \n__AdA__ 3 A, __apa-ava-kfz__ 1 P, __apahf__ 1 P. *-s.*   \n__sAraH, saMgrahaH, saMkzepaH__. *-a.* __viBinna; kevala;__   \n__amUrta__. 2 __AnvIkzika__ (__kI__ *f.*), __nigUQa,__   \n-edly, -ly, *adv.* __viviktaM__. 2 __kevalaM, mAtraM__.   \n-ion, *s.* __samADiH, praRiDAnaM, DyAnEkAgratA__.   \n2 __apaharaRaM, AdAnaM__. 3 __viBedaH, pfTakkaraRaM__.",
          },
          {
            language: "TEL",
            value:
              "Abstract,  *v. t.* __సంక్షిప్__ 6 P, __సంహృ__ 1 P. 2   \n__ఆదా__ 3 A, __అప-అవ-కృష్__ 1 P, __అపహృ__ 1 P. *-s.*   \n__సారః, సంగ్రహః, సంక్షేపః__. *-a.* __విభిన్న; కేవల;__   \n__అమూర్త__. 2 __ఆన్వీక్షిక__ (__కీ__ *f.*), __నిగూఢ,__   \n-edly, -ly, *adv.* __వివిక్తం__. 2 __కేవలం, మాత్రం__.   \n-ion, *s.* __సమాధిః, ప్రణిధానం, ధ్యానైకాగ్రతా__.   \n2 __అపహరణం, ఆదానం__. 3 __విభేదః, పృథక్కరణం__.",
          },
        ],
        phonetic:
          "abstract edly adv ion samkship samhrri ada apa ava krrish apahrri sarah samgrahah samkshepah vibhinna kevala amurta anvikshika nigudha viviktam kevalam matram samadhih pranidhanam dhyanaikagrata apaharanam adanam vibhedah prrithakkaranam samkzip samhf kfz apahf samkzepah vibinna anvikzika niguqa samadih praridanam dyanekagrata apahararam vibedah pftakkararam",
        wordLnum: 52,
      },
    },
  ],
  acc: [
    {
      // TODO: descr to be Eng only?
      scenario: "Basic 1 - San(SLP1) to Eng",
      sourceData: {
        data: {
          key: "agnicayana",
          lnum: 50,
          data: "<H1><h><key1>agnicayana</key1><key2>agnicayana</key2></h><body><s>agnicayana</s>  śr. Oppert 1373. 1730. 1731.</body><tail><L>50</L><pc>1-002,1</pc></tail></H1>",
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 52,
        origin: "ACC",
        word: [
          {
            language: "SAN",
            value: "अग्निचयन",
          },
          {
            language: "ITRANS",
            value: "agnichayana",
          },
          {
            language: "IAST",
            value: "agnicayana",
          },
          {
            language: "SLP1",
            value: "agnicayana",
          },
          {
            language: "TEL",
            value: "అగ్నిచయన",
          },
        ],
        description: [
          {
            language: "SAN",
            value: "__अग्निचयन__  śr. Oppert 1373. 1730. 1731.",
          },
          {
            language: "ITRANS",
            value: "__agnichayana__  śr. Oppert 1373. 1730. 1731.",
          },
          {
            language: "IAST",
            value: "__agnicayana__  śr. Oppert 1373. 1730. 1731.",
          },
          {
            language: "SLP1",
            value: "__agnicayana__  śr. Oppert 1373. 1730. 1731.",
          },
          {
            language: "TEL",
            value: "__అగ్నిచయన__  śr. Oppert 1373. 1730. 1731.",
          },
        ],
        phonetic: "agnichayana agnicayana oppert shr",
        wordLnum: 50,
      },
    },
  ],
  ap90: [
    {
      scenario: "Basic 1 - San to San",
      sourceData: {
        data: {
          key: "aMhitiH",
          lnum: 27,
          data: '<H1><h><key1>aMhitiH</key1><key2>aMhitiH</key2></h><body><s>aMhitiH</s>  <div n="1"/><b>—</b> <s>tI</s> <i><ab>f.</ab></i> [<s>aMh ktin grahAditvAt</s> <s>iw</s> <ls>Tv.</ls>] A gift.</body><tail><L>27</L><pc>0002-c</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 27,
        origin: "AP90",
        word: [
          {
            language: "SAN",
            value: "अंहितिः",
          },
          {
            language: "ITRANS",
            value: "aMhitiH",
          },
          {
            language: "IAST",
            value: "aṃhitiḥ",
          },
          {
            language: "SLP1",
            value: "aMhitiH",
          },
          {
            language: "TEL",
            value: "అంహితిః",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "__अंहितिः__  — __ती__ * `f.` * [__अंह् क्तिन् ग्रहादित्वात्__ __इट्__ Tv.] A gift.",
          },
          {
            language: "ITRANS",
            value:
              "__aMhitiH__  — __tI__ * `f.` * [__aMh ktin grahAditvAt__ __iT__ Tv.] A gift.",
          },
          {
            language: "IAST",
            value:
              "__aṃhitiḥ__  — __tī__ * `f.` * [__aṃh ktin grahāditvāt__ __iṭ__ Tv.] A gift.",
          },
          {
            language: "SLP1",
            value:
              "__aMhitiH__  — __tI__ * `f.` * [__aMh ktin grahAditvAt__ __iw__ Tv.] A gift.",
          },
          {
            language: "TEL",
            value:
              "__అంహితిః__  — __తీ__ * `f.` * [__అంహ్ క్తిన్ గ్రహాదిత్వాత్__ __ఇట్__ Tv.] A gift.",
          },
        ],
        phonetic: "amhitih gift amh ktin grahaditvat rri",
        wordLnum: 27,
      },
    },
  ],
  armh: [
    {
      scenario: "Basic 1 - San to San",
      sourceData: {
        data: {
          key: "padmaBU",
          lnum: 45,
          data: "<H1><h><key1>padmaBU</key1><key2>padmaBU</key2></h><body><s>padmaBU;</s><br/> <s>brahmA srazwA paramezWI DAtA padmaBUH surajyezWaH .</s><br/> <s>veDA viDirviriYco hiraRyagarBaH SatAnandaH .. 6 ..</s><br/> <s>SamBuH svayamBUrdruhiRaScaturvaktraH prajApatiH .</s><br/> <s>pitAmaho jagatkartA viraYciH kamalAsanaH .. 7 ..</s><br/> <s>1.1.1.6</s><br/></body><tail><L>45</L><pc>0002</pc></tail></H1>",
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 45,
        origin: "ARMH",
        word: [
          {
            language: "SAN",
            value: "पद्मभू",
          },
          {
            language: "ITRANS",
            value: "padmabhU",
          },
          {
            language: "IAST",
            value: "padmabhū",
          },
          {
            language: "SLP1",
            value: "padmaBU",
          },
          {
            language: "TEL",
            value: "పద్మభూ",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "__पद्मभू;__  \n __ब्रह्मा स्रष्टा परमेष्ठी धाता पद्मभूः सुरज्येष्ठः ।__  \n __वेधा विधिर्विरिञ्चो हिरण्यगर्भः शतानन्दः ॥ ६ ॥__  \n __शम्भुः स्वयम्भूर्द्रुहिणश्चतुर्वक्त्रः प्रजापतिः ।__  \n __पितामहो जगत्कर्ता विरञ्चिः कमलासनः ॥ ७ ॥__  \n __१।१।१।६__",
          },
          {
            language: "ITRANS",
            value:
              "__padmabhU;__  \n __brahmA sraShTA parameShThI dhAtA padmabhUH surajyeShThaH |__  \n __vedhA vidhirviri~ncho hiraNyagarbhaH shatAnandaH || 6 ||__  \n __shambhuH svayambhUrdruhiNashchaturvaktraH prajApatiH |__  \n __pitAmaho jagatkartA vira~nchiH kamalAsanaH || 7 ||__  \n __1|1|1|6__",
          },
          {
            language: "IAST",
            value:
              "__padmabhū;__  \n __brahmā sraṣṭā parameṣṭhī dhātā padmabhūḥ surajyeṣṭhaḥ |__  \n __vedhā vidhirviriñco hiraṇyagarbhaḥ śatānandaḥ || 6 ||__  \n __śambhuḥ svayambhūrdruhiṇaścaturvaktraḥ prajāpatiḥ |__  \n __pitāmaho jagatkartā virañciḥ kamalāsanaḥ || 7 ||__  \n __1|1|1|6__",
          },
          {
            language: "SLP1",
            value:
              "__padmaBU;__  \n __brahmA srazwA paramezWI DAtA padmaBUH surajyezWaH .__  \n __veDA viDirviriYco hiraRyagarBaH SatAnandaH .. 6 ..__  \n __SamBuH svayamBUrdruhiRaScaturvaktraH prajApatiH .__  \n __pitAmaho jagatkartA viraYciH kamalAsanaH .. 7 ..__  \n __1.1.1.6__",
          },
          {
            language: "TEL",
            value:
              "__పద్మభూ;__  \n __బ్రహ్మా స్రష్టా పరమేష్ఠీ ధాతా పద్మభూః సురజ్యేష్ఠః ।__  \n __వేధా విధిర్విరిఞ్చో హిరణ్యగర్భః శతానన్దః ॥ ౬ ॥__  \n __శమ్భుః స్వయమ్భూర్ద్రుహిణశ్చతుర్వక్త్రః ప్రజాపతిః ।__  \n __పితామహో జగత్కర్తా విరఞ్చిః కమలాసనః ॥ ౭ ॥__  \n __౧।౧।౧।౬__",
          },
        ],
        phonetic:
          "padmabhu padmabu brahma srashta parameshthi dhata padmabhuh surajyeshthah vedha vidhirviri ncho hiranyagarbhah shatanandah shambhuh svayambhurdruhinashchaturvaktrah prajapatih pitamaho jagatkarta vira nchih kamalasanah srazwa paramezwi data padmabuh surajyezwah veda vidirviriyco hiraryagarbah satanandah sambuh svayamburdruhirascaturvaktrah viraycih vidirviriycò",
        wordLnum: 45,
      },
    },
  ],
  bor: [
    {
      scenario: "Basic 1 - Eng to San",
      sourceData: {
        data: {
          key: "abreast",
          lnum: 66,
          data: "<H1><h><key1>abreast</key1><key2>abreast</key2></h><body><b>ABREAST:</b>  <s>pArSvApArSiva</s> (indec.)</body><tail><L>66</L><pc>003</pc></tail></H1>",
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "ENG",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 66,
        origin: "BOR",
        word: [
          {
            language: "ENG",
            value: "abreast",
          },
        ],
        description: [
          {
            language: "SAN",
            value: "ABREAST:  __पार्श्वापार्शिव__ (indec.)",
          },
          {
            language: "ITRANS",
            value: "ABREAST:  __pArshvApArshiva__ (indec.)",
          },
          {
            language: "IAST",
            value: "ABREAST:  __pārśvāpārśiva__ (indec.)",
          },
          {
            language: "SLP1",
            value: "ABREAST:  __pArSvApArSiva__ (indec.)",
          },
          {
            language: "TEL",
            value: "ABREAST:  __పార్శ్వాపార్శివ__ (indec.)",
          },
        ],
        phonetic: "abreast indec parshvaparshiva parsvaparsiva",
        wordLnum: 66,
      },
    },
  ],
  ben: [
    {
      scenario: "Basic 1 - San to Eng",
      sourceData: {
        data: {
          key: "agnisAt",
          lnum: 52,
          data: '<H1><h><key1>agnisAt</key1><key2>agnisAt</key2></h><body><s>agnisAt</s>  <i>agni-sāt</i> (<i>sāt</i> is the ori- <div n="lb">ginal <ab>abl.</ab> of <i>sa</i>), <ab>adv.</ab> Completely re- </div><div n="lb">duced to fire; with <i>kṛ,</i> To burn, Da- </div><div n="lb">śak. in <ls>Chr.</ls> 187, 14.</div></body><tail><L>52</L><pc>0004-a</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 52,
        origin: "BEN",
        word: [
          {
            language: "SAN",
            value: "अग्निसात्",
          },
          {
            language: "ITRANS",
            value: "agnisAt",
          },
          {
            language: "IAST",
            value: "agnisāt",
          },
          {
            language: "SLP1",
            value: "agnisAt",
          },
          {
            language: "TEL",
            value: "అగ్నిసాత్",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "*agnisAt*  __अग्नि-सात्__ (__सात्__ is the ori-   \nginal  `abl.`  of __स__),  `adv.`  Completely re-   \nduced to fire; with __कृ,__ To burn, Da-   \nśak. in Chr. 187, 14.",
          },
          {
            language: "ITRANS",
            value:
              "*agnisAt*  __agni-sAt__ (__sAt__ is the ori-   \nginal  `abl.`  of __sa__),  `adv.`  Completely re-   \nduced to fire; with __kRRi,__ To burn, Da-   \nśak. in Chr. 187, 14.",
          },
          {
            language: "IAST",
            value:
              "*agnisAt*  __agni-sāt__ (__sāt__ is the ori-   \nginal  `abl.`  of __sa__),  `adv.`  Completely re-   \nduced to fire; with __kṛ,__ To burn, Da-   \nśak. in Chr. 187, 14.",
          },
          {
            language: "SLP1",
            value:
              "*agnisAt*  __agni-sAt__ (__sAt__ is the ori-   \nginal  `abl.`  of __sa__),  `adv.`  Completely re-   \nduced to fire; with __kf,__ To burn, Da-   \nśak. in Chr. 187, 14.",
          },
          {
            language: "TEL",
            value:
              "*agnisAt*  __అగ్ని-సాత్__ (__సాత్__ is the ori-   \nginal  `abl.`  of __స__),  `adv.`  Completely re-   \nduced to fire; with __కృ,__ To burn, Da-   \nśak. in Chr. 187, 14.",
          },
        ],
        phonetic:
          "agnisat ori ginal completely duced fire burn chr agni sat abl adv krri śak aabl aadv shak sak",
        wordLnum: 52,
      },
    },
  ],
  bhs: [
    {
      scenario: "Basic 1 - San to San",
      sourceData: {
        data: {
          key: "akulejyezWApacAyaka",
          lnum: 41,
          data: '<H1><h><key1>akulejyezWApacAyaka</key1><key2>akulejyezWApacAyaka</key2></h><body><b>? akulejyeṣṭhāpacāyaka</b> , m.: Divy 293.26 °kaiḥ, <div n="lb"><i>not honoring the elders of the family</i>; neg. of kulajyeṣṭhā°, </div><div n="lb">see s.v. <b>apacāyaka</b>; prob. read akula°, tho a loc. in a </div><div n="lb">tatpuruṣa cpd. kulejyeṣṭha would not be impossible </div><div n="lb">(<i>eldest in the family</i>).</div></body><tail><L>41</L><pc>002,1</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 41,
        origin: "BHS",
        word: [
          {
            language: "SAN",
            value: "अकुलेज्येष्ठापचायक",
          },
          {
            language: "ITRANS",
            value: "akulejyeShThApachAyaka",
          },
          {
            language: "IAST",
            value: "akulejyeṣṭhāpacāyaka",
          },
          {
            language: "SLP1",
            value: "akulejyezWApacAyaka",
          },
          {
            language: "TEL",
            value: "అకులేజ్యేష్ఠాపచాయక",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "? akulejyeṣṭhāpacāyaka , m.: Divy 293.26 °kaiḥ,   \n*not honoring the elders of the family*; neg. of kulajyeṣṭhā°,   \nsee s.v. apacāyaka; prob. read akula°, tho a loc. in a   \ntatpuruṣa cpd. kulejyeṣṭha would not be impossible   \n(*eldest in the family*).",
          },
          {
            language: "ITRANS",
            value:
              "? akulejyeṣṭhāpacāyaka , m.: Divy 293.26 °kaiḥ,   \n*not honoring the elders of the family*; neg. of kulajyeṣṭhā°,   \nsee s.v. apacāyaka; prob. read akula°, tho a loc. in a   \ntatpuruṣa cpd. kulejyeṣṭha would not be impossible   \n(*eldest in the family*).",
          },
          {
            language: "IAST",
            value:
              "? akulejyeṣṭhāpacāyaka , m.: Divy 293.26 °kaiḥ,   \n*not honoring the elders of the family*; neg. of kulajyeṣṭhā°,   \nsee s.v. apacāyaka; prob. read akula°, tho a loc. in a   \ntatpuruṣa cpd. kulejyeṣṭha would not be impossible   \n(*eldest in the family*).",
          },
          {
            language: "SLP1",
            value:
              "? akulejyeṣṭhāpacāyaka , m.: Divy 293.26 °kaiḥ,   \n*not honoring the elders of the family*; neg. of kulajyeṣṭhā°,   \nsee s.v. apacāyaka; prob. read akula°, tho a loc. in a   \ntatpuruṣa cpd. kulejyeṣṭha would not be impossible   \n(*eldest in the family*).",
          },
          {
            language: "TEL",
            value:
              "? akulejyeṣṭhāpacāyaka , m.: Divy 293.26 °kaiḥ,   \n*not honoring the elders of the family*; neg. of kulajyeṣṭhā°,   \nsee s.v. apacāyaka; prob. read akula°, tho a loc. in a   \ntatpuruṣa cpd. kulejyeṣṭha would not be impossible   \n(*eldest in the family*).",
          },
        ],
        attributes: [],
        phonetic:
          "akulejyeshthapachayaka akulejyezwapacayaka divy not honoring elders family neg prob read tho loc cpd impossible eldest akulèjyèṣṭhāpacāyaka °keḥ kulajyèṣṭhā° apacāyaka akula° tatpuruṣa kulèjyèṣṭha °kaih kulajyeshtha° apachayaka tatpurusha kulejyeshtha °keh kulajyezwa° apacayaka tatpuruza kulejyezwa akulejyeṣṭhāpachāyaka °kaiḥ kulajyeṣṭhā° apachāyaka kulejyeṣṭha",
        wordLnum: 41,
      },
    },
  ],
  cae: [
    {
      scenario: "Basic 1 - Eng to Eng",
      sourceData: {
        data: {
          key: "aMSukAnta",
          lnum: 12,
          data: "<H1><h><key1>aMSukAnta</key1><key2>aMSukAnta</key2></h><body><s>aMSukAnta</s>  <lex>m.</lex> the edge of a garment.</body><tail><L>12</L><pc>001</pc></tail></H1>",
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 1,
        origin: "CAE",
        word: [
          {
            language: "SAN",
            value: "अंशुकान्त",
          },
          {
            language: "ITRANS",
            value: "aMshukAnta",
          },
          {
            language: "IAST",
            value: "aṃśukānta",
          },
          {
            language: "SLP1",
            value: "aMSukAnta",
          },
          {
            language: "TEL",
            value: "అంశుకాన్త",
          },
        ],
        description: [
          {
            language: "SAN",
            value: "__अंशुकान्त__  m. the edge of a garment.",
          },
          {
            language: "ITRANS",
            value: "__aMshukAnta__  m. the edge of a garment.",
          },
          {
            language: "IAST",
            value: "__aṃśukānta__  m. the edge of a garment.",
          },
          {
            language: "SLP1",
            value: "__aMSukAnta__  m. the edge of a garment.",
          },
          {
            language: "TEL",
            value: "__అంశుకాన్త__  m. the edge of a garment.",
          },
        ],
        phonetic: "amshukanta amsukanta edge garment",
        wordLnum: 12,
      },
    },
  ],
  gst: [
    {
      scenario: "Basic 1 - San to Eng",
      sourceData: {
        data: {
          key: "aMSumAlin",
          lnum: 26,
          data: "<H1><h><key1>aMSumAlin</key1><key2>aMSumAlin</key2></h><body><s>aMSumAlin</s>  m. (<s>-lI</s>) The sun. E. <s>aMSumAlA,</s> taddh. aff. <s>ini</s>.</body><tail><L>26</L><pc>002-a</pc></tail></H1>",
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 26,
        origin: "GST",
        word: [
          {
            language: "SAN",
            value: "अंशुमालिन्",
          },
          {
            language: "ITRANS",
            value: "aMshumAlin",
          },
          {
            language: "IAST",
            value: "aṃśumālin",
          },
          {
            language: "SLP1",
            value: "aMSumAlin",
          },
          {
            language: "TEL",
            value: "అంశుమాలిన్",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "__अंशुमालिन्__  m. (__-ली__) The sun. E. __अंशुमाला,__ taddh. aff. __इनि__.",
          },
          {
            language: "ITRANS",
            value:
              "__aMshumAlin__  m. (__-lI__) The sun. E. __aMshumAlA,__ taddh. aff. __ini__.",
          },
          {
            language: "IAST",
            value:
              "__aṃśumālin__  m. (__-lī__) The sun. E. __aṃśumālā,__ taddh. aff. __ini__.",
          },
          {
            language: "SLP1",
            value:
              "__aMSumAlin__  m. (__-lI__) The sun. E. __aMSumAlA,__ taddh. aff. __ini__.",
          },
          {
            language: "TEL",
            value:
              "__అంశుమాలిన్__  m. (__-లీ__) The sun. E. __అంశుమాలా,__ taddh. aff. __ఇని__.",
          },
        ],
        phonetic: "amshumalin amsumalin sun taddh aff amshumala ini amsumala",
        wordLnum: 26,
      },
    },
  ],
  ieg: [
    {
      scenario: "Basic 1 - San to Eng",
      sourceData: {
        data: {
          key: "aBayamudrA",
          lnum: 12,
          data: '<H1><h><key1>aBayamudrA</key1><key2>aBaya-mudrA</key2></h><body><i>abhaya-mudrā</i>  (HA), pose of hand offering protection, in <div n="lb">which the palm of the right hand, facing the devotee, is held </div><div n="lb">with fingers upwards. Cf. <i>abhaya-hasta.</i></div></body><tail><L>12</L><pc>001</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 12,
        origin: "IEG",
        word: [
          {
            language: "SAN",
            value: "अभयमुद्रा",
          },
          {
            language: "ITRANS",
            value: "abhayamudrA",
          },
          {
            language: "IAST",
            value: "abhayamudrā",
          },
          {
            language: "SLP1",
            value: "aBayamudrA",
          },
          {
            language: "TEL",
            value: "అభయముద్రా",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "**aBaya-mudrA**  \n__अभय-मुद्रा__  (HA), pose of hand offering protection, in   \nwhich the palm of the right hand, facing the devotee, is held   \nwith fingers upwards. Cf. __अभय-हस्त।__",
          },
          {
            language: "ITRANS",
            value:
              "**aBaya-mudrA**  \n__abhaya-mudrA__  (HA), pose of hand offering protection, in   \nwhich the palm of the right hand, facing the devotee, is held   \nwith fingers upwards. Cf. __abhaya-hasta|__",
          },
          {
            language: "IAST",
            value:
              "**aBaya-mudrA**  \n__abhaya-mudrā__  (HA), pose of hand offering protection, in   \nwhich the palm of the right hand, facing the devotee, is held   \nwith fingers upwards. Cf. __abhaya-hasta|__",
          },
          {
            language: "SLP1",
            value:
              "**aBaya-mudrA**  \n__aBaya-mudrA__  (HA), pose of hand offering protection, in   \nwhich the palm of the right hand, facing the devotee, is held   \nwith fingers upwards. Cf. __aBaya-hasta.__",
          },
          {
            language: "TEL",
            value:
              "**aBaya-mudrA**  \n__అభయ-ముద్రా__  (HA), pose of hand offering protection, in   \nwhich the palm of the right hand, facing the devotee, is held   \nwith fingers upwards. Cf. __అభయ-హస్త।__",
          },
        ],
        phonetic:
          "abhayamudra abayamudra abaya mudra pose hand offering protection palm right facing devotee held fingers upwards abhaya hasta",
        wordLnum: 12,
      },
    },
  ],
  inm: [
    {
      scenario: "Basic 1 - San to Eng",
      sourceData: {
        data: {
          key: "acala",
          lnum: 33,
          data: "<H1><h><key1>acala</key1><key2>acala</key2><hom>4</hom></h><body><b>Acala</b><sup>4</sup>  = Viṣṇu (1000 names).</body><tail><L>33</L><pc>004-1</pc></tail></H1>",
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 33,
        origin: "INM",
        word: [
          {
            language: "SAN",
            value: "अचल",
          },
          {
            language: "ITRANS",
            value: "achala",
          },
          {
            language: "IAST",
            value: "acala",
          },
          {
            language: "SLP1",
            value: "acala",
          },
          {
            language: "TEL",
            value: "అచల",
          },
        ],
        description: [
          {
            language: "SAN",
            value: "4Acala^4^  = Viṣṇu (1000 names).",
          },
          {
            language: "ITRANS",
            value: "4Acala^4^  = Viṣṇu (1000 names).",
          },
          {
            language: "IAST",
            value: "4Acala^4^  = Viṣṇu (1000 names).",
          },
          {
            language: "SLP1",
            value: "4Acala^4^  = Viṣṇu (1000 names).",
          },
          {
            language: "TEL",
            value: "4Acala^4^  = Viṣṇu (1000 names).",
          },
        ],
        phonetic: "achala acala names 4achala vishnu 4acala vizru viṣṇu",
        wordLnum: 33,
      },
    },
  ],
  krm: [
    {
      scenario: "Basic 1 - San to San",
      sourceData: {
        data: {
          key: "aNka",
          lnum: 7,
          data: '<H1><h><key1>aNka</key1><key2>aNka</key2></h><body>(7) <b><s>‘aNka pade lakzaRe ca’</s></b>  (X-1927<s>-curAdiH saka</s>. <s>sew-uBa-) adantaH .</s> <div n="NI"><s>‘aNka lakzaRa ityasya BavedaNkayatIti RO’</s> (<s>Slo</s> 41) <s>iti devaH .</s> </div><div n="lb"><s>^</s>1 <s>aNkakaH-NkikA, aYcikayizakaH-zikA</s>; </div><div n="lb"><s>aNkayitA-trI, aYcikayizitA-trI</s>; </div><div n="lb"><s>aNkayan-ntI, aYcikayizan-ntI</s>; </div><div n="lb"><s>aNkayizyan-ntI-tI, aYcikayizizyan-tI-ntI</s>; </div><div n="lb"><s>aNkayamAnaH, aYcikayizamARaH</s>; </div><div n="lb"><s>aNkayizyamARaH, aYcikayizizyamARaH</s>; </div><div n="lb"><s>an-aNkO-aNkaH</s>; </div><div n="lb"><s>aNkitam-taH-tavAn, aYcikayisitaH-tavAn</s>; </div><div n="lb"><s>aNkaH, aYcikayizuH</s>; </div><div n="lb"><s>aNkayitavyam, aYcikayizitavyam</s>; </div><div n="lb"><s>aNkanIyam, aYcikayizaRIyam</s>; </div><div n="lb"><s>aNkyam, aYcikayizyam</s>; </div><div n="lb"><s>IzadaNkaH-duraNkaH-svaNkaH</s>; </div><div n="lb"><s>aNkyamAnaH, aYcikayizyamARaH</s>; </div><div n="lb"><s>aNkaH, aYcikayizaH</s>; </div><div n="lb"><s>aNkayitum, aYcikayizitum</s>; </div><div n="lb"><s>aNkanA, aYcikayizA</s>;  [Page0008+ 37] </div><div n="lb"><s>aNkanam, aYcikayizaRam</s>; </div><div n="lb"><s>aNkayitvA, aYcikayizitvA</s>; </div><div n="lb"><s>samaNkya, samaYcikayizya</s>; </div><div n="lb"><note n="1"/><s>aNkam</s> 2, <s>aNkayitvA</s> 2, <s>aYcikayizam</s> 2 <s>aYcikayizitvA</s> 2 </div><div n="P">1. <s>DAtornityaRijantatvAt RijrahitAdrUpARi na Bavanti . anekAc</s>- </div><div n="lb"><s>tvAd yaNantarUpARyapi na .</s></div></body><tail><L>7</L><pc>0007</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 7,
        origin: "KRM",
        word: [
          {
            language: "SAN",
            value: "अङ्क",
          },
          {
            language: "ITRANS",
            value: "a~Nka",
          },
          {
            language: "IAST",
            value: "aṅka",
          },
          {
            language: "SLP1",
            value: "aNka",
          },
          {
            language: "TEL",
            value: "అఙ్క",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "(7) __‘अङ्क पदे लक्षणे च’__  (X-1927__-चुरादिः सक__. __सेट्-उभ-) अदन्तः ।__   \n__‘अङ्क लक्षण इत्यस्य भवेदङ्कयतीति णौ’__ (__श्लो__ 41) __इति देवः ।__   \n__^__1 __अङ्ककः-ङ्किका, अञ्चिकयिषकः-षिका__;   \n__अङ्कयिता-त्री, अञ्चिकयिषिता-त्री__;   \n__अङ्कयन्-न्ती, अञ्चिकयिषन्-न्ती__;   \n__अङ्कयिष्यन्-न्ती-ती, अञ्चिकयिषिष्यन्-ती-न्ती__;   \n__अङ्कयमानः, अञ्चिकयिषमाणः__;   \n__अङ्कयिष्यमाणः, अञ्चिकयिषिष्यमाणः__;   \n__अन्-अङ्कौ-अङ्कः__;   \n__अङ्कितम्-तः-तवान्, अञ्चिकयिसितः-तवान्__;   \n__अङ्कः, अञ्चिकयिषुः__;   \n__अङ्कयितव्यम्, अञ्चिकयिषितव्यम्__;   \n__अङ्कनीयम्, अञ्चिकयिषणीयम्__;   \n__अङ्क्यम्, अञ्चिकयिष्यम्__;   \n__ईषदङ्कः-दुरङ्कः-स्वङ्कः__;   \n__अङ्क्यमानः, अञ्चिकयिष्यमाणः__;   \n__अङ्कः, अञ्चिकयिषः__;   \n__अङ्कयितुम्, अञ्चिकयिषितुम्__;   \n__अङ्कना, अञ्चिकयिषा__;  [Page0008+ 37]   \n__अङ्कनम्, अञ्चिकयिषणम्__;   \n__अङ्कयित्वा, अञ्चिकयिषित्वा__;   \n__समङ्क्य, समञ्चिकयिष्य__;   \n__अङ्कम्__ 2, __अङ्कयित्वा__ 2, __अञ्चिकयिषम्__ 2 __अञ्चिकयिषित्वा__ 2 1. __धातोर्नित्यणिजन्तत्वात् णिज्रहिताद्रूपाणि न भवन्ति । अनेकाच्__-   \n__त्वाद् यङन्तरूपाण्यपि न ।__",
          },
          {
            language: "ITRANS",
            value:
              "(7) __‘a~Nka pade lakShaNe cha’__  (X-1927__-churAdiH saka__. __seT-ubha-) adantaH |__   \n__‘a~Nka lakShaNa ityasya bhaveda~NkayatIti Nau’__ (__shlo__ 41) __iti devaH |__   \n__^__1 __a~NkakaH-~NkikA, a~nchikayiShakaH-ShikA__;   \n__a~NkayitA-trI, a~nchikayiShitA-trI__;   \n__a~Nkayan-ntI, a~nchikayiShan-ntI__;   \n__a~NkayiShyan-ntI-tI, a~nchikayiShiShyan-tI-ntI__;   \n__a~NkayamAnaH, a~nchikayiShamANaH__;   \n__a~NkayiShyamANaH, a~nchikayiShiShyamANaH__;   \n__an-a~Nkau-a~NkaH__;   \n__a~Nkitam-taH-tavAn, a~nchikayisitaH-tavAn__;   \n__a~NkaH, a~nchikayiShuH__;   \n__a~Nkayitavyam, a~nchikayiShitavyam__;   \n__a~NkanIyam, a~nchikayiShaNIyam__;   \n__a~Nkyam, a~nchikayiShyam__;   \n__IShada~NkaH-dura~NkaH-sva~NkaH__;   \n__a~NkyamAnaH, a~nchikayiShyamANaH__;   \n__a~NkaH, a~nchikayiShaH__;   \n__a~Nkayitum, a~nchikayiShitum__;   \n__a~NkanA, a~nchikayiShA__;  [Page0008+ 37]   \n__a~Nkanam, a~nchikayiShaNam__;   \n__a~NkayitvA, a~nchikayiShitvA__;   \n__sama~Nkya, sama~nchikayiShya__;   \n__a~Nkam__ 2, __a~NkayitvA__ 2, __a~nchikayiSham__ 2 __a~nchikayiShitvA__ 2 1. __dhAtornityaNijantatvAt NijrahitAdrUpANi na bhavanti | anekAch__-   \n__tvAd ya~NantarUpANyapi na |__",
          },
          {
            language: "IAST",
            value:
              "(7) __‘aṅka pade lakṣaṇe ca’__  (X-1927__-curādiḥ saka__. __seṭ-ubha-) adantaḥ |__   \n__‘aṅka lakṣaṇa ityasya bhavedaṅkayatīti ṇau’__ (__ślo__ 41) __iti devaḥ |__   \n__^__1 __aṅkakaḥ-ṅkikā, añcikayiṣakaḥ-ṣikā__;   \n__aṅkayitā-trī, añcikayiṣitā-trī__;   \n__aṅkayan-ntī, añcikayiṣan-ntī__;   \n__aṅkayiṣyan-ntī-tī, añcikayiṣiṣyan-tī-ntī__;   \n__aṅkayamānaḥ, añcikayiṣamāṇaḥ__;   \n__aṅkayiṣyamāṇaḥ, añcikayiṣiṣyamāṇaḥ__;   \n__an-aṅkau-aṅkaḥ__;   \n__aṅkitam-taḥ-tavān, añcikayisitaḥ-tavān__;   \n__aṅkaḥ, añcikayiṣuḥ__;   \n__aṅkayitavyam, añcikayiṣitavyam__;   \n__aṅkanīyam, añcikayiṣaṇīyam__;   \n__aṅkyam, añcikayiṣyam__;   \n__īṣadaṅkaḥ-duraṅkaḥ-svaṅkaḥ__;   \n__aṅkyamānaḥ, añcikayiṣyamāṇaḥ__;   \n__aṅkaḥ, añcikayiṣaḥ__;   \n__aṅkayitum, añcikayiṣitum__;   \n__aṅkanā, añcikayiṣā__;  [Page0008+ 37]   \n__aṅkanam, añcikayiṣaṇam__;   \n__aṅkayitvā, añcikayiṣitvā__;   \n__samaṅkya, samañcikayiṣya__;   \n__aṅkam__ 2, __aṅkayitvā__ 2, __añcikayiṣam__ 2 __añcikayiṣitvā__ 2 1. __dhātornityaṇijantatvāt ṇijrahitādrūpāṇi na bhavanti | anekāc__-   \n__tvād yaṅantarūpāṇyapi na |__",
          },
          {
            language: "SLP1",
            value:
              "(7) __‘aNka pade lakzaRe ca’__  (X-1927__-curAdiH saka__. __sew-uBa-) adantaH .__   \n__‘aNka lakzaRa ityasya BavedaNkayatIti RO’__ (__Slo__ 41) __iti devaH .__   \n__^__1 __aNkakaH-NkikA, aYcikayizakaH-zikA__;   \n__aNkayitA-trI, aYcikayizitA-trI__;   \n__aNkayan-ntI, aYcikayizan-ntI__;   \n__aNkayizyan-ntI-tI, aYcikayizizyan-tI-ntI__;   \n__aNkayamAnaH, aYcikayizamARaH__;   \n__aNkayizyamARaH, aYcikayizizyamARaH__;   \n__an-aNkO-aNkaH__;   \n__aNkitam-taH-tavAn, aYcikayisitaH-tavAn__;   \n__aNkaH, aYcikayizuH__;   \n__aNkayitavyam, aYcikayizitavyam__;   \n__aNkanIyam, aYcikayizaRIyam__;   \n__aNkyam, aYcikayizyam__;   \n__IzadaNkaH-duraNkaH-svaNkaH__;   \n__aNkyamAnaH, aYcikayizyamARaH__;   \n__aNkaH, aYcikayizaH__;   \n__aNkayitum, aYcikayizitum__;   \n__aNkanA, aYcikayizA__;  [Page0008+ 37]   \n__aNkanam, aYcikayizaRam__;   \n__aNkayitvA, aYcikayizitvA__;   \n__samaNkya, samaYcikayizya__;   \n__aNkam__ 2, __aNkayitvA__ 2, __aYcikayizam__ 2 __aYcikayizitvA__ 2 1. __DAtornityaRijantatvAt RijrahitAdrUpARi na Bavanti . anekAc__-   \n__tvAd yaNantarUpARyapi na .__",
          },
          {
            language: "TEL",
            value:
              "(7) __‘అఙ్క పదే లక్షణే చ’__  (X-1927__-చురాదిః సక__. __సేట్-ఉభ-) అదన్తః ।__   \n__‘అఙ్క లక్షణ ఇత్యస్య భవేదఙ్కయతీతి ణౌ’__ (__శ్లో__ 41) __ఇతి దేవః ।__   \n__^__1 __అఙ్కకః-ఙ్కికా, అఞ్చికయిషకః-షికా__;   \n__అఙ్కయితా-త్రీ, అఞ్చికయిషితా-త్రీ__;   \n__అఙ్కయన్-న్తీ, అఞ్చికయిషన్-న్తీ__;   \n__అఙ్కయిష్యన్-న్తీ-తీ, అఞ్చికయిషిష్యన్-తీ-న్తీ__;   \n__అఙ్కయమానః, అఞ్చికయిషమాణః__;   \n__అఙ్కయిష్యమాణః, అఞ్చికయిషిష్యమాణః__;   \n__అన్-అఙ్కౌ-అఙ్కః__;   \n__అఙ్కితమ్-తః-తవాన్, అఞ్చికయిసితః-తవాన్__;   \n__అఙ్కః, అఞ్చికయిషుః__;   \n__అఙ్కయితవ్యమ్, అఞ్చికయిషితవ్యమ్__;   \n__అఙ్కనీయమ్, అఞ్చికయిషణీయమ్__;   \n__అఙ్క్యమ్, అఞ్చికయిష్యమ్__;   \n__ఈషదఙ్కః-దురఙ్కః-స్వఙ్కః__;   \n__అఙ్క్యమానః, అఞ్చికయిష్యమాణః__;   \n__అఙ్కః, అఞ్చికయిషః__;   \n__అఙ్కయితుమ్, అఞ్చికయిషితుమ్__;   \n__అఙ్కనా, అఞ్చికయిషా__;  [Page0008+ 37]   \n__అఙ్కనమ్, అఞ్చికయిషణమ్__;   \n__అఙ్కయిత్వా, అఞ్చికయిషిత్వా__;   \n__సమఙ్క్య, సమఞ్చికయిష్య__;   \n__అఙ్కమ్__ 2, __అఙ్కయిత్వా__ 2, __అఞ్చికయిషమ్__ 2 __అఞ్చికయిషిత్వా__ 2 1. __ధాతోర్నిత్యణిజన్తత్వాత్ ణిజ్రహితాద్రూపాణి న భవన్తి । అనేకాచ్__-   \n__త్వాద్ యఙన్తరూపాణ్యపి న ।__",
          },
        ],
        phonetic:
          "nka anka pade lakshane churadih saka set ubha adantah lakshana ityasya bhaveda nkayatiti nau shlo devah nkakah nkika nchikayishakah shika nkayita tri nchikayishita nkayan nti nchikayishan nkayishyan nchikayishishyan nkayamanah nchikayishamanah nkayishyamanah nchikayishishyamanah nkau nkah nkitam tah tavan nchikayisitah nchikayishuh nkayitavyam nchikayishitavyam nkaniyam nchikayishaniyam nkyam nchikayishyam ishada dura sva nkyamanah nchikayishyamanah nchikayishah nkayitum nchikayishitum nkana nchikayisha page0008 nkanam nchikayishanam nkayitva nchikayishitva sama nkya nchikayishya nkam nchikayisham dhatornityanijantatvat nijrahitadrupani bhavanti anekach tvad nantarupanyapi lakzare curadih sew uba lakzara bavedankayatiti slo ankakah aycikayizakah zika ankayita aycikayizita ankayan aycikayizan ankayizyan aycikayizizyan ankayamanah aycikayizamarah ankayizyamarah aycikayizizyamarah anko ankah ankitam aycikayisitah aycikayizuh ankayitavyam aycikayizitavyam ankaniyam aycikayizariyam ankyam aycikayizyam izadankah durankah svankah ankyamanah aycikayizyamarah aycikayizah ankayitum aycikayizitum ankana aycikayiza ankanam aycikayizaram ankayitva aycikayizitva samankya samaycikayizya ankam aycikayizam datornityarijantatvat rijrahitadrupari bavanti anekac yanantaruparyapi bavèdankayatiti pagè0008 phage0008",
        wordLnum: 7,
      },
    },
  ],
  lan: [
    {
      scenario: "Basic 1 - San to Eng",
      sourceData: {
        data: {
          key: "aktu",
          lnum: 14,
          data: '<H1><h><key1>aktu</key1><key2>aktu/</key2></h><body><b>aktú,</b>  <i><ab>m.</ab></i> <div n="2"/><b>—1.</b> ointment; <div n="2"/><b>—2.</b> light, beam of light; <div n="2"/><b>—3.</b> night. [for 2, <ab>cf.</ab> <lang n="greek">ἀκτίς</lang>, ‘beam.’]</body><tail><L>14</L><pc>111-a</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 14,
        origin: "LAN",
        word: [
          {
            language: "SAN",
            value: "अक्तु",
          },
          {
            language: "ITRANS",
            value: "aktu",
          },
          {
            language: "IAST",
            value: "aktu",
          },
          {
            language: "SLP1",
            value: "aktu",
          },
          {
            language: "TEL",
            value: "అక్తు",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "**aktu/**  \naktú,  * `m.` * —1. ointment; —2. light, beam of light; —3. night. [for 2,  `cf.`  ἀκτίς, ‘beam.’]",
          },
          {
            language: "ITRANS",
            value:
              "**aktu/**  \naktú,  * `m.` * —1. ointment; —2. light, beam of light; —3. night. [for 2,  `cf.`  ἀκτίς, ‘beam.’]",
          },
          {
            language: "IAST",
            value:
              "**aktu/**  \naktú,  * `m.` * —1. ointment; —2. light, beam of light; —3. night. [for 2,  `cf.`  ἀκτίς, ‘beam.’]",
          },
          {
            language: "SLP1",
            value:
              "**aktu/**  \naktú,  * `m.` * —1. ointment; —2. light, beam of light; —3. night. [for 2,  `cf.`  ἀκτίς, ‘beam.’]",
          },
          {
            language: "TEL",
            value:
              "**aktu/**  \naktú,  * `m.` * —1. ointment; —2. light, beam of light; —3. night. [for 2,  `cf.`  ἀκτίς, ‘beam.’]",
          },
        ],
        phonetic: "aktu ointment light beam night aktú cp0 aktú achf chrri",
        wordLnum: 14,
      },
    },
  ],
  mci: [
    {
      scenario: "Basic - San to Eng",
      sourceData: {
        data: {
          key: "ErAvata",
          lnum: 49,
          data: '<H1><h><key1>ErAvata</key1><key2>ErAvata</key2><hom>1</hom></h><body><b>Airāvata<sup>1</sup></b>  m.: A mythical king of <div n="lb">serpents (<i>nāgarāja</i> 6. 86. 6) living in Bhoga- </div><div n="lb">vatī Purī 5. 101. 11, 1. </div><div n="lb"><b>A.</b> Birth: Son of Surasā and Kaśyapa </div><div n="lb">5. 101. 4, 17; description 5. 101. 5-7; also </div><div n="lb">listed by Sūta among the sons of Kadrū 1. </div><div n="lb">31. 5. <b>B.</b> Children: His son (not named) </div><div n="lb">picked up the <i>kuṇḍalas,</i> given to Uttaṅka by </div><div n="lb">Madayantī, and entered the <i>nāgaloka</i> 14. 57. </div><div n="lb">39 (<i>airāvatasuta</i>), 22 (<i>airāvatakulotpanna</i>) </div><div n="lb">[According to 1. 3. 136 ff. the <i>kuṇḍalas</i> </div><div n="lb">were taken away by Takṣaka]; Airāvata gave </div><div n="lb">his widowed daughter (not named, Ulūpī ?; </div><div n="lb">but cf. the next) to Arjuna in marriage 6. 86. </div><div n="lb">6-8. <b>C.</b> Descendants: Founder of a family </div><div n="lb">(<i>kula</i>) 1. 52. 11; Kauravya, father of Ulūpī </div><div n="lb">born in Airāvata\'s <i>kula</i> 1. 206. 18; Sumukha, </div><div n="lb">son of Cikura, was born in his <i>kula</i> 5. 101. </div><div n="lb">23; serpents living in the <i>nāgaloka</i> described </div><div n="lb">as born in the family of Airavata (<i>airāvatod-</i> </div><div n="lb"><i>bhavāḥ</i>), who have Airāvata as their king </div><div n="lb">(<i>airāvatarājānaḥ</i>), and whose eldest brother </div><div n="lb">is Airāvata (<i>airāvatajyeṣṭhabhrātṛbhyaḥ … </i> </div><div n="lb"><i>namaḥ</i>) 1, 3. 140, 139. 143; his descendants </div><div n="lb">(<i>airāvatāḥ</i>) sided with Arjuna when mythi- </div><div n="lb">cal beings, gathered in the sky, took sides </div><div n="lb">between Karṇa and Arjuna 8. 63. 37. <b>D.</b> </div><div n="lb">An arrow from the <i>vaṃśa</i> of Airāvata: A </div><div n="lb">fierce, burning arrow having a serpent at its </div><div n="lb">sharp point (<i>sarpamukha śara</i>), very poi- </div><div n="lb">sonous (<i>mahāviṣa</i>) [on which Aśvasena, </div><div n="lb">son of Takṣaka, lay 8. 66. 23], and which </div><div n="lb">was reserved by Karṇa to be shot at Arjuna </div><div n="lb">described as belonging to the <i>vaṃśa</i> of </div><div n="lb">Airāvata (<i>airāvatavaṃśasaṃbhava</i>) 8. 66. 5, [Page008-b+ 40] </div><div n="lb">6. <b>E.</b> Importance: He is one of the </div><div n="lb">guardians of Bhogavatī Purī 5. 107. 19; one </div><div n="lb">of the <i>nāgas</i> who wait on Varuṇa in his <i>sabhā</i> </div><div n="lb">2. 9. 8; Sumukha chosen as bride-groom for </div><div n="lb">Guṇakeśī, daughter of Mātali, out of regard </div><div n="lb">for Airāvata 5. 102. 10; Vāsuki consulted </div><div n="lb">him, together with others, who were all </div><div n="lb"><i>dharmaparāyaṇa</i> how to neutralize the curse </div><div n="lb">uttered by their mother on them 1. 33. 2; Ut- </div><div n="lb">taṅka said no one would want to move in the </div><div n="lb">army of the enemies unless Airāvata accom- </div><div n="lb">panied them 1. 3. 141. <b>F.</b> Events: (i) </div><div n="lb">His dwelling (<i>niveśana</i>) filled with smoke </div><div n="lb">when Uttaṅka blew into the anus of a </div><div n="lb">horse 14. 57. 47; (ii) He and Citra were </div><div n="lb">agitated on hearing the roar of Skanda; </div><div n="lb">when Skanda saw Airāvata and Citra approa- </div><div n="lb">ching he caught them in his hands 3. 214. </div><div n="lb">22, 23.</div></body><tail><L>49</L><pc>008-a</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 49,
        origin: "MCI",
        word: [
          {
            language: "SAN",
            value: "ऐरावत",
          },
          {
            language: "ITRANS",
            value: "airAvata",
          },
          {
            language: "IAST",
            value: "airāvata",
          },
          {
            language: "SLP1",
            value: "ErAvata",
          },
          {
            language: "TEL",
            value: "ఐరావత",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "1Airāvata^1^  m.: A mythical king of   \nserpents (__नागराज__ 6. 86. 6) living in Bhoga-   \nvatī Purī 5. 101. 11, 1.   \nA. Birth: Son of Surasā and Kaśyapa   \n5. 101. 4, 17; description 5. 101. 5-7; also   \nlisted by Sūta among the sons of Kadrū 1.   \n31. 5. B. Children: His son (not named)   \npicked up the __कुण्डलस्,__ given to Uttaṅka by   \nMadayantī, and entered the __नागलोक__ 14. 57.   \n39 (__ऐरावतसुत__), 22 (__ऐरावतकुलोत्पन्न__)   \n[According to 1. 3. 136 ff. the __कुण्डलस्__   \nwere taken away by Takṣaka]; Airāvata gave   \nhis widowed daughter (not named, Ulūpī ?;   \nbut cf. the next) to Arjuna in marriage 6. 86.   \n6-8. C. Descendants: Founder of a family   \n(__कुल__) 1. 52. 11; Kauravya, father of Ulūpī   \nborn in Airāvata's __कुल__ 1. 206. 18; Sumukha,   \nson of Cikura, was born in his __कुल__ 5. 101.   \n23; serpents living in the __नागलोक__ described   \nas born in the family of Airavata (__ऐरावतोद्-__   \n__भवाः__), who have Airāvata as their king   \n(__ऐरावतराजानः__), and whose eldest brother   \nis Airāvata (__ऐरावतज्येष्ठभ्रातृभ्यः …__   \n__नमः__) 1, 3. 140, 139. 143; his descendants   \n(__ऐरावताः__) sided with Arjuna when mythi-   \ncal beings, gathered in the sky, took sides   \nbetween Karṇa and Arjuna 8. 63. 37. D.   \nAn arrow from the __वंश__ of Airāvata: A   \nfierce, burning arrow having a serpent at its   \nsharp point (__सर्पमुख शर__), very poi-   \nsonous (__महाविष__) [on which Aśvasena,   \nson of Takṣaka, lay 8. 66. 23], and which   \nwas reserved by Karṇa to be shot at Arjuna   \ndescribed as belonging to the __वंश__ of   \nAirāvata (__ऐरावतवंशसंभव__) 8. 66. 5, [Page008-b+ 40]   \n6. E. Importance: He is one of the   \nguardians of Bhogavatī Purī 5. 107. 19; one   \nof the __नागस्__ who wait on Varuṇa in his __सभा__   \n2. 9. 8; Sumukha chosen as bride-groom for   \nGuṇakeśī, daughter of Mātali, out of regard   \nfor Airāvata 5. 102. 10; Vāsuki consulted   \nhim, together with others, who were all   \n__धर्मपरायण__ how to neutralize the curse   \nuttered by their mother on them 1. 33. 2; Ut-   \ntaṅka said no one would want to move in the   \narmy of the enemies unless Airāvata accom-   \npanied them 1. 3. 141. F. Events: (i)   \nHis dwelling (__निवेशन__) filled with smoke   \nwhen Uttaṅka blew into the anus of a   \nhorse 14. 57. 47; (ii) He and Citra were   \nagitated on hearing the roar of Skanda;   \nwhen Skanda saw Airāvata and Citra approa-   \nching he caught them in his hands 3. 214.   \n22, 23.",
          },
          {
            language: "ITRANS",
            value:
              "1Airāvata^1^  m.: A mythical king of   \nserpents (__nAgarAja__ 6. 86. 6) living in Bhoga-   \nvatī Purī 5. 101. 11, 1.   \nA. Birth: Son of Surasā and Kaśyapa   \n5. 101. 4, 17; description 5. 101. 5-7; also   \nlisted by Sūta among the sons of Kadrū 1.   \n31. 5. B. Children: His son (not named)   \npicked up the __kuNDalas,__ given to Uttaṅka by   \nMadayantī, and entered the __nAgaloka__ 14. 57.   \n39 (__airAvatasuta__), 22 (__airAvatakulotpanna__)   \n[According to 1. 3. 136 ff. the __kuNDalas__   \nwere taken away by Takṣaka]; Airāvata gave   \nhis widowed daughter (not named, Ulūpī ?;   \nbut cf. the next) to Arjuna in marriage 6. 86.   \n6-8. C. Descendants: Founder of a family   \n(__kula__) 1. 52. 11; Kauravya, father of Ulūpī   \nborn in Airāvata's __kula__ 1. 206. 18; Sumukha,   \nson of Cikura, was born in his __kula__ 5. 101.   \n23; serpents living in the __nAgaloka__ described   \nas born in the family of Airavata (__airAvatod-__   \n__bhavAH__), who have Airāvata as their king   \n(__airAvatarAjAnaH__), and whose eldest brother   \nis Airāvata (__airAvatajyeShThabhrAtRRibhyaH …__   \n__namaH__) 1, 3. 140, 139. 143; his descendants   \n(__airAvatAH__) sided with Arjuna when mythi-   \ncal beings, gathered in the sky, took sides   \nbetween Karṇa and Arjuna 8. 63. 37. D.   \nAn arrow from the __vaMsha__ of Airāvata: A   \nfierce, burning arrow having a serpent at its   \nsharp point (__sarpamukha shara__), very poi-   \nsonous (__mahAviSha__) [on which Aśvasena,   \nson of Takṣaka, lay 8. 66. 23], and which   \nwas reserved by Karṇa to be shot at Arjuna   \ndescribed as belonging to the __vaMsha__ of   \nAirāvata (__airAvatavaMshasaMbhava__) 8. 66. 5, [Page008-b+ 40]   \n6. E. Importance: He is one of the   \nguardians of Bhogavatī Purī 5. 107. 19; one   \nof the __nAgas__ who wait on Varuṇa in his __sabhA__   \n2. 9. 8; Sumukha chosen as bride-groom for   \nGuṇakeśī, daughter of Mātali, out of regard   \nfor Airāvata 5. 102. 10; Vāsuki consulted   \nhim, together with others, who were all   \n__dharmaparAyaNa__ how to neutralize the curse   \nuttered by their mother on them 1. 33. 2; Ut-   \ntaṅka said no one would want to move in the   \narmy of the enemies unless Airāvata accom-   \npanied them 1. 3. 141. F. Events: (i)   \nHis dwelling (__niveshana__) filled with smoke   \nwhen Uttaṅka blew into the anus of a   \nhorse 14. 57. 47; (ii) He and Citra were   \nagitated on hearing the roar of Skanda;   \nwhen Skanda saw Airāvata and Citra approa-   \nching he caught them in his hands 3. 214.   \n22, 23.",
          },
          {
            language: "IAST",
            value:
              "1Airāvata^1^  m.: A mythical king of   \nserpents (__nāgarāja__ 6. 86. 6) living in Bhoga-   \nvatī Purī 5. 101. 11, 1.   \nA. Birth: Son of Surasā and Kaśyapa   \n5. 101. 4, 17; description 5. 101. 5-7; also   \nlisted by Sūta among the sons of Kadrū 1.   \n31. 5. B. Children: His son (not named)   \npicked up the __kuṇḍalas,__ given to Uttaṅka by   \nMadayantī, and entered the __nāgaloka__ 14. 57.   \n39 (__airāvatasuta__), 22 (__airāvatakulotpanna__)   \n[According to 1. 3. 136 ff. the __kuṇḍalas__   \nwere taken away by Takṣaka]; Airāvata gave   \nhis widowed daughter (not named, Ulūpī ?;   \nbut cf. the next) to Arjuna in marriage 6. 86.   \n6-8. C. Descendants: Founder of a family   \n(__kula__) 1. 52. 11; Kauravya, father of Ulūpī   \nborn in Airāvata's __kula__ 1. 206. 18; Sumukha,   \nson of Cikura, was born in his __kula__ 5. 101.   \n23; serpents living in the __nāgaloka__ described   \nas born in the family of Airavata (__airāvatod-__   \n__bhavāḥ__), who have Airāvata as their king   \n(__airāvatarājānaḥ__), and whose eldest brother   \nis Airāvata (__airāvatajyeṣṭhabhrātṛbhyaḥ …__   \n__namaḥ__) 1, 3. 140, 139. 143; his descendants   \n(__airāvatāḥ__) sided with Arjuna when mythi-   \ncal beings, gathered in the sky, took sides   \nbetween Karṇa and Arjuna 8. 63. 37. D.   \nAn arrow from the __vaṃśa__ of Airāvata: A   \nfierce, burning arrow having a serpent at its   \nsharp point (__sarpamukha śara__), very poi-   \nsonous (__mahāviṣa__) [on which Aśvasena,   \nson of Takṣaka, lay 8. 66. 23], and which   \nwas reserved by Karṇa to be shot at Arjuna   \ndescribed as belonging to the __vaṃśa__ of   \nAirāvata (__airāvatavaṃśasaṃbhava__) 8. 66. 5, [Page008-b+ 40]   \n6. E. Importance: He is one of the   \nguardians of Bhogavatī Purī 5. 107. 19; one   \nof the __nāgas__ who wait on Varuṇa in his __sabhā__   \n2. 9. 8; Sumukha chosen as bride-groom for   \nGuṇakeśī, daughter of Mātali, out of regard   \nfor Airāvata 5. 102. 10; Vāsuki consulted   \nhim, together with others, who were all   \n__dharmaparāyaṇa__ how to neutralize the curse   \nuttered by their mother on them 1. 33. 2; Ut-   \ntaṅka said no one would want to move in the   \narmy of the enemies unless Airāvata accom-   \npanied them 1. 3. 141. F. Events: (i)   \nHis dwelling (__niveśana__) filled with smoke   \nwhen Uttaṅka blew into the anus of a   \nhorse 14. 57. 47; (ii) He and Citra were   \nagitated on hearing the roar of Skanda;   \nwhen Skanda saw Airāvata and Citra approa-   \nching he caught them in his hands 3. 214.   \n22, 23.",
          },
          {
            language: "SLP1",
            value:
              "1Airāvata^1^  m.: A mythical king of   \nserpents (__nAgarAja__ 6. 86. 6) living in Bhoga-   \nvatī Purī 5. 101. 11, 1.   \nA. Birth: Son of Surasā and Kaśyapa   \n5. 101. 4, 17; description 5. 101. 5-7; also   \nlisted by Sūta among the sons of Kadrū 1.   \n31. 5. B. Children: His son (not named)   \npicked up the __kuRqalas,__ given to Uttaṅka by   \nMadayantī, and entered the __nAgaloka__ 14. 57.   \n39 (__ErAvatasuta__), 22 (__ErAvatakulotpanna__)   \n[According to 1. 3. 136 ff. the __kuRqalas__   \nwere taken away by Takṣaka]; Airāvata gave   \nhis widowed daughter (not named, Ulūpī ?;   \nbut cf. the next) to Arjuna in marriage 6. 86.   \n6-8. C. Descendants: Founder of a family   \n(__kula__) 1. 52. 11; Kauravya, father of Ulūpī   \nborn in Airāvata's __kula__ 1. 206. 18; Sumukha,   \nson of Cikura, was born in his __kula__ 5. 101.   \n23; serpents living in the __nAgaloka__ described   \nas born in the family of Airavata (__ErAvatod-__   \n__BavAH__), who have Airāvata as their king   \n(__ErAvatarAjAnaH__), and whose eldest brother   \nis Airāvata (__ErAvatajyezWaBrAtfByaH …__   \n__namaH__) 1, 3. 140, 139. 143; his descendants   \n(__ErAvatAH__) sided with Arjuna when mythi-   \ncal beings, gathered in the sky, took sides   \nbetween Karṇa and Arjuna 8. 63. 37. D.   \nAn arrow from the __vaMSa__ of Airāvata: A   \nfierce, burning arrow having a serpent at its   \nsharp point (__sarpamuKa Sara__), very poi-   \nsonous (__mahAviza__) [on which Aśvasena,   \nson of Takṣaka, lay 8. 66. 23], and which   \nwas reserved by Karṇa to be shot at Arjuna   \ndescribed as belonging to the __vaMSa__ of   \nAirāvata (__ErAvatavaMSasaMBava__) 8. 66. 5, [Page008-b+ 40]   \n6. E. Importance: He is one of the   \nguardians of Bhogavatī Purī 5. 107. 19; one   \nof the __nAgas__ who wait on Varuṇa in his __saBA__   \n2. 9. 8; Sumukha chosen as bride-groom for   \nGuṇakeśī, daughter of Mātali, out of regard   \nfor Airāvata 5. 102. 10; Vāsuki consulted   \nhim, together with others, who were all   \n__DarmaparAyaRa__ how to neutralize the curse   \nuttered by their mother on them 1. 33. 2; Ut-   \ntaṅka said no one would want to move in the   \narmy of the enemies unless Airāvata accom-   \npanied them 1. 3. 141. F. Events: (i)   \nHis dwelling (__niveSana__) filled with smoke   \nwhen Uttaṅka blew into the anus of a   \nhorse 14. 57. 47; (ii) He and Citra were   \nagitated on hearing the roar of Skanda;   \nwhen Skanda saw Airāvata and Citra approa-   \nching he caught them in his hands 3. 214.   \n22, 23.",
          },
          {
            language: "TEL",
            value:
              "1Airāvata^1^  m.: A mythical king of   \nserpents (__నాగరాజ__ 6. 86. 6) living in Bhoga-   \nvatī Purī 5. 101. 11, 1.   \nA. Birth: Son of Surasā and Kaśyapa   \n5. 101. 4, 17; description 5. 101. 5-7; also   \nlisted by Sūta among the sons of Kadrū 1.   \n31. 5. B. Children: His son (not named)   \npicked up the __కుణ్డలస్,__ given to Uttaṅka by   \nMadayantī, and entered the __నాగలోక__ 14. 57.   \n39 (__ఐరావతసుత__), 22 (__ఐరావతకులోత్పన్న__)   \n[According to 1. 3. 136 ff. the __కుణ్డలస్__   \nwere taken away by Takṣaka]; Airāvata gave   \nhis widowed daughter (not named, Ulūpī ?;   \nbut cf. the next) to Arjuna in marriage 6. 86.   \n6-8. C. Descendants: Founder of a family   \n(__కుల__) 1. 52. 11; Kauravya, father of Ulūpī   \nborn in Airāvata's __కుల__ 1. 206. 18; Sumukha,   \nson of Cikura, was born in his __కుల__ 5. 101.   \n23; serpents living in the __నాగలోక__ described   \nas born in the family of Airavata (__ఐరావతోద్-__   \n__భవాః__), who have Airāvata as their king   \n(__ఐరావతరాజానః__), and whose eldest brother   \nis Airāvata (__ఐరావతజ్యేష్ఠభ్రాతృభ్యః …__   \n__నమః__) 1, 3. 140, 139. 143; his descendants   \n(__ఐరావతాః__) sided with Arjuna when mythi-   \ncal beings, gathered in the sky, took sides   \nbetween Karṇa and Arjuna 8. 63. 37. D.   \nAn arrow from the __వంశ__ of Airāvata: A   \nfierce, burning arrow having a serpent at its   \nsharp point (__సర్పముఖ శర__), very poi-   \nsonous (__మహావిష__) [on which Aśvasena,   \nson of Takṣaka, lay 8. 66. 23], and which   \nwas reserved by Karṇa to be shot at Arjuna   \ndescribed as belonging to the __వంశ__ of   \nAirāvata (__ఐరావతవంశసంభవ__) 8. 66. 5, [Page008-b+ 40]   \n6. E. Importance: He is one of the   \nguardians of Bhogavatī Purī 5. 107. 19; one   \nof the __నాగస్__ who wait on Varuṇa in his __సభా__   \n2. 9. 8; Sumukha chosen as bride-groom for   \nGuṇakeśī, daughter of Mātali, out of regard   \nfor Airāvata 5. 102. 10; Vāsuki consulted   \nhim, together with others, who were all   \n__ధర్మపరాయణ__ how to neutralize the curse   \nuttered by their mother on them 1. 33. 2; Ut-   \ntaṅka said no one would want to move in the   \narmy of the enemies unless Airāvata accom-   \npanied them 1. 3. 141. F. Events: (i)   \nHis dwelling (__నివేశన__) filled with smoke   \nwhen Uttaṅka blew into the anus of a   \nhorse 14. 57. 47; (ii) He and Citra were   \nagitated on hearing the roar of Skanda;   \nwhen Skanda saw Airāvata and Citra approa-   \nching he caught them in his hands 3. 214.   \n22, 23.",
          },
        ],
        phonetic:
          "airavata eravata mythical king serpents living bhoga birth son description listed among sons children not picked given entered according taken away gave widowed daughter arjuna marriage descendants founder family kauravya father born sumukha cikura described eldest brother sided mythi cal beings gathered sky took sides between arrow fierce burning having serpent sharp point poi sonous lay reserved shot belonging page008 importance guardians wait chosen bride groom regard consulted together others neutralize curse uttered mother want move army enemies accom panied events dwelling filled smoke blew into anus horse citra agitated hearing roar skanda saw approa ching caught hands 1airāvata nagaraja vatī purī surasā kaśyapa sūta kadrū kundalas uttaṅka madayantī nagaloka airavatasuta airavatakulotpanna takṣaka airāvata ulūpī kula airavatod bhavah airavatarajanah airavatajyeshthabhratrribhyah namah airavatah karṇa vamsha sarpamukha shara mahavisha aśvasena airavatavamshasambhava bhogavatī nagas varuṇa sabha guṇakeśī mātali vāsuki dharmaparayana taṅka niveshana kurqalas eravatasuta eravatakulotpanna eravatod bavah eravatarajanah eravatajyezwabratfbyah eravatah vamsa sarpamuka sara mahaviza eravatavamsasambava saba darmaparayara nivesana zurasā k0aśyapa zūta k0adrū wakṣaka k0arṇa aśvasèna bhògavatī g0uṇakèśī 1airavata vati puri surasa kashyapa suta kadru utta nka madayanti takshaka ulupi karna ashvasena bhogavati varuna gunakeshi matali vasuki 1eravata kasyapa uttanka takzaka karra asvasena bogavati varura gurakesi tanka phurī shurasā khaśyapa shūta khadrū thakṣaka kharṇa bhhogavatī ghuṇakeśī",
        wordLnum: 49,
      },
    },
  ],
  md: [
    {
      scenario: "Basic - San to Eng",
      sourceData: {
        data: {
          key: "aMSu",
          lnum: 12,
          data: "<H1><h><key1>aMSu</key1><key2>aMSu</key2></h><body><s>aMSu</s> aṃśú, <i>m.</i> Soma plant, — juice; ray; stalk.</body><tail><L>12</L><pc>001-1</pc></tail></H1>",
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 12,
        origin: "MD",
        word: [
          {
            language: "SAN",
            value: "अंशु",
          },
          {
            language: "ITRANS",
            value: "aMshu",
          },
          {
            language: "IAST",
            value: "aṃśu",
          },
          {
            language: "SLP1",
            value: "aMSu",
          },
          {
            language: "TEL",
            value: "అంశు",
          },
        ],
        description: [
          {
            language: "ENG",
            value: "__अंशु__ aṃśú, *m.* Soma plant, — juice; ray; stalk.",
          },
        ],
        phonetic: "amshu amsu अंशु aṃśú soma plant juice ray stalk",
        wordLnum: 12,
      },
    },
  ],
  mw: [
    {
      scenario: "Basic 1 - San to San",
      sourceData: {
        data: {
          key: "a",
          lnum: 3,
          data: '<H1><h><key1>a</key1><key2>a</key2><hom>2</hom></h><body><hom>2.</hom> <s>a</s>   (<s>pragfhya</s> <ab>q.v.</ab>), a vocative particle ([<s>a ananta</s>, O <s1 slp1="vizRu">Viṣṇu</s1>]), <ls>T.</ls></body><tail><L>3</L><pc>1,1</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        origin: "MW",
        word: [
          {
            language: "SAN",
            value: "अ",
          },
          {
            language: "ITRANS",
            value: "a",
          },
          {
            language: "IAST",
            value: "a",
          },
          {
            language: "SLP1",
            value: "a",
          },
          {
            language: "TEL",
            value: "అ",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "22. __अ__   (__प्रगृह्य__  `q.v.` ), a vocative particle ([__अ अनन्त__, O  __विष्णु__ ]), T.",
          },
          {
            language: "ITRANS",
            value:
              "22. __a__   (__pragRRihya__  `q.v.` ), a vocative particle ([__a ananta__, O  __viShNu__ ]), T.",
          },
          {
            language: "IAST",
            value:
              "22. __a__   (__pragṛhya__  `q.v.` ), a vocative particle ([__a ananta__, O  __viṣṇu__ ]), T.",
          },
          {
            language: "SLP1",
            value:
              "22. __a__   (__pragfhya__  `q.v.` ), a vocative particle ([__a ananta__, O  __vizRu__ ]), T.",
          },
          {
            language: "TEL",
            value:
              "22. __అ__   (__ప్రగృహ్య__  `q.v.` ), a vocative particle ([__అ అనన్త__, O  __విష్ణు__ ]), T.",
          },
        ],
        phonetic: "vocative particle pragrrihya ananta vishnu pragfhya vizru",
        wordLnum: 3,
      },
    },
    {
      scenario: "Basic 2 - San to San",
      sourceData: {
        data: {
          key: "aMSumat",
          lnum: 67,
          data: '<H3A><h><key1>aMSumat</key1><key2>aMSu—ma/t</key2></h><body>  radiant, luminous<info lex="inh"/></body><tail><L>67</L><pc>1,2</pc></tail></H3A>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        origin: "MW",
        word: [
          {
            language: "SAN",
            value: "अंशुमत्",
          },
          {
            language: "ITRANS",
            value: "aMshumat",
          },
          {
            language: "IAST",
            value: "aṃśumat",
          },
          {
            language: "SLP1",
            value: "aMSumat",
          },
          {
            language: "TEL",
            value: "అంశుమత్",
          },
        ],
        description: [
          {
            language: "SAN",
            value: "**aMSu—ma/t**  \n  radiant, luminous (info: 671,2 )",
          },
          {
            language: "ITRANS",
            value: "**aMSu—ma/t**  \n  radiant, luminous (info: 671,2 )",
          },
          {
            language: "IAST",
            value: "**aMSu—ma/t**  \n  radiant, luminous (info: 671,2 )",
          },
          {
            language: "SLP1",
            value: "**aMSu—ma/t**  \n  radiant, luminous (info: 671,2 )",
          },
          {
            language: "TEL",
            value: "**aMSu—ma/t**  \n  radiant, luminous (info: 671,2 )",
          },
        ],
        phonetic: "amshumat amsumat amsu—ma radiant luminous info",
        wordLnum: 67,
      },
    },
  ],
  mwe: [
    {
      scenario: "Basic - Eng to San",
      sourceData: {
        data: {
          key: "abdication",
          lnum: 20,
          data: "<H1><h><key1>abdication</key1><key2>abdication</key2></h><body>ABDICATION , <i>s.</i> <s>rAjyatyAgaH, aDikAratyAgaH, padatyAgaH</s>.</body><tail><L>20</L><pc>001-b</pc></tail></H1>",
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "ENG",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 20,
        origin: "MWE",
        word: [
          {
            language: "ENG",
            value: "abdication",
          },
        ],
        description: [
          {
            language: "SAN",
            value: "ABDICATION , *s.* __राज्यत्यागः, अधिकारत्यागः, पदत्यागः__.",
          },
          {
            language: "ITRANS",
            value:
              "ABDICATION , *s.* __rAjyatyAgaH, adhikAratyAgaH, padatyAgaH__.",
          },
          {
            language: "IAST",
            value:
              "ABDICATION , *s.* __rājyatyāgaḥ, adhikāratyāgaḥ, padatyāgaḥ__.",
          },
          {
            language: "SLP1",
            value:
              "ABDICATION , *s.* __rAjyatyAgaH, aDikAratyAgaH, padatyAgaH__.",
          },
          {
            language: "TEL",
            value: "ABDICATION , *s.* __రాజ్యత్యాగః, అధికారత్యాగః, పదత్యాగః__.",
          },
        ],
        phonetic:
          "abdication rajyatyagah adhikaratyagah padatyagah adikaratyagah",
        wordLnum: 20,
      },
    },
  ],
  mw72: [
    {
      scenario: "Basic - San to Eng",
      sourceData: {
        data: {
          key: "aMsala",
          lnum: 23,
          data: "<H1><h><key1>aMsala</key1><key2>aMsala</key2></h><body><i>Aṃsala, as, ā, am,</i>  lusty, strong.</body><tail><L>23</L><pc>0001-b</pc></tail></H1>",
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },

      expectedData: {
        wordIndex: 23,
        origin: "MW72",
        word: [
          {
            language: "SAN",
            value: "अंसल",
          },
          {
            language: "ITRANS",
            value: "aMsala",
          },
          {
            language: "IAST",
            value: "aṃsala",
          },
          {
            language: "SLP1",
            value: "aMsala",
          },
          {
            language: "TEL",
            value: "అంసల",
          },
        ],
        description: [
          {
            language: "SAN",
            value: "__अंसल, अस्, आ, अम्,__  lusty, strong.",
          },
          {
            language: "ITRANS",
            value: "__aMsala, as, A, am,__  lusty, strong.",
          },
          {
            language: "IAST",
            value: "__aṃsala, as, ā, am,__  lusty, strong.",
          },
          {
            language: "SLP1",
            value: "__aMsala, as, A, am,__  lusty, strong.",
          },
          {
            language: "TEL",
            value: "__అంసల, అస్, ఆ, అమ్,__  lusty, strong.",
          },
        ],
        phonetic: "amsala lusty strong",
        wordLnum: 23,
      },
    },
  ],
  pe: [
    {
      scenario: "Basic - Description only in English",
      sourceData: {
        data: {
          key: "abala",
          lnum: 2,
          data: '<H1><h><key1>abala</key1><key2>abala</key2></h><body>ABALA  is one of the fifteen devas who were the sons of <div n="lb"/>Pāñcajanya. (M.B. Vana Parva, Chapter 22, Verse 11).</body><tail><L>2</L><pc>001-a</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "ENG",
      },
      expectedData: {
        wordIndex: 2,
        origin: "PE",
        word: [
          {
            language: "SAN",
            value: "अबल",
          },
          {
            language: "ITRANS",
            value: "abala",
          },
          {
            language: "IAST",
            value: "abala",
          },
          {
            language: "SLP1",
            value: "abala",
          },
          {
            language: "TEL",
            value: "అబల",
          },
        ],
        description: [
          {
            language: "ENG",
            value:
              "ABALA  is one of the fifteen devas who were the sons of   \nPāñcajanya. (M.B. Vana Parva, Chapter 22, Verse 11).",
          },
        ],
        phonetic:
          "abala fifteen devas sons pāñcajanya vana parva chapter verse",

        wordLnum: 2,
      },
    },
  ],
  pui: [
    {
      scenario: "Basic - San to San",
      sourceData: {
        data: {
          key: "akza",
          lnum: 27,
          data: '<H1><h><key1>akza</key1><key2>akza</key2><hom>III</hom></h><body><i>Akṣa</i> (III)  — a son of Satyabhāmā and Kṛṣṇa. <div n="P"/>Br. III. 71. 247; Vā. 96. 238.</body><tail><L>27</L><pc>1-005</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 27,
        origin: "PUI",
        word: [
          {
            language: "SAN",
            value: "अक्ष",
          },
          {
            language: "ITRANS",
            value: "akSha",
          },
          {
            language: "IAST",
            value: "akṣa",
          },
          {
            language: "SLP1",
            value: "akza",
          },
          {
            language: "TEL",
            value: "అక్ష",
          },
        ],
        description: [
          {
            language: "ENG",
            value:
              "III__अक्ष__ (III)  — a son of Satyabhāmā and Kṛṣṇa. Br. III. 71. 247; Vā. 96. 238.",
          },
        ],
        phonetic: "aksha akza iii अक्ष son satyabhāmā kṛṣṇa",
        wordLnum: 27,
      },
    },
  ],
  shs: [
    {
      scenario: "Basic - San to San",
      sourceData: {
        data: {
          key: "akanizWa",
          lnum: 50,
          data: '<H1><h><key1>akanizWa</key1><key2>akanizWa</key2></h><body><s>akanizWa</s>  <div n="1">m. (<s>-zWaH</s>) A deified saint according to the Bauddhas. </div><div n="1">mfn. <lb/>(<s>-zWaH-zWA-zWaM</s>) Elder, superior.</div><div n="E"> E. <s>a</s> priv. and <s>kanizWa</s> youngest.</div></body><tail><L>50</L><pc>002-a</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },

      expectedData: {
        wordIndex: 51,
        origin: "SHS",
        word: [
          {
            language: "SAN",
            value: "अकनिष्ठ",
          },
          {
            language: "ITRANS",
            value: "akaniShTha",
          },
          {
            language: "IAST",
            value: "akaniṣṭha",
          },
          {
            language: "SLP1",
            value: "akanizWa",
          },
          {
            language: "TEL",
            value: "అకనిష్ఠ",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "__अकनिष्ठ__  m. (__-ष्ठः__) A deified saint according to the Bauddhas. mfn.   \n(__-ष्ठः-ष्ठा-ष्ठं__) Elder, superior.  \n E. __अ__ priv. and __कनिष्ठ__ youngest.",
          },
          {
            language: "ITRANS",
            value:
              "__akaniShTha__  m. (__-ShThaH__) A deified saint according to the Bauddhas. mfn.   \n(__-ShThaH-ShThA-ShThaM__) Elder, superior.  \n E. __a__ priv. and __kaniShTha__ youngest.",
          },
          {
            language: "IAST",
            value:
              "__akaniṣṭha__  m. (__-ṣṭhaḥ__) A deified saint according to the Bauddhas. mfn.   \n(__-ṣṭhaḥ-ṣṭhā-ṣṭhaṃ__) Elder, superior.  \n E. __a__ priv. and __kaniṣṭha__ youngest.",
          },
          {
            language: "SLP1",
            value:
              "__akanizWa__  m. (__-zWaH__) A deified saint according to the Bauddhas. mfn.   \n(__-zWaH-zWA-zWaM__) Elder, superior.  \n E. __a__ priv. and __kanizWa__ youngest.",
          },
          {
            language: "TEL",
            value:
              "__అకనిష్ఠ__  m. (__-ష్ఠః__) A deified saint according to the Bauddhas. mfn.   \n(__-ష్ఠః-ష్ఠా-ష్ఠం__) Elder, superior.  \n E. __అ__ priv. and __కనిష్ఠ__ youngest.",
          },
        ],
        phonetic:
          "akanishtha akanizwa deified saint according bauddhas mfn elder superior priv youngest shthah shtha shtham kanishtha zwah zwa zwam kanizwa",
        wordLnum: 50,
      },
    },
  ],
  skd: [
    {
      scenario: "Basic - San to San",
      sourceData: {
        data: {
          key: "akaM",
          lnum: 35,
          data: "<H1><h><key1>akaM</key1><key2>akaM</key2></h><body><s>akaM , klI, (na kaM suKaM . tadvirudDaM vA . naYsamAsaH .</s> <lb/><s>naYaH na lopaH .) pApaM . duHKaM . iti medinI ..</s></body><tail><L>35</L><pc>1-002-b</pc></tail></H1>",
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },

      expectedData: {
        wordIndex: 35,
        origin: "SKD",
        word: [
          {
            language: "SAN",
            value: "अकं",
          },
          {
            language: "ITRANS",
            value: "akaM",
          },
          {
            language: "IAST",
            value: "akaṃ",
          },
          {
            language: "SLP1",
            value: "akaM",
          },
          {
            language: "TEL",
            value: "అకం",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "__अकं , क्ली, (न कं सुखं । तद्विरुद्धं वा । नञ्समासः ।__   \n__नञः न लोपः ।) पापं । दुःखं । इति मेदिनी ॥__",
          },
          {
            language: "ITRANS",
            value:
              "__akaM , klI, (na kaM sukhaM | tadviruddhaM vA | na~nsamAsaH |__   \n__na~naH na lopaH |) pApaM | duHkhaM | iti medinI ||__",
          },
          {
            language: "IAST",
            value:
              "__akaṃ , klī, (na kaṃ sukhaṃ | tadviruddhaṃ vā | nañsamāsaḥ |__   \n__nañaḥ na lopaḥ |) pāpaṃ | duḥkhaṃ | iti medinī ||__",
          },
          {
            language: "SLP1",
            value:
              "__akaM , klI, (na kaM suKaM . tadvirudDaM vA . naYsamAsaH .__   \n__naYaH na lopaH .) pApaM . duHKaM . iti medinI ..__",
          },
          {
            language: "TEL",
            value:
              "__అకం , క్లీ, (న కం సుఖం । తద్విరుద్ధం వా । నఞ్సమాసః ।__   \n__నఞః న లోపః ।) పాపం । దుఃఖం । ఇతి మేదినీ ॥__",
          },
        ],
        phonetic:
          "akam kli kam sukham tadviruddham nsamasah nah lopah papam duhkham medini sukam tadviruddam naysamasah nayah duhkam",
        wordLnum: 35,
      },
    },
  ],
  snp: [
    {
      scenario: "Basic - San to San",
      sourceData: {
        data: {
          key: "kawukI",
          lnum: 40,
          data: '<H1><h><key1>kawukI</key1><key2>kawukI</key2></h><body><i>kaṭukī</i>  <div n="P"/>(1) <bot>PICRORRHIZA KURROA ROYLE EX BENTH.</bot> (Avk; Dutt; DWH 3, <div n="lb"/><bot>P.</bot> 10-13; Dy, p. 510-511; HK; V 2, p. 147); <div n="P"/>(2) = <i>kaṭukā</i> (Vśs); <div n="P"/>(3) = <i>kaṭurohiṇī</i> (Avk; PW); <div n="P"/>(4) <bot>GENTIANA KURROO ROYLE</bot> (see DWH 2, p. 510; Nadk. 1, nr. 1112); <div n="P"/>(5) <bot>LUFFA ACUTANGULA ROXB.</bot> = <bot>L. AMARA ROXB.</bot> (Nadk. 1, nr. <div n="lb"/>1516) = <bot>L. FOETIDA CAV.</bot> (Nadk. 1, nr. 1516) = <bot>L. PLUKENETIANA <div n="lb"/>SER.</bot> (Nadk. 1, nr. 1516).</body><tail><L>40</L><pc>534</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 40,
        origin: "SNP",
        word: [
          {
            language: "SAN",
            value: "कटुकी",
          },
          {
            language: "ITRANS",
            value: "kaTukI",
          },
          {
            language: "IAST",
            value: "kaṭukī",
          },
          {
            language: "SLP1",
            value: "kawukI",
          },
          {
            language: "TEL",
            value: "కటుకీ",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "__कटुकी__  (1) PICRORRHIZA KURROA ROYLE EX BENTH. (Avk; Dutt; DWH 3,   \nP. 10-13; Dy, p. 510-511; HK; V 2, p. 147); (2) = __कटुका__ (Vśs); (3) = __कटुरोहिणी__ (Avk; PW); (4) GENTIANA KURROO ROYLE (see DWH 2, p. 510; Nadk. 1, nr. 1112); (5) LUFFA ACUTANGULA ROXB. = L. AMARA ROXB. (Nadk. 1, nr.   \n1516) = L. FOETIDA CAV. (Nadk. 1, nr. 1516) = L. PLUKENETIANA   \nSER. (Nadk. 1, nr. 1516).",
          },
          {
            language: "ITRANS",
            value:
              "__kaTukI__  (1) PICRORRHIZA KURROA ROYLE EX BENTH. (Avk; Dutt; DWH 3,   \nP. 10-13; Dy, p. 510-511; HK; V 2, p. 147); (2) = __kaTukA__ (Vśs); (3) = __kaTurohiNI__ (Avk; PW); (4) GENTIANA KURROO ROYLE (see DWH 2, p. 510; Nadk. 1, nr. 1112); (5) LUFFA ACUTANGULA ROXB. = L. AMARA ROXB. (Nadk. 1, nr.   \n1516) = L. FOETIDA CAV. (Nadk. 1, nr. 1516) = L. PLUKENETIANA   \nSER. (Nadk. 1, nr. 1516).",
          },
          {
            language: "IAST",
            value:
              "__kaṭukī__  (1) PICRORRHIZA KURROA ROYLE EX BENTH. (Avk; Dutt; DWH 3,   \nP. 10-13; Dy, p. 510-511; HK; V 2, p. 147); (2) = __kaṭukā__ (Vśs); (3) = __kaṭurohiṇī__ (Avk; PW); (4) GENTIANA KURROO ROYLE (see DWH 2, p. 510; Nadk. 1, nr. 1112); (5) LUFFA ACUTANGULA ROXB. = L. AMARA ROXB. (Nadk. 1, nr.   \n1516) = L. FOETIDA CAV. (Nadk. 1, nr. 1516) = L. PLUKENETIANA   \nSER. (Nadk. 1, nr. 1516).",
          },
          {
            language: "SLP1",
            value:
              "__kawukI__  (1) PICRORRHIZA KURROA ROYLE EX BENTH. (Avk; Dutt; DWH 3,   \nP. 10-13; Dy, p. 510-511; HK; V 2, p. 147); (2) = __kawukA__ (Vśs); (3) = __kawurohiRI__ (Avk; PW); (4) GENTIANA KURROO ROYLE (see DWH 2, p. 510; Nadk. 1, nr. 1112); (5) LUFFA ACUTANGULA ROXB. = L. AMARA ROXB. (Nadk. 1, nr.   \n1516) = L. FOETIDA CAV. (Nadk. 1, nr. 1516) = L. PLUKENETIANA   \nSER. (Nadk. 1, nr. 1516).",
          },
          {
            language: "TEL",
            value:
              "__కటుకీ__  (1) PICRORRHIZA KURROA ROYLE EX BENTH. (Avk; Dutt; DWH 3,   \nP. 10-13; Dy, p. 510-511; HK; V 2, p. 147); (2) = __కటుకా__ (Vśs); (3) = __కటురోహిణీ__ (Avk; PW); (4) GENTIANA KURROO ROYLE (see DWH 2, p. 510; Nadk. 1, nr. 1112); (5) LUFFA ACUTANGULA ROXB. = L. AMARA ROXB. (Nadk. 1, nr.   \n1516) = L. FOETIDA CAV. (Nadk. 1, nr. 1516) = L. PLUKENETIANA   \nSER. (Nadk. 1, nr. 1516).",
          },
        ],
        phonetic:
          "katuki kawuki picrorrhiza kurroa royle benth avk dutt dwh gentiana kurroo nadk luffa acutangula roxb amara foetida cav plukenetiana ser katuka vśs katurohini kawuka kawurohiri vshs vss",
        wordLnum: 40,
      },
    },
  ],
  vcp: [
    {
      scenario: "Basic - San to San",
      sourceData: {
        data: {
          key: "akaraRi",
          lnum: 50,
          data: "<H1><h><key1>akaraRi</key1><key2>akaraRi</key2></h><body><s>akaraRi  strI0 naY + kf</s>—<s>AkroSe ani . karaRaM mA</s> <lb/><s>BUdityAkroSAtmake SApe . </s>“<s>tasyAkaraRirevAstu</s>”<s> iti .</s></body><tail><L>50</L><pc>0038,b</pc></tail></H1>",
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        origin: "VCP",
        word: [
          {
            language: "SAN",
            value: "अकरणि",
          },
          {
            language: "ITRANS",
            value: "akaraNi",
          },
          {
            language: "IAST",
            value: "akaraṇi",
          },
          {
            language: "SLP1",
            value: "akaraRi",
          },
          {
            language: "TEL",
            value: "అకరణి",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "__अकरणि  स्त्री० नञ् + कृ__—__आक्रोशे अनि । करणं मा__   \n__भूदित्याक्रोशात्मके शापे ।__“__तस्याकरणिरेवास्तु__”__इति ।__",
          },
          {
            language: "ITRANS",
            value:
              "__akaraNi  strI0 na~n + kRRi__—__Akroshe ani | karaNaM mA__   \n__bhUdityAkroshAtmake shApe |__“__tasyAkaraNirevAstu__”__iti |__",
          },
          {
            language: "IAST",
            value:
              "__akaraṇi  strī0 nañ + kṛ__—__ākrośe ani | karaṇaṃ mā__   \n__bhūdityākrośātmake śāpe |__“__tasyākaraṇirevāstu__”__iti |__",
          },
          {
            language: "SLP1",
            value:
              "__akaraRi  strI0 naY + kf__—__AkroSe ani . karaRaM mA__   \n__BUdityAkroSAtmake SApe .__“__tasyAkaraRirevAstu__”__iti .__",
          },
          {
            language: "TEL",
            value:
              "__అకరణి  స్త్రీ౦ నఞ్ + కృ__—__ఆక్రోశే అని । కరణం మా__   \n__భూదిత్యాక్రోశాత్మకే శాపే ।__“__తస్యాకరణిరేవాస్తు__”__ఇతి ।__",
          },
        ],
        phonetic:
          "akarani akarari stri0 krri akroshe ani karanam bhudityakroshatmake shape tasyakaranirevastu nay akrose kararam budityakrosatmake sape tasyakararirevastu",
        wordLnum: 50,
      },
    },
  ],
  vei: [
    {
      // TODO: could description be only Eng?
      scenario: "Basic - San to San",
      sourceData: {
        data: {
          key: "aTarI",
          lnum: 49,
          data: '<H1><h><key1>aTarI</key1><key2>aTarI</key2></h><body><b>Atharī.</b>  — This word occurs only in the Rigveda,<sup>1</sup> and the <div n="lb"/>sense is doubtful. Roth,<sup>2</sup> followed by most interpreters, <div n="lb"/>renders it ‘point of a lance,’ but Pischel<sup>3</sup> thinks that it means <div n="lb"/>‘an elephant.’ <F>1) iv. 6, 8.</F> <F>2) St. Petersburg Dictionary, <i>s.v.</i></F> <F>3) <i>Vedische Studien,</i> 1, 99.</F></body><tail><L>49</L><pc>1-017</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 49,
        origin: "VEI",
        word: [
          {
            language: "SAN",
            value: "अथरी",
          },
          {
            language: "ITRANS",
            value: "atharI",
          },
          {
            language: "IAST",
            value: "atharī",
          },
          {
            language: "SLP1",
            value: "aTarI",
          },
          {
            language: "TEL",
            value: "అథరీ",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "Atharī.  — This word occurs only in the Rigveda,^1^ and the   \nsense is doubtful. Roth,^2^ followed by most interpreters,   \nrenders it ‘point of a lance,’ but Pischel^3^ thinks that it means   \n‘an elephant.’ 1) iv. 6, 8. 2) St. Petersburg Dictionary, *s.v.* 3) *Vedische Studien,* 1, 99.",
          },
          {
            language: "ITRANS",
            value:
              "Atharī.  — This word occurs only in the Rigveda,^1^ and the   \nsense is doubtful. Roth,^2^ followed by most interpreters,   \nrenders it ‘point of a lance,’ but Pischel^3^ thinks that it means   \n‘an elephant.’ 1) iv. 6, 8. 2) St. Petersburg Dictionary, *s.v.* 3) *Vedische Studien,* 1, 99.",
          },
          {
            language: "IAST",
            value:
              "Atharī.  — This word occurs only in the Rigveda,^1^ and the   \nsense is doubtful. Roth,^2^ followed by most interpreters,   \nrenders it ‘point of a lance,’ but Pischel^3^ thinks that it means   \n‘an elephant.’ 1) iv. 6, 8. 2) St. Petersburg Dictionary, *s.v.* 3) *Vedische Studien,* 1, 99.",
          },
          {
            language: "SLP1",
            value:
              "Atharī.  — This word occurs only in the Rigveda,^1^ and the   \nsense is doubtful. Roth,^2^ followed by most interpreters,   \nrenders it ‘point of a lance,’ but Pischel^3^ thinks that it means   \n‘an elephant.’ 1) iv. 6, 8. 2) St. Petersburg Dictionary, *s.v.* 3) *Vedische Studien,* 1, 99.",
          },
          {
            language: "TEL",
            value:
              "Atharī.  — This word occurs only in the Rigveda,^1^ and the   \nsense is doubtful. Roth,^2^ followed by most interpreters,   \nrenders it ‘point of a lance,’ but Pischel^3^ thinks that it means   \n‘an elephant.’ 1) iv. 6, 8. 2) St. Petersburg Dictionary, *s.v.* 3) *Vedische Studien,* 1, 99.",
          },
        ],
        phonetic:
          "athari atari occurs rigveda sense doubtful roth followed interpreters renders point lance thinks means elephant petersburg dictionary vedische studien atarī piscèl pischel piscel atharī phischhel",
        wordLnum: 49,
      },
    },
  ],
  wil: [
    {
      // TODO : could description be only Eng?
      scenario: "Basic - Eng to San",
      sourceData: {
        data: {
          key: "aMSAMSa",
          lnum: 18,
          data: '<H1><h><key1>aMSAMSa</key1><key2>aMSAMSa</key2></h><body> <s>aMSAMSa</s>  m. (<s>-SaH</s>) Part of a portion or share. <div n="E">E. <s>aMSa</s> repeated.  </div></body><tail><L>18</L><pc>001</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },

      expectedData: {
        wordIndex: 18,
        origin: "WIL",
        word: [
          {
            language: "SAN",
            value: "अंशांश",
          },
          {
            language: "ITRANS",
            value: "aMshAMsha",
          },
          {
            language: "IAST",
            value: "aṃśāṃśa",
          },
          {
            language: "SLP1",
            value: "aMSAMSa",
          },
          {
            language: "TEL",
            value: "అంశాంశ",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              "__अंशांश__  m. (__-शः__) Part of a portion or share. E. __अंश__ repeated.",
          },
          {
            language: "ITRANS",
            value:
              "__aMshAMsha__  m. (__-shaH__) Part of a portion or share. E. __aMsha__ repeated.",
          },
          {
            language: "IAST",
            value:
              "__aṃśāṃśa__  m. (__-śaḥ__) Part of a portion or share. E. __aṃśa__ repeated.",
          },
          {
            language: "SLP1",
            value:
              "__aMSAMSa__  m. (__-SaH__) Part of a portion or share. E. __aMSa__ repeated.",
          },
          {
            language: "TEL",
            value:
              "__అంశాంశ__  m. (__-శః__) Part of a portion or share. E. __అంశ__ repeated.",
          },
        ],
        phonetic:
          "amshamsha amsamsa part portion share repeated shah amsha sah amsa",
        wordLnum: 18,
      },
    },
  ],
  yat: [
    {
      scenario: "Basic - San(SLP1) to Eng(SLP1)",
      sourceData: {
        data: {
          key: "aMsala",
          lnum: 32,
          data: "<H1><h><key1>aMsala</key1><key2>aMsala</key2></h><body><s>aMsala</s>  <s>(laH-lA-laM)</s> <i>a.</i> Strong, stout.</body><tail><L>32</L><pc>001-b</pc></tail></H1>",
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "SLP1",
      },
      expectedData: {
        wordIndex: 32,
        origin: "YAT",
        word: [
          {
            language: "SAN",
            value: "अंसल",
          },
          {
            language: "ITRANS",
            value: "aMsala",
          },
          {
            language: "IAST",
            value: "aṃsala",
          },
          {
            language: "SLP1",
            value: "aMsala",
          },
          {
            language: "TEL",
            value: "అంసల",
          },
        ],
        description: [
          {
            language: "SAN",
            value: "__अंसल__  __(लः-ला-लं)__ *a.* Strong, stout.",
          },
          {
            language: "ITRANS",
            value: "__aMsala__  __(laH-lA-laM)__ *a.* Strong, stout.",
          },
          {
            language: "IAST",
            value: "__aṃsala__  __(laḥ-lā-laṃ)__ *a.* Strong, stout.",
          },
          {
            language: "SLP1",
            value: "__aMsala__  __(laH-lA-laM)__ *a.* Strong, stout.",
          },
          {
            language: "TEL",
            value: "__అంసల__  __(లః-లా-లం)__ *a.* Strong, stout.",
          },
        ],
        attributes: [],
        phonetic: "amsala strong stout lah lam",
        wordLnum: 32,
      },
    },
  ],
  pgn: [
    {
      scenario: "Basic - San to Eng",
      sourceData: {
        data: {
          key: "pUrugupta",
          lnum: 9,
          data: '<H1><h><key1>pUrugupta</key1><key2>pUrugupta</key2></h><body>9. <i>Pūrugupta</i>  (No. 47, L. 6; No. 53, L. 6; No. 49, L. 6; <div n="lb"/>No. 50, L. 6; No. 38, L. 1): <div n="lb"/>We know from No. 53 that <i>Mahārājādhirāja</i> Śrī Pūrugupta <div n="lb"/>was the son of <i>Mahārājādhirāja</i> Śrī Kumāragupta by his chief <div n="lb"/>queen Anantadevī. In No. 38, L. 1 the name of the father [Page-025+ 39] <div n="lb"/>and predecessor of Narasiṃhagupta is spelt as Pūrugupta.<sup>89</sup> <div n="lb"/>The reading Pūrugupta is unmistakeable on the fragmentary <div n="lb"/>Nālandā Seal of Narasiṃhagupta and is also fairly clear <div n="lb"/>on the seals of Kumāragupta II. The medial <i>ū</i> sign in <div n="lb"/>the first letter of the name Pūrugupta is indicated by an <div n="lb"/>additional stroke attached to the base of the letter and the <div n="lb"/>downward elongation of its right limb; mere elongation of the <div n="lb"/>right limb by itself would have denoted the short medial <i>u</i> as <div n="lb"/>in <i>puttras</i> in LL. 2 and 3. In the second letter of the name, <div n="lb"/>viz. <i>ru.</i> the medial <i>u</i> is shown by a small hook turned to left <div n="lb"/>and joined to the foot of <i>r.</i> Palaeographical considerations <div n="lb"/>apart, the name Pur<i>u</i>gupta yields a more plausible-sense than <div n="lb"/>Pur<i>a</i>gupta and fits better in the series of the grand and digni- <div n="lb"/>fied names of the Gupta kings. The first part of the Gupta <div n="lb"/>names constituted the real or substantive name and yielded <div n="lb"/>satisfactory meaning independently of the latter half, viz. <div n="lb"/><i>gupta,</i> which being family surname was a mere adjunct. <i>Pura,</i> <div n="lb"/>by itself is neither a complete nor a dignified name while <i>Puru</i> <div n="lb"/>is both. <i>Pūru</i> or its variant <i>Puru</i> may, like <i>Vainya</i> in Vainya- <div n="lb"/>gupta signify the homonymous epic hero of the lunar race <div n="lb"/>who was the ancestor of the Kauravas and the Pāṇḍavas, or <div n="lb"/>may mean abundant or great.<sup>90</sup></body><tail><L>9</L><pc>024</pc></tail></H1>',
        },
        wordField: "key",
        descriptionField: "data",
        wordLang: "SLP1",
        descriptionLang: "ENG",
      },

      expectedData: {
        wordIndex: 9,
        origin: "PGN",
        word: [
          {
            language: "SAN",
            value: "पूरुगुप्त",
          },
          {
            language: "ITRANS",
            value: "pUrugupta",
          },
          {
            language: "IAST",
            value: "pūrugupta",
          },
          {
            language: "SLP1",
            value: "pUrugupta",
          },
          {
            language: "TEL",
            value: "పూరుగుప్త",
          },
        ],
        description: [
          {
            language: "ENG",
            value:
              "9. __पूरुगुप्त__  (No. 47, L. 6; No. 53, L. 6; No. 49, L. 6;   \nNo. 50, L. 6; No. 38, L. 1):   \nWe know from No. 53 that __महाराजाधिराज__ Śrī Pūrugupta   \nwas the son of __महाराजाधिराज__ Śrī Kumāragupta by his chief   \nqueen Anantadevī. In No. 38, L. 1 the name of the father [Page-025+ 39]   \nand predecessor of Narasiṃhagupta is spelt as Pūrugupta.^89^   \nThe reading Pūrugupta is unmistakeable on the fragmentary   \nNālandā Seal of Narasiṃhagupta and is also fairly clear   \non the seals of Kumāragupta II. The medial __ऊ__ sign in   \nthe first letter of the name Pūrugupta is indicated by an   \nadditional stroke attached to the base of the letter and the   \ndownward elongation of its right limb; mere elongation of the   \nright limb by itself would have denoted the short medial __उ__ as   \nin __पुत्त्रस्__ in LL. 2 and 3. In the second letter of the name,   \nviz. __रु।__ the medial __उ__ is shown by a small hook turned to left   \nand joined to the foot of __र्।__ Palaeographical considerations   \napart, the name Pur__उ__gupta yields a more plausible-sense than   \nPur__अ__gupta and fits better in the series of the grand and digni-   \nfied names of the Gupta kings. The first part of the Gupta   \nnames constituted the real or substantive name and yielded   \nsatisfactory meaning independently of the latter half, viz.   \n__गुप्त,__ which being family surname was a mere adjunct. __पुर,__   \nby itself is neither a complete nor a dignified name while __पुरु__   \nis both. __पूरु__ or its variant __पुरु__ may, like __वैन्य__ in Vainya-   \ngupta signify the homonymous epic hero of the lunar race   \nwho was the ancestor of the Kauravas and the Pāṇḍavas, or   \nmay mean abundant or great.^90^",
          },
        ],
        attributes: [],
        phonetic:
          "purugupta पूरुगुप्त know महाराजाधिराज śrī pūrugupta son kumāragupta chief queen anantadevī father page predecessor narasiṃhagupta spelt reading unmistakeable fragmentary nālandā seal fairly clear seals medial sign letter indicated additional stroke attached base downward elongation right limb mere itself denoted short पुत्त्रस् second रु। shown small hook turned left joined foot र्। palaeographical considerat",
        wordLnum: 9,
      },
    },
  ],
  eng2te: [
    {
      scenario: "Basic - Eng to Telugu",
      // wordLanguages: ["ENG"],
      sourceData: {
        data: {
          eng_word: "Abasement",
          pos: "n",
          pos_type: " s",
          meaning: " అవమానము, భంగము.",
        },
        wordField: "eng_word",
        descriptionField: "pos,pos_type,meaning",
        wordLang: "ENG",
        descriptionLang: "TEL",
      },
      expectedData: {
        origin: "ENG2TEL",
        word: [
          {
            language: "ENG",
            value: "Abasement",
          },
        ],
        description: [
          {
            language: "SAN",
            value: "n  s  अवमानमु, भंगमु.",
          },
          {
            language: "ITRANS",
            value: "n  s  avamAnamu, bhaMgamu.",
          },
          {
            language: "IAST",
            value: "n  s  avamānamu, bhaṃgamu.",
          },
          {
            language: "SLP1",
            value: "n  s  avamAnamu, BaMgamu.",
          },
          {
            language: "TEL",
            value: "n  s  అవమానము, భంగము.",
          },
        ],
        phonetic: "abasement avamanamu bhamgamu bamgamu",
        wordLnum: 0,
      },
    },
  ],
  eng2en: [
    {
      scenario: "Basic - Eng to Eng",
      // wordLanguages: ["ENG"],
      // descriptionLanguages: ["ENG"],
      sourceData: {
        data: {
          word: "'Sblood",
          wordtype: "interj.",
          definition: "An abbreviation of God's blood; -- used as an oath.",
        },
        wordField: "word",
        descriptionField: "wordtype,definition",
        wordLang: "ENG",
        descriptionLang: "ENG",
      },
      expectedData: {
        wordIndex: 6,
        origin: "ENG2ENG",
        word: [
          {
            language: "ENG",
            value: "'Sblood",
          },
        ],
        description: [
          {
            language: "ENG",
            value:
              "interj. An abbreviation of God's blood; -- used as an oath.",
          },
        ],
        phonetic: "sblood interj abbreviation god blood oath",
        wordLnum: 0,
      },
    },
  ],
  dhatu_pata: [
    {
      scenario: "Basic - San to San",
      sourceData: {
        data: {
          word: "उच्छ्",
          hom: "1",
          desc: '[उच्छ्]{ई} विवासे (विवासो वासातिक्रमः)\n\n1P, seṭ, sak\n\nto banish । विवास means वासातिक्रम "leaving home, banishment"',
          origin: "Dhātu-pāṭha",
        },
        wordField: "word",
        descriptionField: "desc",
        wordLang: "SAN",
        descriptionLang: "SAN",
      },
      expectedData: {
        wordIndex: 76,
        origin: "DHATU_PATA",
        word: [
          {
            language: "SAN",
            value: "उच्छ्",
          },
          {
            language: "ITRANS",
            value: "uchCh",
          },
          {
            language: "IAST",
            value: "ucch",
          },
          {
            language: "SLP1",
            value: "ucC",
          },
          {
            language: "TEL",
            value: "ఉచ్ఛ్",
          },
        ],
        description: [
          {
            language: "SAN",
            value:
              '[उच्छ्]{ई} विवासे (विवासो वासातिक्रमः)\n\n1P, seṭ, sak\n\nto banish । विवास means वासातिक्रम "leaving home, banishment"',
          },
          {
            language: "ITRANS",
            value:
              '[uchCh]{I} vivAse (vivAso vAsAtikramaH)\n\n1P, seṭ, sak\n\nto banish | vivAsa means vAsAtikrama "leaving home, banishment"',
          },
          {
            language: "IAST",
            value:
              '[ucch]{ī} vivāse (vivāso vāsātikramaḥ)\n\n1P, seṭ, sak\n\nto banish | vivāsa means vāsātikrama "leaving home, banishment"',
          },
          {
            language: "SLP1",
            value:
              '[ucC]{I} vivAse (vivAso vAsAtikramaH)\n\n1P, seṭ, sak\n\nto banish . vivAsa means vAsAtikrama "leaving home, banishment"',
          },
          {
            language: "TEL",
            value:
              '[ఉచ్ఛ్]{ఈ} వివాసే (వివాసో వాసాతిక్రమః)\n\n1P, seṭ, sak\n\nto banish । వివాస means వాసాతిక్రమ "leaving home, banishment"',
          },
        ],
        phonetic:
          "uchch ucc ucch sak banish means leaving home banishment vivase vivaso vasatikramah seṭ vivasa vasatikrama sèṭ set sew",
      },
    },
  ],
};
