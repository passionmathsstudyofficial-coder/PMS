import { RefSelect } from './fields/RefSelect.jsx';
import { refId } from '../lib/resources.js';

const placements = {
  studyClass: ['Class', 'study-classes'],
  studyChapter: ['Chapter', 'study-chapters'],
  studyTopic: ['Topic', 'study-topics'],
  questionCategory: ['Question category', 'question-categories'],
  questionSet: ['Question set', 'question-sets'],
};

function placementParams(key, values, module) {
  if (key === 'studyClass') return { module };
  if (key === 'studyChapter') return { studyClass: refId(values.studyClass) };
  if (key === 'studyTopic') return { studyChapter: refId(values.studyChapter) };
  if (key === 'questionSet') return { questionCategory: refId(values.questionCategory), studyClass: refId(values.studyClass) };
  return {};
}

export function StudyPlacement({ module, keys, values, onChange, required = [], disabled = false }) {
  return keys.map(key => {
    const [label, resource] = placements[key];
    const params = placementParams(key, values, module);
    const pickerDisabled = Object.values(params).some(value => !value);
    if (key === 'questionSet' && values.studyChapter) params.forChapter = refId(values.studyChapter);
    return <RefSelect key={key} label={label} resource={resource} params={params} required={required.includes(key)}
      clearable={!required.includes(key)} disabled={disabled || pickerDisabled}
      value={values[key]} onChange={value => onChange(key, value)} />;
  });
}

