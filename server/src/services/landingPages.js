import { Page } from '../models/Page.js';

export const LANDING_KEY_ALIASES = {
  'study-materials/pyq': 'study-materials/previous-year-questions',
  'study-materials/previous-year-questions': 'study-materials/pyq',
  'study-materials/sample-papers': 'study-materials/cbse-sample-papers',
  'study-materials/cbse-sample-papers': 'study-materials/sample-papers',
  'study-materials/extra-questions': 'study-materials/cbse-extra-questions',
  'study-materials/cbse-extra-questions': 'study-materials/extra-questions',
  'study-materials/important-questions': 'study-materials/vvi-questions',
  'study-materials/vvi-questions': 'study-materials/important-questions',
  'study-materials/syllabus': 'study-materials/maths-syllabus',
  'study-materials/maths-syllabus': 'study-materials/syllabus',
  'notes/ncert-notes': 'notes/ncert-chapter-wise-notes',
  'notes/ncert-chapter-wise-notes': 'notes/ncert-notes',
  'notes/formula-sheets': 'notes/maths-formula-sheets',
  'notes/maths-formula-sheets': 'notes/formula-sheets',
  'notes/vvi-short-notes': 'notes/vvi-questions-short-notes',
  'notes/vvi-questions-short-notes': 'notes/vvi-short-notes',
  'notes/reference-book-notes': 'notes/rs-aggarwal-formulas-notes',
  'reference-books': 'reference-solutions',
  'reference-solutions': 'reference-books',
};

