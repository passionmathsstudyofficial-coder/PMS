const entry = (en, hi, url) => ({ label: { en, hi }, url });
const questions = [
  entry('Previous Year Questions (PYQ)', 'पिछले वर्षों के प्रश्न (PYQ)', '/study-materials/cbse-sample-papers'),
  entry('Sample Papers', 'सैंपल पेपर्स', '/study-materials/cbse-sample-papers'),
  entry('CBSE Extra Questions', 'CBSE अतिरिक्त प्रश्न', '/study-materials/extra-questions'),
  entry('VVI Questions (Board Special)', 'अति महत्वपूर्ण प्रश्न (बोर्ड विशेष)', '/study-materials/important-questions'),
  entry('Maths Syllabus', 'गणित पाठ्यक्रम', '/study-materials/syllabus'),
];
const notes = [
  entry('NCERT Chapter-wise Notes', 'NCERT अध्याय-वार नोट्स', '/study-materials/ncert-notes'),
  entry('All Maths Formula Sheets', 'सभी गणित सूत्र पत्रक', '/study-materials/ncert-notes'),
  entry('RS Aggarwal Formulas & Notes', 'आर.एस. अग्रवाल सूत्र व नोट्स', '/reference-solutions/rs-aggarwal'),
  entry('RD Sharma Formulas & Notes', 'आर.डी. शर्मा सूत्र व नोट्स', '/reference-solutions/rd-sharma'),
  entry('KC Sinha Formulas & Notes', 'के.सी. सिन्हा सूत्र व नोट्स', '/reference-solutions/kc-sinha'),
  entry('VVI Questions & Short Notes', 'अति महत्वपूर्ण प्रश्न व संक्षिप्त नोट्स', '/study-materials/important-questions'),
];

// Share the same destinations and labels between desktop and mobile navigation.
export function studyNavigationItem(item) {
  const en = (item.label?.en || '').toLowerCase();
  const hi = item.label?.hi || '';
  const defaults = en.includes('important question') || hi.includes('महत्वपूर्ण प्रश्न') ? questions
    : en === 'notes' || hi === 'नोट्स' ? notes : null;
  if (!defaults) return item;
  return { ...item, type: 'dropdown', children: defaults.map(child => {
    const configured = (item.children || []).find(existing => existing.label?.en?.toLowerCase() === child.label.en.toLowerCase() && existing.url && existing.isVisible !== false);
    return { ...child, ...configured, label: child.label };
  }) };
}
