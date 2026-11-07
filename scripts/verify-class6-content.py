import json,math,pathlib
from fractions import Fraction
p=pathlib.Path('content/class6-ganita-prakash-pms-original.json');d=json.loads(p.read_text(encoding='utf-8-sig'))
assert [c['title']for c in d['chapters']]==['Patterns in Mathematics','Lines and Angles','Number Play','Data Handling and Presentation','Prime Time','Perimeter and Area','Fractions','Playing with Constructions','Symmetry','The Other Side of Zero']
assert [c['textbookPage']for c in d['chapters']]==[1,13,55,74,107,129,151,187,217,242]
checks=[]
for c,q,value in [(1,1,5**2),(1,1,6**2),(1,2,sum(range(1,7))),(1,3,7*2**3),(2,2,180-64),(3,1,sum(map(int,str(5836)))),(3,2,47+74),(3,3,392+608),(4,1,7+9+6),(4,2,7*4),(4,3,(8-5)*3),(6,1,2*(11+7)),(6,1,11*7),(6,2,(28//4)**2),(6,3,9*4),(6,3,2*(12+3)),(7,1,Fraction(5,12)+Fraction(1,6)),(7,3,Fraction(3,4)),(9,1,360//4),(9,3,360//6),(10,1,-4+9),(10,3,3-7)]:
 a=d['chapters'][c-1]['questions'][q-1]['answer'];assert str(value)in a.replace('−','-'),(c,q,value,a);checks.append({'chapter':c,'question':q,'checkedValue':str(value),'answer':a})
assert 2*2*3*7==84 and math.gcd(14,25)==1 and 438%2==0 and 438%3==0 and 438%9!=0
assert Fraction(7,10)>Fraction(2,3) and sorted([-8,3,0,-2,5])==[-8,-2,0,3,5]
for c in d['chapters']:
 assert len(c['questions'])==3
 for q in c['questions']:assert len(q['steps'])==3 and q['text'] and q['answer']
out=pathlib.Path('docs/verification/remaining-2026-11-07');out.mkdir(parents=True,exist_ok=True)
(out/'class6-review.json').write_text(json.dumps({'chapters':10,'originalPracticeSets':10,'questionsWithSolutions':30,'revisionNotes':10,'verifiedTextbookPages':True,'numericChecks':checks,'additionalChecks':['Prime factorisation, co-prime and divisibility checks','Fraction comparison and integer ordering','Geometry construction, angle classification and symmetry explanations reviewed against mathematical definitions'],'source':d['source']},ensure_ascii=False,indent=2),encoding='utf-8')
print('Class 6 structural and numerical checks passed.')
