const entry = (en, hi, url) => ({ _id: `study-${en.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, label: { en, hi }, url });
const questions = [
  entry('Previous Year Questions (PYQ)', 'पिछले वर्षों के प्रश्न (PYQ)', '/study-materials/cbse-sample-papers?view=pyq'),
  entry('Sample Papers', 'सैंपल पेपर्स', '/study-materials/cbse-sample-papers'),
  entry('CBSE Extra Questions', 'CBSE अतिरिक्त प्रश्न', '/study-materials/extra-questions'),
  entry('VVI Questions (Board Special)', 'अति महत्वपूर्ण प्रश्न (बोर्ड विशेष)', '/study-materials/important-questions'),
  entry('Maths Syllabus', 'गणित पाठ्यक्रम', '/study-materials/syllabus'),
];
const notes = [
  entry('NCERT Chapter-wise Notes', 'NCERT अध्याय-वार नोट्स', '/study-materials/ncert-notes'),
  entry('All Maths Formula Sheets', 'सभी गणित सूत्र पत्रक', '/study-materials/ncert-notes?view=formulas'),
  entry('RS Aggarwal Formulas & Notes', 'आर.एस. अग्रवाल सूत्र व नोट्स', '/reference-solutions/rs-aggarwal?view=notes'),
  entry('RD Sharma Formulas & Notes', 'आर.डी. शर्मा सूत्र व नोट्स', '/reference-solutions/rd-sharma?view=notes'),
  entry('KC Sinha Formulas & Notes', 'के.सी. सिन्हा सूत्र व नोट्स', '/reference-solutions/kc-sinha?view=notes'),
  entry('VVI Questions & Short Notes', 'अति महत्वपूर्ण प्रश्न व संक्षिप्त नोट्स', '/study-materials/important-questions?view=short-notes'),
];

// Share the same destinations and labels between desktop and mobile navigation.
export function studyNavigationItem(item) {
  const en = (item.label?.en || '').toLowerCase();
  const hi = item.label?.hi || '';
  const defaults = en.includes('important question') || hi.includes('महत्वपूर्ण प्रश्न') ? questions
    : en === 'notes' || hi === 'नोट्स' ? notes : null;
  if (!defaults) return item;
  const configuredChildren = item.children || [];
  const children = defaults.map(child => {
    const configured = configuredChildren.find(existing => existing.label?.en?.toLowerCase() === child.label.en.toLowerCase());
    return { ...child, ...configured, _id: child._id, url: configured?.url === child.url.split('?')[0] ? child.url : configured?.url || child.url, label: child.label };
  });
  children.push(...configuredChildren.filter(existing => !defaults.some(child => child.label.en.toLowerCase() === existing.label?.en?.toLowerCase())));
  return { ...item, type: 'dropdown', children };
}

// Desktop and mobile must resolve empty CMS class menus identically.
export function navigationChildren(item, classes) {
  const children = (item.children || []).filter(child => child.isVisible !== false);
  if (children.length || item.children?.length) return children;
  const en = (item.label?.en || '').toLowerCase();
  const hi = item.label?.hi || '';
  const isMaths = item.type === 'classes' || en.includes('math');
  const isQuestions = en.includes('important question') || hi.includes('महत्वपूर्ण प्रश्न');
  const isNotes = en.includes('note') || hi.includes('नोट्स');
  if (!isMaths && !isQuestions && !isNotes) return children;
  const suffix = isMaths ? '' : isQuestions ? '/important-questions' : '/notes';
  const available = classes?.length ? classes : [12, 11, 10, 9, 8, 7, 6].map(number => ({ number }));
  return [...available].sort((a, b) => b.number - a.number).map(cls => ({
    _id: `maths-class-${cls.number}${suffix}`,
    url: isMaths && cls.url || `/class-${cls.number}/maths${suffix}`,
    label: isMaths ? { en: `Class ${cls.number} Maths`, hi: `कक्षा ${cls.number} गणित` }
      : isQuestions ? { en: `Class ${cls.number} Important Questions`, hi: `कक्षा ${cls.number} महत्वपूर्ण प्रश्न` }
      : { en: `Class ${cls.number} Maths Notes`, hi: `कक्षा ${cls.number} गणित नोट्स` },
  }));
}

export const navigationId = item => `${item.type || 'link'}:${item._id || item.label?.en || item.label?.hi}:${item.url || ''}`;
