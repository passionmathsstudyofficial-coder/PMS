/**
 * Question Classifier and Extractor Utility for Passion Maths Study.
 * Automatically parses combined question-answer rich-text content,
 * extracts marks from various patterns, and classifies questions into:
 * - Very Short Answer (VSA): 1–2 marks
 * - Short Answer: 2–3 marks
 * - Long Answer: 5 marks (or >= 4 marks)
 * - Case Study: Case-based question structure (4–5 marks) detected via explicit indicators.
 */

// Regex patterns to identify case-study structures and explicit indicators
const CASE_STUDY_PATTERNS = [
  /\bcase[\s-_]*study\b/i,
  /\bcase[\s-_]*based\b/i,
  /\bread the following (?:passage|text|case|situation|information)\b/i,
  /\bbased on the above (?:information|context|case|passage)\b/i,
  /\bpassage[\s-_]*based\b/i,
  /\bsection[\s-_]*e\b/i,
  /केस[\s-_]*स्टडी/i,
  /प्रकरण[\s-_]*आधारित/i,
  /गद्यांश[\s-_]*आधारित/i,
  /निम्न(?:लिखित)?\s+(?:गद्यांश|संदर्भ|स्थिति)\s+को\s+पढ़कर/i,
];

// Regex patterns to extract marks from question headers or text
const MARKS_PATTERNS = [
  // [5], [5M], [5 marks], [5 अंक]
  /\[\s*(\d{1,2})\s*(?:m|marks?|अंक)?\s*\]/i,
  // (5 Marks), (5 marks), (5M), (5 अंक)
  /\(\s*(\d{1,2})\s*(?:m|marks?|अंक)\s*\)/i,
  // Marks: 5, Marks - 5, अंक: 5
  /(?:marks?|अंक|maximum marks|total marks)\s*[:=\-]\s*(\d{1,2})\b/i,
  // 1 x 5 = 5, 1 × 5 = 5
  /\b\d{1,2}\s*[×x*]\s*(\d{1,2})\s*=\s*\d{1,2}\b/i,
  // (5) at the very end of line or before question ends
  /\(\s*(\d{1,2})\s*\)\s*$/m,
];

/**
 * Extracts marks from HTML or plain text string.
 * Returns { marks: number | null, confidence: 'high' | 'medium' | 'none' }
 */
export function extractMarksFromText(text) {
  if (!text || typeof text !== 'string') return { marks: null, confidence: 'none' };

  // Strip inner HTML tags for plain text inspection
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();

  for (const pattern of MARKS_PATTERNS) {
    const match = plain.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0 && num <= 20) {
        return { marks: num, confidence: 'high' };
      }
    }
  }

  return { marks: null, confidence: 'none' };
}

/**
 * Checks whether text or HTML represents a case study question.
 */
export function isCaseStudyQuestion(text) {
  if (!text || typeof text !== 'string') return false;
  const plain = text.replace(/<[^>]+>/g, ' ').trim();
  for (const pattern of CASE_STUDY_PATTERNS) {
    if (pattern.test(plain)) return true;
  }
  // Check for presence of multiple sub-questions like (i), (ii), (iii)
  const subQuestions = plain.match(/\((?:i|ii|iii|iv|v|[a-d])\)/gi);
  if (subQuestions && subQuestions.length >= 3 && plain.length > 200) {
    return true;
  }
  return false;
}

/**
 * Automatically detects question type based on marks and structural content.
 * 
 * Rules:
 * - Case Study: structural/explicit indicator detected first (typically 4–5 marks)
 * - Very Short Answer (VSA): 1–2 marks
 * - Short Answer: 2–3 marks
 * - Long Answer: 5 marks (or >= 4 marks)
 */
export function detectQuestionType(text, marks) {
  const isCase = isCaseStudyQuestion(text);
  if (isCase) {
    return {
      questionType: 'case_study',
      confidence: 'high',
      needsReview: false,
    };
  }

  if (typeof marks === 'number' && !isNaN(marks)) {
    if (marks === 1) {
      return { questionType: 'vsa', confidence: 'high', needsReview: false };
    }
    if (marks === 2) {
      return { questionType: 'vsa', confidence: 'high', needsReview: false };
    }
    if (marks === 3) {
      return { questionType: 'short', confidence: 'high', needsReview: false };
    }
    if (marks >= 4) {
      return { questionType: 'long', confidence: 'high', needsReview: false };
    }
  }

  // Fallback if marks could not be extracted
  return {
    questionType: 'short',
    confidence: 'low',
    needsReview: true,
  };
}

