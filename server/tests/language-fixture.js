export async function createLanguageFixture(owner) {
  const create = async (resource,body) => {
    const response = await owner.post('/api/'+resource).send({status:'published',...body});
    if(response.status!==201) throw new Error(resource+': '+JSON.stringify(response.body));
    return response.body;
  };
  const subjects=[];
  for(const [slug,en,hi] of [['maths','Mathematics','गणित'],['science','Science','विज्ञान']]) subjects.push(await create('subjects',{slug,name:{en,hi},isPublic:true}));
  const classes=[],chapters=[];
  for(let number=6;number<=12;number++){
    const cls=await create('classes',{number,name:{en:`Class ${number}`,hi:`कक्षा ${number}`},subjects:subjects.map(subject=>subject._id)});classes.push(cls);
    for(const subject of subjects) chapters.push(await create('chapters',{class:cls._id,subject:subject._id,number:1,title:{en:'English chapter',hi:'हिंदी अध्याय'},introduction:{en:'<p>English lesson only.</p>',hi:'<p>केवल हिंदी पाठ।</p>'},shortDescription:{en:'English description',hi:'हिंदी विवरण'}}));
  }
  const chapter=chapters.find(item=>String(item.class?._id||item.class)===String(classes[4]._id)&&String(item.subject?._id||item.subject)===String(subjects[0]._id)) || chapters[8];
  const cls=classes[4],subject=subjects[0];
  const exercise=await create('exercises',{chapter:chapter._id,number:'1.1',title:{en:'English exercise',hi:'हिंदी प्रश्नावली'},description:{en:'<p><span style="color:#2563eb">English instructions</span> $x^2$</p>',hi:'<p><span style="color:#dc2626">हिंदी निर्देश</span> $x^2$</p>'}});
  const question=await create('questions',{exercise:exercise._id,number:'1',text:{en:'<p>English question $\\frac{1}{2}$</p>',hi:'<p>हिंदी प्रश्न $\\frac{1}{2}$</p>'},answer:{en:'<p>English answer $x=2$</p>',hi:'<p>हिंदी उत्तर $x=2$</p>'},solution:{blocks:[{type:'text',content:{en:'<p>English solution $x=2$</p>',hi:'<p>हिंदी हल $x=2$</p>'}},{type:'formula',latex:'\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}'}]}});
  const topic=await create('topics',{chapter:chapter._id,class:cls._id,subject:subject._id,number:1,slug:'numbers',title:{en:'Numbers',hi:'संख्याएँ'},notes:{en:'<p>English notes</p>',hi:'<p>हिंदी नोट्स</p>'}});
  const note=await create('notes',{class:cls._id,subject:subject._id,chapter:chapter._id,slug:'revision',title:{en:'Revision',hi:'पुनरीक्षण'},summary:{en:'English revision summary',hi:'हिंदी पुनरीक्षण सारांश'},content:{en:'<p>English revision $x^2$</p>',hi:'<p>हिंदी पुनरीक्षण $x^2$</p>'}});
  const page=await create('pages',{slug:'language-proof',title:{en:'English page',hi:'हिंदी पृष्ठ'},content:{en:'<p>English page body</p>',hi:'<p>हिंदी पृष्ठ की सामग्री</p>'}});
  const missing=await create('pages',{slug:'missing-english',title:{hi:'केवल हिंदी'},content:{hi:'<p>केवल हिंदी सामग्री</p>'}});
  return {subjects,classes,chapters,chapter,exercise,question,topic,note,page,missing,create};
}
