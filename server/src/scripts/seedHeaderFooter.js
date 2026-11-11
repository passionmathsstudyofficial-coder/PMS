import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { Navigation, SiteSettings, Book, ClassLevel, Subject } from '../models/index.js';

async function seed() {
  console.log('[seedHeaderFooter] Connecting to DB...');
  await connectDB(env.MONGODB_URI);

  const c10 = await ClassLevel.findOne({ number: 10 });
  const mathSub = await Subject.findOne({ slug: 'maths' });

  // 1. Ensure Reference Books exist in DB with availableClasses [6, 7, 8, 9, 10, 11, 12]
  const booksToUpsert = [
    {
      slug: 'rs-aggarwal',
      title: { hi: 'आर.एस. अग्रवाल समाधान', en: 'R.S. Aggarwal' },
      author: 'R.S. Aggarwal',
      publisher: 'Bharati Bhawan',
      category: 'reference',
      hasSolutions: true,
      availableClasses: [6, 7, 8, 9, 10, 11, 12],
      description: {
        hi: 'सीबीएसई कक्षा 6 से 12 के लिए आर.एस. अग्रवाल गणित के विस्तृत चरणबद्ध हल।',
        en: 'Complete chapter-wise and exercise-wise step-by-step solutions for RS Aggarwal Mathematics Classes 6 to 12.',
        mixed: 'Complete RS Aggarwal Mathematics solutions with all question steps, formulas and proofs.',
      },
      sortOrder: 1,
      isVisible: true,
      status: 'published',
    },
    {
      slug: 'rd-sharma',
      title: { hi: 'आर.डी. शर्मा समाधान', en: 'R.D. Sharma' },
      author: 'Dr. R.D. Sharma',
      publisher: 'Dhanpat Rai Publications',
      category: 'reference',
      hasSolutions: true,
      availableClasses: [6, 7, 8, 9, 10, 11, 12],
      description: {
        hi: 'सीबीएसई और प्रतियोगी परीक्षाओं के लिए आर.डी. शर्मा गणित के संपूर्ण हल।',
        en: 'Comprehensive RD Sharma Mathematics solutions with all question steps, formulas, and proofs.',
        mixed: 'Comprehensive RD Sharma Mathematics solutions with all question steps, formulas, and proofs.',
      },
      sortOrder: 2,
      isVisible: true,
      status: 'published',
    },
    {
      slug: 'kc-sinha-maths',
      title: { hi: 'के. सी. सिन्हा गणित', en: 'K.C. Sinha Mathematics' },
      author: 'Prof. K.C. Sinha',
      publisher: 'Student Friends / Bharti Bhawan',
      category: 'reference',
      hasSolutions: true,
      availableClasses: [6, 7, 8, 9, 10, 11, 12],
      description: {
        hi: 'कक्षा 6 से 12 के लिए प्रो. के.सी. सिन्हा गणित के संपूर्ण अध्याय-वार और चरणबद्ध समाधान।',
        en: 'Complete chapter-wise and exercise-wise step-by-step solutions for Prof. K.C. Sinha Mathematics Classes 6 to 12.',
        mixed: 'Complete K.C. Sinha Mathematics solutions with all question steps, formulas and proofs.',
      },
      sortOrder: 3,
      isVisible: true,
      status: 'published',
    },
    {
      slug: 'ml-aggarwal',
      title: { hi: 'एम.एल. अग्रवाल समाधान', en: 'M.L. Aggarwal' },
      author: 'M.L. Aggarwal',
      publisher: 'Arya / Avichal Publishing Company',
      category: 'reference',
      hasSolutions: true,
      availableClasses: [6, 7, 8, 9, 10, 11, 12],
      description: {
        hi: 'कक्षा 6 से 12 के विद्यार्थियों के लिए एम.एल. अग्रवाल गणित के संपूर्ण और विस्तृत चरणबद्ध हल।',
        en: 'Complete chapter-wise and exercise-wise step-by-step solutions for M.L. Aggarwal Mathematics Classes 6 to 12.',
        mixed: 'Complete ML Aggarwal Mathematics solutions with all question steps, formulas and proofs.',
      },
      sortOrder: 4,
      isVisible: true,
      status: 'published',
    },
  ];

  for (const b of booksToUpsert) {
    const existing = await Book.findOne({ slug: b.slug });
    if (existing) {
      existing.title = b.title;
      existing.author = b.author;
      existing.publisher = b.publisher;
      existing.category = b.category;
      existing.hasSolutions = b.hasSolutions;
      existing.availableClasses = b.availableClasses;
      existing.description = b.description;
      existing.sortOrder = b.sortOrder;
      existing.isVisible = true;
      existing.status = 'published';
      await existing.save();
      console.log(`[seedHeaderFooter] Updated Book: ${b.slug}`);
    } else {
      await Book.create({
        ...b,
        class: c10?._id,
        subject: mathSub?._id,
      });
      console.log(`[seedHeaderFooter] Created Book: ${b.slug}`);
    }
  }

  // 2. Update Header Navigation with exactly 6 items:
  // PMS Logo | Home | Mathematics ⌄ | Reference Books ⌄ | Important Questions ⌄ | Notes ⌄ | About Us
  const headerItems = [
    {
      label: { hi: 'होम', en: 'Home' },
      url: '/',
      type: 'link',
      newTab: false,
      isVisible: true,
      children: [],
    },
    {
      label: { hi: 'NCERT गणित', en: 'NCERT Mathematics' },
      url: '',
      type: 'classes',
      newTab: false,
      isVisible: true,
      children: [
        { label: { hi: 'NCERT कक्षा 12 गणित', en: 'NCERT Class 12 Mathematics' }, url: '/class-12/maths', newTab: false, isVisible: true },
        { label: { hi: 'NCERT कक्षा 11 गणित', en: 'NCERT Class 11 Mathematics' }, url: '/class-11/maths', newTab: false, isVisible: true },
        { label: { hi: 'NCERT कक्षा 10 गणित', en: 'NCERT Class 10 Mathematics' }, url: '/class-10/maths', newTab: false, isVisible: true },
        { label: { hi: 'NCERT कक्षा 9 गणित', en: 'NCERT Class 9 Mathematics' }, url: '/class-9/maths', newTab: false, isVisible: true },
        { label: { hi: 'NCERT कक्षा 8 गणित', en: 'NCERT Class 8 Mathematics' }, url: '/class-8/maths', newTab: false, isVisible: true },
        { label: { hi: 'NCERT कक्षा 7 गणित', en: 'NCERT Class 7 Mathematics' }, url: '/class-7/maths', newTab: false, isVisible: true },
        { label: { hi: 'NCERT कक्षा 6 गणित', en: 'NCERT Class 6 Mathematics' }, url: '/class-6/maths', newTab: false, isVisible: true },
      ],
    },
    {
      label: { hi: 'संदर्भ पुस्तकें', en: 'Reference Books' },
      url: '/reference-solutions',
      type: 'reference-books',
      newTab: false,
      isVisible: true,
      children: [],
    },
    {
      label: { hi: 'महत्वपूर्ण प्रश्न', en: 'Important Questions' },
      url: '/study-materials/previous-year-questions',
      type: 'dropdown',
      newTab: false,
      isVisible: true,
      children: [
        { label: { hi: 'पिछले वर्षों के प्रश्न (PYQ)', en: 'Previous Year Questions (PYQ)' }, url: '/study-materials/previous-year-questions', newTab: false, isVisible: true },
        { label: { hi: 'CBSE सैंपल पेपर्स', en: 'Sample Papers' }, url: '/study-materials/cbse-sample-papers', newTab: false, isVisible: true },
        { label: { hi: 'CBSE अतिरिक्त प्रश्न', en: 'CBSE Extra Questions' }, url: '/study-materials/cbse-extra-questions', newTab: false, isVisible: true },
        { label: { hi: 'अति महत्वपूर्ण प्रश्न (बोर्ड विशेष)', en: 'VVI Questions (Board Special)' }, url: '/study-materials/vvi-questions', newTab: false, isVisible: true },
        { label: { hi: 'गणित पाठ्यक्रम', en: 'Maths Syllabus' }, url: '/study-materials/maths-syllabus', newTab: false, isVisible: true },
      ],
    },
    {
      label: { hi: 'नोट्स', en: 'Notes' },
      url: '/notes/ncert-chapter-wise-notes',
      type: 'dropdown',
      newTab: false,
      isVisible: true,
      children: [
        { label: { hi: 'NCERT अध्याय-वार नोट्स', en: 'NCERT Chapter-wise Notes' }, url: '/notes/ncert-chapter-wise-notes', newTab: false, isVisible: true },
        { label: { hi: 'सभी गणित सूत्र पत्रक', en: 'All Maths Formula Sheets' }, url: '/notes/maths-formula-sheets', newTab: false, isVisible: true },
        { label: { hi: 'आर.एस. अग्रवाल सूत्र व नोट्स', en: 'RS Aggarwal Formulas & Notes' }, url: '/notes/rs-aggarwal-formulas-notes', newTab: false, isVisible: true },
        { label: { hi: 'आर.डी. शर्मा सूत्र व नोट्स', en: 'RD Sharma Formulas & Notes' }, url: '/notes/rd-sharma-formulas-notes', newTab: false, isVisible: true },
        { label: { hi: 'के.सी. सिन्हा सूत्र व नोट्स', en: 'KC Sinha Formulas & Notes' }, url: '/notes/kc-sinha-formulas-notes', newTab: false, isVisible: true },
        { label: { hi: 'अति महत्वपूर्ण प्रश्न व संक्षिप्त नोट्स', en: 'VVI Questions & Short Notes' }, url: '/notes/vvi-questions-short-notes', newTab: false, isVisible: true },
      ],
    },
    {
      label: { hi: 'हमारे बारे में', en: 'About Us' },
      url: '/about-us',
      type: 'link',
      newTab: false,
      isVisible: true,
      children: [],
    },
  ];

  await Navigation.findOneAndUpdate(
    { key: 'header' },
    { $set: { key: 'header', items: headerItems } },
    { upsert: true, new: true },
  );
  console.log('[seedHeaderFooter] Seeded clean 6-item single-row Header Navigation');

  // 3. Update Footer Navigation with 4 clean columns (RS Aggarwal, RD Sharma, ML Aggarwal, Important Links)
  const footerColumns = [
    {
      label: { hi: 'R.S. Aggarwal Solutions', en: 'R.S. Aggarwal Solutions' },
      url: '',
      type: 'column',
      newTab: false,
      isVisible: true,
      children: [
        { label: { hi: 'R.S. Aggarwal Class 6', en: 'R.S. Aggarwal Class 6' }, url: '/reference-solutions/rs-aggarwal/class-6', newTab: false, isVisible: true },
        { label: { hi: 'R.S. Aggarwal Class 7', en: 'R.S. Aggarwal Class 7' }, url: '/reference-solutions/rs-aggarwal/class-7', newTab: false, isVisible: true },
        { label: { hi: 'R.S. Aggarwal Class 8', en: 'R.S. Aggarwal Class 8' }, url: '/reference-solutions/rs-aggarwal/class-8', newTab: false, isVisible: true },
        { label: { hi: 'R.S. Aggarwal Class 9', en: 'R.S. Aggarwal Class 9' }, url: '/reference-solutions/rs-aggarwal/class-9', newTab: false, isVisible: true },
        { label: { hi: 'R.S. Aggarwal Class 10', en: 'R.S. Aggarwal Class 10' }, url: '/reference-solutions/rs-aggarwal/class-10', newTab: false, isVisible: true },
        { label: { hi: 'R.S. Aggarwal Class 11', en: 'R.S. Aggarwal Class 11' }, url: '/reference-solutions/rs-aggarwal/class-11', newTab: false, isVisible: true },
        { label: { hi: 'R.S. Aggarwal Class 12', en: 'R.S. Aggarwal Class 12' }, url: '/reference-solutions/rs-aggarwal/class-12', newTab: false, isVisible: true },
      ],
    },
    {
      label: { hi: 'R.D. Sharma Solutions', en: 'R.D. Sharma Solutions' },
      url: '',
      type: 'column',
      newTab: false,
      isVisible: true,
      children: [
        { label: { hi: 'R.D. Sharma Class 6', en: 'R.D. Sharma Class 6' }, url: '/reference-solutions/rd-sharma/class-6', newTab: false, isVisible: true },
        { label: { hi: 'R.D. Sharma Class 7', en: 'R.D. Sharma Class 7' }, url: '/reference-solutions/rd-sharma/class-7', newTab: false, isVisible: true },
        { label: { hi: 'R.D. Sharma Class 8', en: 'R.D. Sharma Class 8' }, url: '/reference-solutions/rd-sharma/class-8', newTab: false, isVisible: true },
        { label: { hi: 'R.D. Sharma Class 9', en: 'R.D. Sharma Class 9' }, url: '/reference-solutions/rd-sharma/class-9', newTab: false, isVisible: true },
        { label: { hi: 'R.D. Sharma Class 10', en: 'R.D. Sharma Class 10' }, url: '/reference-solutions/rd-sharma/class-10', newTab: false, isVisible: true },
        { label: { hi: 'R.D. Sharma Class 11', en: 'R.D. Sharma Class 11' }, url: '/reference-solutions/rd-sharma/class-11', newTab: false, isVisible: true },
        { label: { hi: 'R.D. Sharma Class 12', en: 'R.D. Sharma Class 12' }, url: '/reference-solutions/rd-sharma/class-12', newTab: false, isVisible: true },
      ],
    },
    {
      label: { hi: 'के. सी. सिन्हा गणित', en: 'K.C. Sinha Mathematics Solutions' },
      url: '',
      type: 'column',
      newTab: false,
      isVisible: true,
      children: [
        { label: { hi: 'के. सी. सिन्हा Class 6', en: 'K.C. Sinha Mathematics Class 6' }, url: '/reference-solutions/kc-sinha-maths/class-6', newTab: false, isVisible: true },
        { label: { hi: 'के. सी. सिन्हा Class 7', en: 'K.C. Sinha Mathematics Class 7' }, url: '/reference-solutions/kc-sinha-maths/class-7', newTab: false, isVisible: true },
        { label: { hi: 'के. सी. सिन्हा Class 8', en: 'K.C. Sinha Mathematics Class 8' }, url: '/reference-solutions/kc-sinha-maths/class-8', newTab: false, isVisible: true },
        { label: { hi: 'के. सी. सिन्हा Class 9', en: 'K.C. Sinha Mathematics Class 9' }, url: '/reference-solutions/kc-sinha-maths/class-9', newTab: false, isVisible: true },
        { label: { hi: 'के. सी. सिन्हा Class 10', en: 'K.C. Sinha Mathematics Class 10' }, url: '/reference-solutions/kc-sinha-maths/class-10', newTab: false, isVisible: true },
        { label: { hi: 'के. सी. सिन्हा Class 11', en: 'K.C. Sinha Mathematics Class 11' }, url: '/reference-solutions/kc-sinha-maths/class-11', newTab: false, isVisible: true },
        { label: { hi: 'के. सी. सिन्हा Class 12', en: 'K.C. Sinha Mathematics Class 12' }, url: '/reference-solutions/kc-sinha-maths/class-12', newTab: false, isVisible: true },
      ],
    },
    {
      label: { hi: 'M.L. Aggarwal Solutions', en: 'M.L. Aggarwal Solutions' },
      url: '',
      type: 'column',
      newTab: false,
      isVisible: true,
      children: [
        { label: { hi: 'M.L. Aggarwal Class 6', en: 'M.L. Aggarwal Class 6' }, url: '/reference-solutions/ml-aggarwal/class-6', newTab: false, isVisible: true },
        { label: { hi: 'M.L. Aggarwal Class 7', en: 'M.L. Aggarwal Class 7' }, url: '/reference-solutions/ml-aggarwal/class-7', newTab: false, isVisible: true },
        { label: { hi: 'M.L. Aggarwal Class 8', en: 'M.L. Aggarwal Class 8' }, url: '/reference-solutions/ml-aggarwal/class-8', newTab: false, isVisible: true },
        { label: { hi: 'M.L. Aggarwal Class 9', en: 'M.L. Aggarwal Class 9' }, url: '/reference-solutions/ml-aggarwal/class-9', newTab: false, isVisible: true },
        { label: { hi: 'M.L. Aggarwal Class 10', en: 'M.L. Aggarwal Class 10' }, url: '/reference-solutions/ml-aggarwal/class-10', newTab: false, isVisible: true },
        { label: { hi: 'M.L. Aggarwal Class 11', en: 'M.L. Aggarwal Class 11' }, url: '/reference-solutions/ml-aggarwal/class-11', newTab: false, isVisible: true },
        { label: { hi: 'M.L. Aggarwal Class 12', en: 'M.L. Aggarwal Class 12' }, url: '/reference-solutions/ml-aggarwal/class-12', newTab: false, isVisible: true },
      ],
    },
    {
      label: { hi: 'Important Links', en: 'Important Links' },
      url: '',
      type: 'column',
      newTab: false,
      isVisible: true,
      children: [
        { label: { hi: 'Home', en: 'Home' }, url: '/', newTab: false, isVisible: true },
        { label: { hi: 'Mathematics', en: 'Mathematics' }, url: '/#classes', newTab: false, isVisible: true },
        { label: { hi: 'Search', en: 'Search' }, url: '/search', newTab: false, isVisible: true },
        { label: { hi: 'About Us', en: 'About Us' }, url: '/about-us', newTab: false, isVisible: true },
        { label: { hi: 'Contact', en: 'Contact' }, url: '/contact', newTab: false, isVisible: true },
        { label: { hi: 'Privacy Policy', en: 'Privacy Policy' }, url: '/privacy-policy', newTab: false, isVisible: true },
        { label: { hi: 'Terms & Conditions', en: 'Terms & Conditions' }, url: '/terms-and-conditions', newTab: false, isVisible: true },
      ],
    },
  ];

  await Navigation.findOneAndUpdate(
    { key: 'footer' },
    { $set: { key: 'footer', items: footerColumns } },
    { upsert: true, new: true },
  );
  console.log('[seedHeaderFooter] Seeded clean 5-column Footer Navigation');

  // 4. Update SiteSettings with sponsoredBar
  const siteSettings = await SiteSettings.findOne({ key: 'site' });
  if (siteSettings) {
    siteSettings.sponsoredBar = {
      enabled: true,
      badge: {
        hi: 'प्रायोजित संसाधन',
        en: 'Sponsored Resource',
        mixed: '',
      },
      text: {
        hi: '🎯 IIT-JEE फाउंडेशन & NTSE 2026: गणित टेस्ट सीरीज लाइव उपलब्ध',
        en: '🎯 IIT-JEE Foundation & NTSE 2026: Mathematics Test Series Live',
        mixed: '',
      },
      linkLabel: {
        hi: 'अन्वेषण करें →',
        en: 'Explore Now →',
        mixed: '',
      },
      linkUrl: '/#classes',
      isExternal: false,
    };
    await siteSettings.save();
    console.log('[seedHeaderFooter] Seeded SiteSettings sponsoredBar');
  }

  console.log('[seedHeaderFooter] Migration complete!');
  await disconnectDB();
}

seed().catch((err) => {
  console.error('[seedHeaderFooter] Failed:', err);
  process.exit(1);
});