/**
 * Parses combined rich-text HTML into classified questions.
 * Handles DOM parsing, question headers, solution boundaries,
 * marks extraction, automatic classification, and respects manual overrides.
 */
export function parseAndClassifyQuestions(html, existingOverrides = []) {
  if (!html || typeof html !== 'string' || !html.trim()) return [];

  const overridesMap = new Map();
  if (Array.isArray(existingOverrides)) {
    existingOverrides.forEach((o) => {
      if (o.questionNumber) {
        overridesMap.set(String(o.questionNumber).trim().toLowerCase(), o);
      }
    });
  }

  if (typeof window === 'undefined') {
    const { marks } = extractMarksFromText(html);
    const classification = detectQuestionType(html, marks);
    return [
      {
        questionNumber: '1',
        marks: marks || 2,
        questionType: classification.questionType,
        questionHtml: html,
        solutionHtml: '',
        needsReview: classification.needsReview,
        confidence: classification.confidence,
      },
    ];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  const children = Array.from(body.children);
  if (children.length === 0) {
    const { marks } = extractMarksFromText(html);
    const classification = detectQuestionType(html, marks);
    return [
      {
        questionNumber: '1',
        marks: marks || 2,
        questionType: classification.questionType,
        questionHtml: html,
        solutionHtml: '',
        needsReview: classification.needsReview,
        confidence: classification.confidence,
      },
    ];
  }

  const isQuestionHeader = (el) => {
    const text = el.textContent?.trim() || '';
    const tag = el.tagName.toLowerCase();
    if (/^h[2-4]$/.test(tag)) {
      if (/^(?:question|q\.?|q\s*\d+|प्रश्न|प्र\.?|problem)\b/i.test(text)) return true;
      if (children.filter((c) => /^h[2-4]$/.test(c.tagName.toLowerCase())).length > 1) {
        return /^(?:question|q\.?|q\s*\d+|प्रश्न|प्र\.?|problem|\d+[\.\)])\b/i.test(text);
      }
    }
    const firstChild = el.firstElementChild;
    if (tag === 'p' && firstChild && (firstChild.tagName.toLowerCase() === 'strong' || firstChild.tagName.toLowerCase() === 'b')) {
      const strongText = firstChild.textContent?.trim() || '';
      if (/^(?:question|q\.?|q\s*\d+|प्रश्न|प्र\.?|problem|\d+[\.\)])\b/i.test(strongText)) return true;
    }
    return false;
  };

  const isSolutionHeader = (el) => {
    const text = el.textContent?.trim() || '';
    const tag = el.tagName.toLowerCase();
    if (/^h[3-6]$/.test(tag)) {
      if (/^(?:solution|answer|ans\.?|marking scheme|हल|उत्तर|स्पष्टीकरण)\b/i.test(text)) return true;
    }
    const firstChild = el.firstElementChild;
    if ((tag === 'p' || tag === 'div') && firstChild && (firstChild.tagName.toLowerCase() === 'strong' || firstChild.tagName.toLowerCase() === 'b')) {
      const strongText = firstChild.textContent?.trim() || '';
      if (/^(?:solution|answer|ans\.?|marking scheme|हल|उत्तर|स्पष्टीकरण)\b/i.test(strongText)) return true;
    }
    return false;
  };

  const hasAnyQuestionHeaders = children.some(isQuestionHeader);

  // Group elements into distinct questions
  const groups = [];
  let current = null;
  let inSolution = false;

  if (!hasAnyQuestionHeaders) {
    const solutionIdx = children.findIndex(isSolutionHeader);
    if (solutionIdx !== -1) {
      const qElements = children.slice(0, solutionIdx).map((c) => c.outerHTML).join('');
      const sElements = children.slice(solutionIdx).map((c) => c.outerHTML).join('');
      groups.push({
        questionNumber: '1',
        headerHtml: '',
        questionElements: [qElements || html],
        solutionElements: [sElements],
      });
    } else {
      groups.push({
        questionNumber: '1',
        headerHtml: '',
        questionElements: [html],
        solutionElements: [],
      });
    }
  } else {
    for (const child of children) {
      if (isQuestionHeader(child)) {
        if (current) groups.push(current);
        const rawText = child.textContent?.trim() || '';
        const numMatch = rawText.match(/(?:question|q\.?|प्रश्न|प्र\.?|problem|\b)\s*([0-9]+[a-z]?)/i);
        const questionNumber = numMatch ? numMatch[1] : String(groups.length + 1);

        current = {
          questionNumber,
          headerHtml: child.outerHTML,
          questionElements: [],
          solutionElements: [],
        };
        inSolution = false;
      } else if (current && isSolutionHeader(child)) {
        inSolution = true;
        current.solutionElements.push(child.outerHTML);
      } else if (current) {
        if (inSolution) {
          current.solutionElements.push(child.outerHTML);
        } else {
          current.questionElements.push(child.outerHTML);
        }
      } else {
        if (!current) {
          current = {
            questionNumber: '1',
            headerHtml: '',
            questionElements: [child.outerHTML],
            solutionElements: [],
          };
        } else {
          current.questionElements.push(child.outerHTML);
        }
      }
    }
    if (current) groups.push(current);
  }

  return groups.map((g, idx) => {
    let qHtml = g.questionElements.join('');
    if (g.headerHtml) {
      qHtml = g.headerHtml + qHtml;
    }
    const solHtml = g.solutionElements.join('');
    const fullText = (qHtml + ' ' + solHtml).trim();
    const qNum = g.questionNumber || String(idx + 1);

    // Check existing manual override first
    const override = overridesMap.get(qNum.toLowerCase());

    const { marks: extractedMarks, confidence: marksConfidence } = extractMarksFromText(fullText);
    const classification = detectQuestionType(fullText, extractedMarks);

    const finalMarks = override && typeof override.marks === 'number'
      ? override.marks
      : (extractedMarks || 2);

    const finalType = override && override.questionType
      ? override.questionType
      : classification.questionType;

    const needsReview = override && override.needsReview !== undefined
      ? override.needsReview
      : classification.needsReview || marksConfidence === 'none';

    return {
      questionNumber: qNum,
      marks: finalMarks,
      questionType: finalType,
      questionHtml: qHtml || g.headerHtml,
      solutionHtml: solHtml,
      needsReview,
      confidence: override ? 'manual' : classification.confidence,
    };
  });
}

