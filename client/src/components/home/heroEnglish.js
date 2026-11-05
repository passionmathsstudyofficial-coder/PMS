// Homepage presentation of the existing Hindi example lessons. No CMS mutation.
export const ENGLISH_LESSONS = {
  euclid: {
    question: "What is the easiest way to remember Euclid's fifth postulate?",
    trick: 'Smaller interior angles = lines meet',
    explanation: 'If the interior angles on the same side of a transversal add up to less than 180° (two right angles), the lines meet on that side when extended:',
    latex: '\\angle 1 + \\angle 2 < 180^\\circ \\implies l \\text{ and } m \\text{ intersect}',
  },
  pythagoras: {
    question: 'What is the basic formula for the Pythagorean theorem?',
    trick: 'Hypotenuse squared = sum of the other two sides squared',
    explanation: 'In a right triangle, the square of the longest side (the hypotenuse) equals the sum of the squares of the other two sides:',
    latex: 'c^2 = a^2 + b^2 \\implies c = \\sqrt{a^2 + b^2}',
  },
  trigo: {
    question: 'What is the fundamental trigonometric identity?',
    trick: 'sin² + cos² = 1',
    explanation: 'For every angle θ, the squares of its sine and cosine add up to 1. The second identity holds wherever tan θ and sec θ are defined:',
    latex: '\\sin^2\\theta + \\cos^2\\theta = 1 \\quad \\text{and} \\quad 1 + \\tan^2\\theta = \\sec^2\\theta',
  },
  calculus: {
    question: 'What is the basic power rule for integration in Class 12?',
    trick: 'Add 1 to the power, then divide by the new power',
    explanation: 'The indefinite integral of x raised to the power n is given by this rule, where n ≠ −1 and C is the constant of integration:',
    latex: '\\int x^n\\, dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)',
  },
};