export const DEFAULT_LANDING_PAGES = [
  // --- Study Materials ---
  {
    landingKey: 'study-materials',
    slug: 'study-materials-landing',
    category: 'Study Materials',
    targetUrl: '/study-materials',
    title: { en: 'Study Materials Hub', hi: 'अध्ययन सामग्री हब' },
    excerpt: {
      en: 'Complete study materials for Classes 6 to 12 Mathematics including NCERT solutions, previous year papers, sample papers, extra questions, and syllabus.',
      hi: 'कक्षा 6 से 12 गणित के लिए सम्पूर्ण अध्ययन सामग्री - NCERT समाधान, पिछले वर्षों के प्रश्न, सैंपल पेपर्स, अतिरिक्त प्रश्न और पाठ्यक्रम।',
    },
    hero: {
      title: { en: 'CBSE Mathematics Study Materials (Classes 6–12)', hi: 'CBSE गणित अध्ययन सामग्री (कक्षा 6–12)' },
      description: {
        en: 'Everything you need for exam preparation: chapter-wise question banks, solved past papers, official blueprints, and expert-crafted practice sets.',
        hi: 'परीक्षा की सर्वोत्तम तैयारी: अध्याय-वार प्रश्न बैंक, पिछले वर्षों के हल प्रश्न पत्र, आधिकारिक ब्लूप्रिंट और मॉडल अभ्यास सेट।',
      },
    },
    sections: [
      {
        type: 'faq',
        title: { en: 'Frequently Asked Questions', hi: 'अक्सर पूछे जाने वाले प्रश्न' },
        visible: true,
        sortOrder: 0,
        items: [
          {
            title: { en: 'Are all study materials on Passion Maths Study free?', hi: 'क्या Passion Maths Study पर सभी सामग्री निःशुल्क है?' },
            text: {
              en: 'Yes, 100% of the educational content, question solutions, formula sheets, and PDF downloads are completely free for all students.',
              hi: 'हाँ, विद्यार्थियों के लिए सभी शैक्षणिक समाधान, सूत्र पत्रक और पीडीएफ डाउनलोड पूरी तरह से निःशुल्क हैं।',
            },
          },
          {
            title: { en: 'Which classes and boards are covered?', hi: 'किन कक्षाओं और बोर्डों का पाठ्यक्रम उपलब्ध है?' },
            text: {
              en: 'We cover CBSE and State Boards (Bihar, UP, MP, Rajasthan, Jharkhand) for Classes 6, 7, 8, 9, 10, 11, and 12 Mathematics.',
              hi: 'हम कक्षा 6, 7, 8, 9, 10, 11 व 12 गणित के लिए CBSE और राज्य बोर्डों (बिहार, यूपी, एमपी, राजस्थान, झारखंड) को कवर करते हैं।',
            },
          },
        ],
      },
    ],
    seo: {
      title: { en: 'CBSE Maths Study Materials for Classes 6 to 12 | Passion Maths Study', hi: 'कक्षा 6 से 12 गणित अध्ययन सामग्री | Passion Maths Study' },
      description: {
        en: 'Download CBSE Classes 6 to 12 Mathematics study materials, chapter-wise question banks, PYQs, sample papers, and formula notes.',
        hi: 'कक्षा 6 से 12 गणित की सम्पूर्ण अध्ययन सामग्री, पिछले वर्षों के प्रश्न, सैंपल पेपर और फॉर्मूला नोट्स डाउनलोड करें।',
      },
    },
  },
  {
    landingKey: 'study-materials/previous-year-questions',
    slug: 'previous-year-questions-landing',
    category: 'Study Materials',
    targetUrl: '/study-materials/previous-year-questions',
    title: { en: 'Previous Year Question Papers (PYQ)', hi: 'पिछले वर्षों के प्रश्न पत्र (PYQ)' },
    excerpt: {
      en: 'CBSE Class 6 to 12 Mathematics previous year question papers with authentic step-by-step solutions and marking schemes.',
      hi: 'CBSE कक्षा 6 से 12 गणित के पिछले वर्षों के बोर्ड प्रश्न पत्र, विस्तृत हल और मार्किंग स्कीम।',
    },
    hero: {
      title: { en: 'CBSE Maths Previous Year Question Papers (PYQ) with Solutions', hi: 'CBSE पिछले वर्षों के गणित प्रश्न पत्र एवं सम्पूर्ण हल' },
      description: {
        en: 'Practice real exam questions from 2018 to 2025 with question-wise solutions, step marks distribution, and free downloadable PDF sets.',
        hi: 'वर्ष 2018 से 2025 तक के वास्तविक बोर्ड प्रश्न पत्रों का अभ्यास करें - प्रश्न-वार हल, अंक विभाजन और मुफ्त पीडीएफ डाउनलोड के साथ।',
      },
    },
    sections: [
      {
        type: 'faq',
        title: { en: 'Frequently Asked Questions about PYQs', hi: 'पिछले वर्षों के प्रश्नों से संबंधित अक्सर पूछे जाने वाले प्रश्न' },
        visible: true,
        sortOrder: 0,
        items: [
          {
            title: { en: 'How many years of PYQs should I practice for CBSE Class 10/12?', hi: 'CBSE कक्षा 10/12 के लिए कितने वर्षों के प्रश्न पत्र हल करने चाहिए?' },
            text: {
              en: 'Practicing the last 5 to 7 years of question papers gives complete familiarity with the exam pattern, recurring question types, and time management.',
              hi: 'पिछले 5 से 7 वर्षों के प्रश्न पत्रों का अभ्यास करने से परीक्षा पैटर्न, बार-बार पूछे जाने वाले प्रश्नों और समय प्रबंधन की पूरी समझ विकसित होती है।',
            },
          },
        ],
      },
    ],
    seo: {
      title: { en: 'CBSE Class 6-12 Maths Previous Year Question Papers (PYQ) with Solutions', hi: 'CBSE कक्षा 6-12 गणित पिछले वर्षों के प्रश्न पत्र (PYQ) हल सहित' },
      description: {
        en: 'Download CBSE Class 6 to 12 Mathematics past year question papers with detailed solutions, marking schemes, and question-wise analysis.',
        hi: 'CBSE कक्षा 6 से 12 गणित के पिछले वर्षों के प्रश्न पत्र, विस्तृत हल, मार्किंग स्कीम और पीडीएफ डाउनलोड करें।',
      },
    },
  },
  {
    landingKey: 'study-materials/cbse-sample-papers',
    slug: 'cbse-sample-papers-landing',
    category: 'Study Materials',
    targetUrl: '/study-materials/cbse-sample-papers',
    title: { en: 'CBSE Sample Question Papers', hi: 'CBSE सैंपल प्रश्न पत्र' },
    excerpt: {
      en: 'Latest official and practice sample papers for CBSE Classes 6 to 12 Mathematics with complete solutions and blueprints.',
      hi: 'CBSE कक्षा 6 से 12 गणित के नवीनतम आधिकारिक और अभ्यास मॉडल सैंपल पेपर्स, सम्पूर्ण हल व ब्लूप्रिंट सहित।',
    },
    hero: {
      title: { en: 'CBSE Mathematics Sample Papers with Solutions & Marking Schemes', hi: 'CBSE गणित सैंपल पेपर्स - हल व मार्किंग स्कीम सहित' },
      description: {
        en: 'Master the latest exam format, section weightage, competency-based questions, and case-study problems with our verified sample paper collection.',
        hi: 'नवीनतम परीक्षा प्रारूप, सेक्शन वेटेज, दक्षता-आधारित प्रश्नों और केस-स्टडी समस्याओं का अभ्यास करें।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'CBSE Class 6-12 Maths Sample Papers with Solutions | Latest Session', hi: 'CBSE कक्षा 6-12 गणित सैंपल पेपर्स हल सहित | नवीनतम सत्र' },
      description: {
        en: 'Download latest CBSE Class 6 to 12 Mathematics sample question papers with marking schemes, blueprints, and step-by-step solutions.',
        hi: 'CBSE कक्षा 6 से 12 गणित के नवीनतम सैंपल पेपर्स, मार्किंग स्कीम और स्टेप-बाय-स्टेप हल डाउनलोड करें।',
      },
    },
  },
  {
    landingKey: 'study-materials/cbse-extra-questions',
    slug: 'cbse-extra-questions-landing',
    category: 'Study Materials',
    targetUrl: '/study-materials/cbse-extra-questions',
    title: { en: 'CBSE Extra Questions with Solutions', hi: 'CBSE अतिरिक्त प्रश्न व हल' },
    excerpt: {
      en: 'Chapter-wise extra practice questions, HOTS problems, and conceptual questions for Classes 6 to 12 Mathematics.',
      hi: 'कक्षा 6 से 12 गणित के अध्याय-वार अतिरिक्त अभ्यास प्रश्न, HOTS और अवधारणात्मक समस्याएं।',
    },
    hero: {
      title: { en: 'Chapter-wise CBSE Maths Extra Questions & Detailed Solutions', hi: 'अध्याय-वार CBSE गणित अतिरिक्त प्रश्न एवं विस्तृत हल' },
      description: {
        en: 'Boost your exam confidence with carefully curated extra practice problems categorized by difficulty level (Easy, Medium, Hard).',
        hi: 'कठिनाई स्तर (सरल, मध्यम, कठिन) के अनुसार व्यवस्थित अतिरिक्त प्रश्नों से अपने गणितीय कौशल को सुदृढ़ करें।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'CBSE Class 6-12 Maths Extra Questions with Solutions | Passion Maths Study', hi: 'CBSE कक्षा 6-12 गणित अतिरिक्त प्रश्न हल सहित | Passion Maths Study' },
      description: {
        en: 'Access chapter-wise extra questions for CBSE Classes 6 to 12 Mathematics with detailed solutions and formulas.',
        hi: 'CBSE कक्षा 6 से 12 गणित के अध्याय-वार अतिरिक्त प्रश्न और उनके सम्पूर्ण हल प्राप्त करें।',
      },
    },
  },
  {
    landingKey: 'study-materials/vvi-questions',
    slug: 'vvi-questions-landing',
    category: 'Study Materials',
    targetUrl: '/study-materials/vvi-questions',
    title: { en: 'VVI Questions (Board Special)', hi: 'अति महत्वपूर्ण प्रश्न (बोर्ड विशेष)' },
    excerpt: {
      en: 'Most important (VVI) questions for CBSE and State Board exams with step-by-step solutions and marks weightage.',
      hi: 'CBSE एवं राज्य बोर्ड परीक्षाओं के लिए अति महत्वपूर्ण (VVI) प्रश्न, चरणबद्ध हल और अंक विभाजन।',
    },
    hero: {
      title: { en: 'Most Important VVI Questions for Board Exams (Classes 6–12)', hi: 'बोर्ड परीक्षाओं हेतु अति महत्वपूर्ण (VVI) प्रश्न (कक्षा 6–12)' },
      description: {
        en: 'High-probability exam questions selected by expert educators to maximize your board exam score in minimum revision time.',
        hi: 'न्यूनतम समय में अधिकतम अंक प्राप्त करने के लिए विषय विशेषज्ञों द्वारा चयनित संभावित बोर्ड प्रश्न।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'CBSE Class 6-12 Maths VVI Questions (Board Special) with Solutions', hi: 'CBSE कक्षा 6-12 गणित VVI प्रश्न (बोर्ड विशेष) हल सहित' },
      description: {
        en: 'Most important VVI mathematics questions for Classes 6 to 12 board examinations with step-by-step solutions and marks distribution.',
        hi: 'कक्षा 6 से 12 बोर्ड परीक्षाओं के लिए अति महत्वपूर्ण गणित प्रश्न, हल और अंक वितरण।',
      },
    },
  },
  {
    landingKey: 'study-materials/maths-syllabus',
    slug: 'maths-syllabus-landing',
    category: 'Study Materials',
    targetUrl: '/study-materials/maths-syllabus',
    title: { en: 'CBSE Maths Syllabus & Blueprint', hi: 'CBSE गणित पाठ्यक्रम व अंक वितरण' },
    excerpt: {
      en: 'Official CBSE Classes 6 to 12 Mathematics syllabus, unit-wise marks distribution, and examination blueprints.',
      hi: 'CBSE कक्षा 6 से 12 गणित का आधिकारिक पाठ्यक्रम, इकाई-वार अंक विभाजन और परीक्षा ब्लूप्रिंट।',
    },
    hero: {
      title: { en: 'Latest CBSE Mathematics Syllabus & Marks Distribution', hi: 'नवीनतम CBSE गणित पाठ्यक्रम एवं अंक विभाजन' },
      description: {
        en: 'Stay updated with the current academic curriculum, deleted chapters/exercises, internal assessment guidelines, and question paper design.',
        hi: 'वर्तमान शैक्षणिक सत्र के पाठ्यक्रम, हटाए गए अध्यायों/प्रश्नावली, आंतरिक मूल्यांकन और प्रश्न पत्र डिजाइन की पूरी जानकारी।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'CBSE Class 6-12 Maths Syllabus & Course Structure | Passion Maths Study', hi: 'CBSE कक्षा 6-12 गणित पाठ्यक्रम एवं अंक विभाजन | Passion Maths Study' },
      description: {
        en: 'Download latest CBSE Mathematics syllabus for Classes 6 to 12 with unit weightage, deleted portions, and exam guidelines.',
        hi: 'कक्षा 6 से 12 के लिए नवीनतम CBSE गणित पाठ्यक्रम, इकाई-वार अंक और परीक्षा दिशानिर्देश डाउनलोड करें।',
      },
    },
  },
  {
    landingKey: 'study-materials/ncert-books',
    slug: 'ncert-books-landing',
    category: 'Study Materials',
    targetUrl: '/study-materials/ncert-books',
    title: { en: 'NCERT Mathematics Textbooks PDF', hi: 'NCERT गणित पाठ्यपुस्तकें PDF' },
    excerpt: {
      en: 'Download official NCERT Mathematics textbooks for Classes 6 to 12 in English and Hindi medium.',
      hi: 'कक्षा 6 से 12 के लिए आधिकारिक NCERT गणित पाठ्यपुस्तकें हिंदी व अंग्रेजी माध्यम में डाउनलोड करें।',
    },
    hero: {
      title: { en: 'Download NCERT Mathematics Books PDF (Classes 6 to 12)', hi: 'NCERT गणित पुस्तकें PDF डाउनलोड (कक्षा 6 से 12)' },
      description: {
        en: 'Complete chapter-wise and full-book PDFs of latest NCERT Mathematics textbooks rationalized for the current academic session.',
        hi: 'वर्तमान शैक्षणिक सत्र के अनुसार नवीनतम NCERT गणित पाठ्यपुस्तकों के अध्याय-वार और संपूर्ण पुस्तक पीडीएफ।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'Download NCERT Class 6-12 Maths Books PDF | English & Hindi Medium', hi: 'NCERT कक्षा 6-12 गणित पुस्तकें PDF डाउनलोड | हिंदी व अंग्रेजी माध्यम' },
      description: {
        en: 'Download official NCERT Mathematics textbooks for Classes 6 to 12 in PDF format for English and Hindi medium students.',
        hi: 'कक्षा 6 से 12 के विद्यार्थियों के लिए आधिकारिक NCERT गणित की पुस्तकें पीडीएफ प्रारूप में डाउनलोड करें।',
      },
    },
  },

  // --- Notes & Formulas ---
  {
    landingKey: 'notes',
    slug: 'notes-hub-landing',
    category: 'Notes & Formulas',
    targetUrl: '/notes',
    title: { en: 'Maths Revision Notes & Formula Sheets Hub', hi: 'गणित रिवीजन नोट्स एवं सूत्र पत्रक' },
    excerpt: {
      en: 'Chapter-wise revision notes, theorem proofs, and formula sheets for Classes 6 to 12 Mathematics.',
      hi: 'कक्षा 6 से 12 गणित के लिए अध्याय-वार रिवीजन नोट्स, प्रमेय उपपत्ति और सूत्र पत्रक।',
    },
    hero: {
      title: { en: 'Complete Mathematics Revision Notes & Formula Sheets', hi: 'सम्पूर्ण गणित रिवीजन नोट्स एवं सूत्र पत्रक' },
      description: {
        en: 'Comprehensive summary notes, key mathematical formulas, diagrammatic explanations, and shortcuts for fast exam revision.',
        hi: 'त्वरित परीक्षा रिवीजन के लिए मुख्य गणितीय सूत्र, रेखाचित्र स्पष्टीकरण और शॉर्टकट नोट्स।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'Class 6-12 Maths Revision Notes & Formula Sheets | Passion Maths Study', hi: 'कक्षा 6-12 गणित रिवीजन नोट्स व सूत्र पत्रक | Passion Maths Study' },
      description: {
        en: 'Download chapter-wise revision notes, quick formulas, theorem proofs, and concept summaries for Classes 6 to 12 Mathematics.',
        hi: 'कक्षा 6 से 12 गणित के अध्याय-वार रिवीजन नोट्स, सूत्र और थ्योरम प्रूफ डाउनलोड करें।',
      },
    },
  },
  {
    landingKey: 'notes/ncert-chapter-wise-notes',
    slug: 'ncert-chapter-wise-notes-landing',
    category: 'Notes & Formulas',
    targetUrl: '/notes/ncert-chapter-wise-notes',
    title: { en: 'NCERT Chapter-wise Notes', hi: 'NCERT अध्याय-वार नोट्स' },
    excerpt: {
      en: 'Structured chapter-by-chapter revision notes based on the NCERT Mathematics syllabus for Classes 6 to 12.',
      hi: 'कक्षा 6 से 12 के लिए NCERT गणित पाठ्यक्रम पर आधारित सुव्यवस्थित अध्याय-वार रिवीजन नोट्स।',
    },
    hero: {
      title: { en: 'Class 6 to 12 NCERT Mathematics Chapter-wise Revision Notes', hi: 'कक्षा 6 से 12 NCERT गणित अध्याय-वार रिवीजन नोट्स' },
      description: {
        en: 'Clear concept breakdowns, important definitions, theorem statements with proofs, and illustrative examples.',
        hi: 'स्पष्ट अवधारणाएं, महत्वपूर्ण परिभाषाएं, प्रमेयों की उपपत्ति और उदाहरण सहित विस्तृत व्याख्या।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'CBSE Class 6-12 Maths NCERT Chapter-wise Notes | Passion Maths Study', hi: 'CBSE कक्षा 6-12 गणित NCERT अध्याय-वार नोट्स | Passion Maths Study' },
      description: {
        en: 'Comprehensive NCERT Mathematics chapter-wise notes for Classes 6 to 12 with definitions, theorems, formulas, and revision summaries.',
        hi: 'कक्षा 6 से 12 के लिए सम्पूर्ण NCERT गणित अध्याय-वार नोट्स, परिभाषाएं, सूत्र और सारांश।',
      },
    },
  },
  {
    landingKey: 'notes/maths-formula-sheets',
    slug: 'maths-formula-sheets-landing',
    category: 'Notes & Formulas',
    targetUrl: '/notes/maths-formula-sheets',
    title: { en: 'All Maths Formula Sheets', hi: 'सभी गणित सूत्र पत्रक' },
    excerpt: {
      en: 'Complete chapter-wise mathematical formula sheets covering Algebra, Geometry, Trigonometry, Calculus, and Statistics.',
      hi: 'बीजगणित, ज्यामिति, त्रिकोणमिति, कैलकुलस और सांख्यिकी के सम्पूर्ण अध्याय-वार गणित सूत्र पत्रक।',
    },
    hero: {
      title: { en: 'All Maths Formulas PDF & Quick Revision Sheets', hi: 'सभी गणित सूत्र PDF एवं त्वरित रिवीजन शीट्स' },
      description: {
        en: 'Never forget a formula: download high-resolution printable formula sheets with mathematical symbols and identities.',
        hi: 'सभी महत्वपूर्ण सूत्र, सर्वसमिकाएं और प्रतीक एक ही स्थान पर - प्रिंट करने योग्य उच्च गुणवत्ता वाली सूत्र शीट।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'All Maths Formulas for Class 6 to 12 | Complete Formula Sheet PDF', hi: 'कक्षा 6 से 12 के सभी गणित सूत्र | सम्पूर्ण फॉर्मूला शीट PDF' },
      description: {
        en: 'Download Class 6 to 12 Mathematics all formula sheets PDF, chapter-wise formulas, identities, and symbols guide.',
        hi: 'कक्षा 6 से 12 गणित के सभी सूत्र, सर्वसमिकाएं और प्रतीक गाइड पीडीएफ प्रारूप में डाउनलोड करें।',
      },
    },
  },
  {
    landingKey: 'notes/rs-aggarwal-formulas-notes',
    slug: 'rs-aggarwal-formulas-notes-landing',
    category: 'Notes & Formulas',
    targetUrl: '/notes/rs-aggarwal-formulas-notes',
    title: { en: 'RS Aggarwal Formulas & Notes', hi: 'आर.एस. अग्रवाल सूत्र व नोट्स' },
    excerpt: {
      en: 'Formulas, theorem proofs, and conceptual notes for RS Aggarwal Mathematics (Classes 6 to 12).',
      hi: 'आर.एस. अग्रवाल गणित (कक्षा 6 से 12) के लिए सूत्र, प्रमेय और अवधारणात्मक नोट्स।',
    },
    hero: {
      title: { en: 'RS Aggarwal Class 6 to 12 Maths Formulas & Chapter Notes', hi: 'आर.एस. अग्रवाल गणित सूत्र एवं अध्याय नोट्स' },
      description: {
        en: 'Key problem-solving techniques, standard formulas, and step-by-step illustrations from RS Aggarwal Mathematics.',
        hi: 'आर.एस. अग्रवाल गणित से महत्वपूर्ण समस्या-समाधान तकनीकें, मानक सूत्र और उदाहरण।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'RS Aggarwal Class 6-12 Maths Formulas & Notes | Passion Maths Study', hi: 'आर.एस. अग्रवाल गणित सूत्र व नोट्स | Passion Maths Study' },
      description: {
        en: 'Download RS Aggarwal Class 6 to 12 Mathematics important formulas, theorem notes, worked examples, and quick revision PDF.',
        hi: 'आर.एस. अग्रवाल गणित के महत्वपूर्ण सूत्र, थ्योरम नोट्स और उदाहरण पीडीएफ डाउनलोड करें।',
      },
    },
  },
  {
    landingKey: 'notes/rd-sharma-formulas-notes',
    slug: 'rd-sharma-formulas-notes-landing',
    category: 'Notes & Formulas',
    targetUrl: '/notes/rd-sharma-formulas-notes',
    title: { en: 'RD Sharma Formulas & Notes', hi: 'आर.डी. शर्मा सूत्र व नोट्स' },
    excerpt: {
      en: 'In-depth conceptual notes, advanced formulas, and theory summaries for RD Sharma Mathematics.',
      hi: 'आर.डी. शर्मा गणित के लिए विस्तृत अवधारणात्मक नोट्स, उन्नत सूत्र और थ्योरी सारांश।',
    },
    hero: {
      title: { en: 'RD Sharma Class 6 to 12 Mathematics Formulas & Theory Notes', hi: 'आर.डी. शर्मा गणित सूत्र एवं थ्योरी नोट्स' },
      description: {
        en: 'Master complex mathematical concepts with detailed theoretical notes and standard formula sheets for RD Sharma.',
        hi: 'आर.डी. शर्मा के विस्तृत सैद्धांतिक नोट्स और मानक फॉर्मूला शीट्स के साथ जटिल अवधारणाओं को समझें।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'RD Sharma Class 6-12 Maths Formulas & Notes | Passion Maths Study', hi: 'आर.डी. शर्मा गणित सूत्र व नोट्स | Passion Maths Study' },
      description: {
        en: 'Download RD Sharma Class 6 to 12 Mathematics important formulas, advanced notes, worked examples, and quick revision PDF.',
        hi: 'आर.डी. शर्मा गणित के महत्वपूर्ण सूत्र, थ्योरी नोट्स और हल उदाहरण डाउनलोड करें।',
      },
    },
  },
  {
    landingKey: 'notes/kc-sinha-formulas-notes',
    slug: 'kc-sinha-formulas-notes-landing',
    category: 'Notes & Formulas',
    targetUrl: '/notes/kc-sinha-formulas-notes',
    title: { en: 'KC Sinha Formulas & Notes', hi: 'के.सी. सिन्हा सूत्र व नोट्स' },
    excerpt: {
      en: 'Mathematical formulas, theorem proofs, and chapter revision notes for KC Sinha Mathematics.',
      hi: 'के.सी. सिन्हा गणित के लिए गणितीय सूत्र, प्रमेय उपपत्ति और अध्याय रिवीजन नोट्स।',
    },
    hero: {
      title: { en: 'KC Sinha Class 6 to 12 Maths Formulas & Chapter Notes', hi: 'के.सी. सिन्हा गणित सूत्र व अध्याय नोट्स' },
      description: {
        en: 'Comprehensive formulas, shortcuts, and Hindi/English concept summaries for KC Sinha Mathematics.',
        hi: 'के.सी. सिन्हा गणित के लिए विस्तृत सूत्र, शॉर्टकट और हिंदी/अंग्रेजी में अवधारणात्मक सारांश।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'KC Sinha Class 6-12 Maths Formulas & Notes | Passion Maths Study', hi: 'के.सी. सिन्हा गणित सूत्र व नोट्स | Passion Maths Study' },
      description: {
        en: 'Download KC Sinha Class 6 to 12 Mathematics formulas and chapter notes in Hindi and English medium.',
        hi: 'के.सी. सिन्हा गणित के सूत्र और अध्याय नोट्स हिंदी व अंग्रेजी में डाउनलोड करें।',
      },
    },
  },
  {
    landingKey: 'notes/ml-aggarwal-formulas-notes',
    slug: 'ml-aggarwal-formulas-notes-landing',
    category: 'Notes & Formulas',
    targetUrl: '/notes/ml-aggarwal-formulas-notes',
    title: { en: 'ML Aggarwal Formulas & Notes', hi: 'एम.एल. अग्रवाल सूत्र व नोट्स' },
    excerpt: {
      en: 'Essential formulas, quick reference sheets, and notes for ML Aggarwal Mathematics.',
      hi: 'एम.एल. अग्रवाल गणित के लिए आवश्यक सूत्र, त्वरित संदर्भ पत्रक और नोट्स।',
    },
    hero: {
      title: { en: 'ML Aggarwal Class 6 to 12 Maths Formulas & Notes', hi: 'एम.एल. अग्रवाल गणित सूत्र व नोट्स' },
      description: {
        en: 'Step-by-step formula derivations and chapter summaries for ML Aggarwal Mathematics.',
        hi: 'एम.एल. अग्रवाल गणित के चरणबद्ध सूत्र निगमन और अध्याय सारांश।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'ML Aggarwal Class 6-12 Maths Formulas & Notes | Passion Maths Study', hi: 'एम.एल. अग्रवाल गणित सूत्र व नोट्स | Passion Maths Study' },
      description: {
        en: 'Download ML Aggarwal Class 6 to 12 Mathematics formulas and notes PDF.',
        hi: 'एम.एल. अग्रवाल गणित के सूत्र और नोट्स पीडीएफ डाउनलोड करें।',
      },
    },
  },
  {
    landingKey: 'notes/vvi-questions-short-notes',
    slug: 'vvi-questions-short-notes-landing',
    category: 'Notes & Formulas',
    targetUrl: '/notes/vvi-questions-short-notes',
    title: { en: 'VVI Questions & Short Notes', hi: 'अति महत्वपूर्ण प्रश्न व संक्षिप्त नोट्स' },
    excerpt: {
      en: 'Exam-special short notes, quick formula cheat sheets, and board VVI question summaries.',
      hi: 'परीक्षा विशेष संक्षिप्त नोट्स, त्वरित सूत्र चीट-शीट और बोर्ड VVI प्रश्नों का सारांश।',
    },
    hero: {
      title: { en: 'Exam Special VVI Short Notes & Quick Formulas', hi: 'परीक्षा विशेष अति महत्वपूर्ण संक्षिप्त नोट्स' },
      description: {
        en: 'Last-minute revision notes highlighting high-scoring topics, standard proofs, and frequently asked formulas.',
        hi: 'अंतिम समय की तैयारी के लिए महत्वपूर्ण विषय, मानक उपपत्तियां और अक्सर पूछे जाने वाले सूत्र।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'Class 6-12 Maths VVI Questions & Short Notes | Passion Maths Study', hi: 'कक्षा 6-12 गणित VVI प्रश्न एवं संक्षिप्त नोट्स | Passion Maths Study' },
      description: {
        en: 'Quick exam revision short notes and VVI question summaries for Classes 6 to 12 Mathematics.',
        hi: 'कक्षा 6 से 12 गणित के लिए त्वरित रिवीजन संक्षिप्त नोट्स और VVI प्रश्न सारांश।',
      },
    },
  },

  // --- Reference Book Solutions ---
  {
    landingKey: 'reference-solutions',
    slug: 'reference-solutions-hub-landing',
    category: 'Reference Books',
    targetUrl: '/reference-solutions',
    title: { en: 'Reference Books Solutions Hub', hi: 'संदर्भ पुस्तक समाधान हब' },
    excerpt: {
      en: 'Complete step-by-step solutions for RS Aggarwal, RD Sharma, KC Sinha, and ML Aggarwal for Classes 6 to 12.',
      hi: 'कक्षा 6 से 12 के लिए आर.एस. अग्रवाल, आर.डी. शर्मा, के.सी. सिन्हा और एम.एल. अग्रवाल के सम्पूर्ण चरणबद्ध समाधान।',
    },
    hero: {
      title: { en: 'Mathematics Reference Book Solutions (Classes 6–12)', hi: 'गणित संदर्भ पुस्तक समाधान (कक्षा 6–12)' },
      description: {
        en: 'Hand-crafted, author-verified solutions with multiple solving methods (standard explanation & fast shortcuts), KaTeX formulas, and diagrams.',
        hi: 'हस्तनिर्मित और सत्यापित समाधान - मानक विधि व शॉर्टकट दोनों विधियों, गणितीय सूत्रों और रेखाचित्रों के साथ।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'Reference Books Maths Solutions: RS Aggarwal, RD Sharma, KC Sinha | Passion Maths Study', hi: 'संदर्भ पुस्तक गणित समाधान: आर.एस. अग्रवाल, आर.डी. शर्मा, के.सी. सिन्हा | Passion Maths Study' },
      description: {
        en: 'Exercise-wise step-by-step solutions for RS Aggarwal, RD Sharma, ML Aggarwal, and KC Sinha for Classes 6 to 12 Mathematics.',
        hi: 'कक्षा 6 से 12 के लिए आर.एस. अग्रवाल, आर.डी. शर्मा और के.सी. सिन्हा गणित के अभ्यास-वार विस्तृत हल।',
      },
    },
  },
  {
    landingKey: 'reference-solutions/rs-aggarwal',
    slug: 'rs-aggarwal-solutions-landing',
    category: 'Reference Books',
    targetUrl: '/reference-solutions/rs-aggarwal',
    title: { en: 'RS Aggarwal Solutions', hi: 'आर.एस. अग्रवाल समाधान' },
    excerpt: {
      en: 'Complete chapter-wise and exercise-wise solutions for RS Aggarwal Mathematics (Classes 6 to 12).',
      hi: 'आर.एस. अग्रवाल गणित (कक्षा 6 से 12) के सम्पूर्ण अध्याय-वार और अभ्यास-वार हल।',
    },
    hero: {
      title: { en: 'RS Aggarwal Solutions for Classes 6 to 12 Mathematics', hi: 'आर.एस. अग्रवाल गणित कक्षा 6 से 12 सम्पूर्ण हल' },
      description: {
        en: 'Clear step-by-step solutions with detailed working, alternative methods, formulas, and downloadable PDFs.',
        hi: 'विस्तृत चरणबद्ध हल, वैकल्पिक विधियां, सूत्र और डाउनलोड करने योग्य पीडीएफ।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'RS Aggarwal Solutions for Class 6, 7, 8, 9, 10, 11, 12 Maths | Chapter-wise', hi: 'आर.एस. अग्रवाल गणित कक्षा 6 से 12 समाधान | अध्याय-वार' },
      description: {
        en: 'Step-by-step solutions for RS Aggarwal Mathematics for Classes 6 to 12 with formulas, diagrams, and video explanations.',
        hi: 'कक्षा 6 से 12 आर.एस. अग्रवाल गणित के चरणबद्ध हल, सूत्र और रेखाचित्र।',
      },
    },
  },
  {
    landingKey: 'reference-solutions/rd-sharma',
    slug: 'rd-sharma-solutions-landing',
    category: 'Reference Books',
    targetUrl: '/reference-solutions/rd-sharma',
    title: { en: 'RD Sharma Solutions', hi: 'आर.डी. शर्मा समाधान' },
    excerpt: {
      en: 'Detailed exercise-wise solutions for RD Sharma Mathematics for Classes 6 to 12.',
      hi: 'कक्षा 6 से 12 के लिए आर.डी. शर्मा गणित के अभ्यास-वार विस्तृत हल।',
    },
    hero: {
      title: { en: 'RD Sharma Solutions for Classes 6 to 12 Mathematics', hi: 'आर.डी. शर्मा गणित कक्षा 6 से 12 सम्पूर्ण हल' },
      description: {
        en: 'Rigorous mathematical explanations, multiple solving techniques, and verified answers for every RD Sharma exercise problem.',
        hi: 'आर.डी. शर्मा के प्रत्येक अभ्यास प्रश्न के लिए सटीक गणितीय व्याख्या और सत्यापित उत्तर।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'RD Sharma Solutions for Class 6 to 12 Maths | Detailed & Exercise-wise', hi: 'आर.डी. शर्मा गणित कक्षा 6 से 12 समाधान | अभ्यास-वार' },
      description: {
        en: 'Exercise-wise solutions for RD Sharma Mathematics for Classes 6 to 12 with step-by-step proofs and diagrams.',
        hi: 'कक्षा 6 से 12 आर.डी. शर्मा गणित के अभ्यास-वार हल और प्रमाण।',
      },
    },
  },
  {
    landingKey: 'reference-solutions/kc-sinha',
    slug: 'kc-sinha-solutions-landing',
    category: 'Reference Books',
    targetUrl: '/reference-solutions/kc-sinha',
    title: { en: 'KC Sinha Solutions', hi: 'के.सी. सिन्हा समाधान' },
    excerpt: {
      en: 'Complete exercise solutions for KC Sinha Mathematics (Classes 6 to 12) in English and Hindi medium.',
      hi: 'के.सी. सिन्हा गणित (कक्षा 6 से 12) के सम्पूर्ण अभ्यास समाधान हिंदी व अंग्रेजी माध्यम में।',
    },
    hero: {
      title: { en: 'KC Sinha Mathematics Solutions for Classes 6 to 12', hi: 'के.सी. सिन्हा गणित सम्पूर्ण समाधान (कक्षा 6 से 12)' },
      description: {
        en: 'Comprehensive solutions covering every illustrative example and exercise in KC Sinha Mathematics.',
        hi: 'के.सी. सिन्हा गणित के प्रत्येक उदाहरण और अभ्यास प्रश्न का विस्तृत समाधान।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'KC Sinha Solutions for Class 6 to 12 Maths | Passion Maths Study', hi: 'के.सी. सिन्हा गणित कक्षा 6 से 12 समाधान | Passion Maths Study' },
      description: {
        en: 'Download KC Sinha Mathematics solutions for Classes 6 to 12 in English and Hindi medium.',
        hi: 'के.सी. सिन्हा गणित के कक्षा 6 से 12 के समाधान हिंदी व अंग्रेजी में प्राप्त करें।',
      },
    },
  },
  {
    landingKey: 'reference-solutions/ml-aggarwal',
    slug: 'ml-aggarwal-solutions-landing',
    category: 'Reference Books',
    targetUrl: '/reference-solutions/ml-aggarwal',
    title: { en: 'ML Aggarwal Solutions', hi: 'एम.एल. अग्रवाल समाधान' },
    excerpt: {
      en: 'Step-by-step solutions for ML Aggarwal Mathematics for Classes 6 to 12.',
      hi: 'कक्षा 6 से 12 के लिए एम.एल. अग्रवाल गणित के चरणबद्ध हल।',
    },
    hero: {
      title: { en: 'ML Aggarwal Solutions for Classes 6 to 12 Mathematics', hi: 'एम.एल. अग्रवाल गणित समाधान (कक्षा 6 से 12)' },
      description: {
        en: 'Clear, concise solutions for all exercises and chapter test problems in ML Aggarwal Mathematics.',
        hi: 'एम.एल. अग्रवाल गणित के सभी अभ्यासों और टेस्ट प्रश्नों का स्पष्ट समाधान।',
      },
    },
    sections: [],
    seo: {
      title: { en: 'ML Aggarwal Solutions for Class 6 to 12 Maths | Passion Maths Study', hi: 'एम.एल. अग्रवाल गणित समाधान | Passion Maths Study' },
      description: {
        en: 'Exercise solutions for ML Aggarwal Mathematics for Classes 6 to 12 with steps and formulas.',
        hi: 'कक्षा 6 से 12 एम.एल. अग्रवाल गणित के अभ्यास समाधान।',
      },
    },
  },

  // --- NCERT Mathematics Dedicated Class Pages ---
  ...[12, 11, 10, 9, 8, 7, 6].map((num) => ({
    landingKey: `class-${num}/mathematics`,
    slug: `ncert-class-${num}-mathematics-landing`,
    category: 'NCERT Mathematics',
    targetUrl: `/class-${num}/mathematics`,
    title: { en: `NCERT Class ${num} Mathematics`, hi: `NCERT कक्षा ${num} गणित` },
    excerpt: {
      en: `Complete NCERT Class ${num} Mathematics textbook solutions, chapter-wise exercises, formulas, and revision materials.`,
      hi: `NCERT कक्षा ${num} गणित के सम्पूर्ण पाठ्यपुस्तक समाधान, अध्याय-वार अभ्यास, सूत्र और रिवीजन सामग्री।`,
    },
    hero: {
      title: { en: `NCERT Class ${num} Mathematics Solutions & Study Materials`, hi: `NCERT कक्षा ${num} गणित समाधान एवं अध्ययन सामग्री` },
      description: {
        en: `Chapter-wise NCERT solutions, exercise answers, important formulas, and video explanations for Class ${num} Mathematics.`,
        hi: `कक्षा ${num} गणित के लिए अध्याय-वार NCERT समाधान, अभ्यास उत्तर, महत्वपूर्ण सूत्र और वीडियो व्याख्यान।`,
      },
    },
    sections: [
      {
        type: 'faq',
        title: { en: `Class ${num} Mathematics FAQs`, hi: `कक्षा ${num} गणित - अक्सर पूछे जाने वाले प्रश्न` },
        visible: true,
        sortOrder: 0,
        items: [
          {
            title: { en: `Are these Class ${num} NCERT solutions updated for the latest syllabus?`, hi: `क्या ये कक्षा ${num} NCERT समाधान नवीनतम पाठ्यक्रम के अनुसार हैं?` },
            text: {
              en: `Yes, all chapter exercises and questions follow the rationalized NCERT curriculum for the current academic session.`,
              hi: `हाँ, सभी अध्याय अभ्यास और प्रश्न वर्तमान शैक्षणिक सत्र के नवीनतम NCERT पाठ्यक्रम के अनुसार तैयार किए गए हैं।`,
            },
          },
        ],
      },
    ],
    seo: {
      title: { en: `NCERT Solutions for Class ${num} Maths | Passion Maths Study`, hi: `NCERT कक्षा ${num} गणित समाधान | Passion Maths Study` },
      description: {
        en: `Complete Class ${num} Mathematics NCERT solutions chapter-wise and exercise-wise in Hindi and English medium.`,
        hi: `कक्षा ${num} गणित के सम्पूर्ण NCERT समाधान अध्याय-वार और प्रश्नावली-वार हिंदी व अंग्रेजी में।`,
      },
    },
  })),
];

export function formatSeo(seoDef) {
  if (!seoDef) return {};
  const enTitle = typeof seoDef.title === 'object' ? seoDef.title?.en || '' : seoDef.title || '';
  const hiTitle = typeof seoDef.title === 'object' ? seoDef.title?.hi || '' : seoDef.title || '';
  const enDesc = typeof seoDef.description === 'object' ? seoDef.description?.en || '' : seoDef.description || '';
  const hiDesc = typeof seoDef.description === 'object' ? seoDef.description?.hi || '' : seoDef.description || '';
  return {
    title: enTitle || hiTitle,
    description: enDesc || hiDesc,
    translations: {
      en: { title: enTitle, description: enDesc },
      hi: { title: hiTitle, description: hiDesc },
    },
  };
}

export async function ensureDefaultLandingPages() {
  const created = [];
  for (const pageDef of DEFAULT_LANDING_PAGES) {
    const existing = await Page.findOne({ landingKey: pageDef.landingKey });
    if (!existing) {
      const doc = await Page.create({
        landingKey: pageDef.landingKey,
        slug: pageDef.slug,
        title: pageDef.title,
        excerpt: pageDef.excerpt,
        hero: pageDef.hero,
        sections: pageDef.sections || [],
        template: 'default',
        status: 'published',
        languageMode: 'auto',
        seo: formatSeo(pageDef.seo),
      });
      created.push(doc);
    }
  }
  return created;
}

export async function ensureLandingPageByKey(landingKey) {
  const trimmed = String(landingKey || '').trim().toLowerCase();
  if (!trimmed) return null;
  const canonical = LANDING_KEY_ALIASES[trimmed] || trimmed;
  let page = await Page.findOne({ landingKey: { $in: [trimmed, canonical] } });
  if (page) return page;

  const definition = DEFAULT_LANDING_PAGES.find(
    (p) => p.landingKey === trimmed || p.landingKey === canonical
  );

  if (definition) {
    page = await Page.create({
      landingKey: definition.landingKey,
      slug: definition.slug,
      title: definition.title,
      excerpt: definition.excerpt,
      hero: definition.hero,
      sections: definition.sections || [],
      template: 'default',
      status: 'published',
      languageMode: 'auto',
      seo: formatSeo(definition.seo),
    });
  } else {
    // Custom landing page fallback
    const slug = `landing-${trimmed.replace(/[^a-z0-9]+/g, '-')}`;
    const name = trimmed.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    page = await Page.create({
      landingKey: trimmed,
      slug,
      title: { en: `${name} Landing Page`, hi: `${name} लैंडिंग पृष्ठ` },
      excerpt: { en: `Custom landing page content for ${trimmed}`, hi: `${trimmed} के लिए लैंडिंग पृष्ठ सामग्री` },
      hero: {
        title: { en: `${name}`, hi: `${name}` },
        description: { en: `Welcome to ${name} on Passion Maths Study.`, hi: `Passion Maths Study पर ${name} में आपका स्वागत है।` },
      },
      template: 'default',
      status: 'published',
      languageMode: 'auto',
    });
  }
  return page;
}

export async function getLandingRegistry() {
  const existingPages = await Page.find({ landingKey: { $exists: true, $ne: null } })
    .select('_id landingKey title slug status updatedAt hero')
    .lean();

  const byKey = new Map(existingPages.map((p) => [p.landingKey, p]));

  return DEFAULT_LANDING_PAGES.map((def) => {
    const existing = byKey.get(def.landingKey) || (LANDING_KEY_ALIASES[def.landingKey] && byKey.get(LANDING_KEY_ALIASES[def.landingKey]));
    return {
      landingKey: def.landingKey,
      category: def.category,
      targetUrl: def.targetUrl,
      defaultTitle: def.title,
      isInitialized: Boolean(existing),
      pageId: existing?._id || null,
      title: existing?.title || def.title,
      slug: existing?.slug || def.slug,
      status: existing?.status || 'not_created',
      updatedAt: existing?.updatedAt || null,
    };
  });
}