/**
 * Question Type Badge Config for UI display
 */
export const QUESTION_TYPES = [
  { value: 'all', label: { en: 'All Question Types', hi: 'सभी प्रश्न प्रकार' }, marksLabel: '' },
  { value: 'vsa', label: { en: 'Very Short Answer (VSA)', hi: 'अति लघु उत्तरीय (VSA)' }, marksLabel: '1–2 Marks' },
  { value: 'short', label: { en: 'Short Answer (SA)', hi: 'लघु उत्तरीय (SA)' }, marksLabel: '2–3 Marks' },
  { value: 'long', label: { en: 'Long Answer (LA)', hi: 'दीर्घ उत्तरीय (LA)' }, marksLabel: '5 Marks' },
  { value: 'case_study', label: { en: 'Case Study', hi: 'केस स्टडी' }, marksLabel: '4–5 Marks' },
];

/**
 * Returns human-readable label and style for question type badges
 */
export function getQuestionTypeBadge(type, marks) {
  const norm = String(type || '').toLowerCase();
  if (norm === 'case_study' || norm === 'case_based') {
    return {
      label: 'Case Study',
      marksText: marks ? `${marks}M` : '4–5M',
      color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    };
  }
  if (norm === 'vsa' || marks === 1 || marks === 2) {
    return {
      label: 'Very Short Answer (VSA)',
      marksText: marks ? `${marks}M` : '1–2M',
      color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    };
  }
  if (norm === 'short' || norm === 'short_answer' || marks === 3) {
    return {
      label: 'Short Answer',
      marksText: marks ? `${marks}M` : '2–3M',
      color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    };
  }
  if (norm === 'long' || norm === 'long_answer' || (marks && marks >= 4)) {
    return {
      label: 'Long Answer',
      marksText: marks ? `${marks}M` : '5M',
      color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    };
  }
  return {
    label: 'Important Question',
    marksText: marks ? `${marks}M` : '',
    color: 'bg-brand/10 text-brand border-brand/20',
  };
}
