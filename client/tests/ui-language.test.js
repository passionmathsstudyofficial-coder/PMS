import {test} from 'node:test';
import assert from 'node:assert/strict';
import {translateUi,setUiLanguage,getUiLanguage,subscribeUiLanguage} from '../src/lib/uiLanguage.js';
test('nested UI keys, Hindi labels, English fallback and unknown keys are safe',()=>{
 assert.equal(translateUi('navigation.home','en'),'Home');assert.equal(translateUi('navigation.home','hi'),'होम');
 assert.equal(translateUi('A missing sentence','hi'),'A missing sentence');
 assert.equal(translateUi('unknown.internalKey','hi'),'अनुपलब्ध');
 assert.equal(translateUi('Text color','hi'),'पाठ का रंग');
});
test('only English and Hindi are accepted and every subscriber is notified',()=>{
 let notifications=0;const unsubscribe=subscribeUiLanguage(()=>notifications++);
 setUiLanguage('hi');assert.equal(getUiLanguage(),'hi');setUiLanguage('mixed');assert.equal(getUiLanguage(),'en');
 assert.equal(notifications,2);unsubscribe();
});
