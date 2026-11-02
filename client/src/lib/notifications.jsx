import { toast as sonnerToast } from 'sonner';
import { UiText, useUiLanguage } from './useUiTranslation.jsx';
import { presentApiError } from './apiErrorLanguage.js';
function UiError({error,fallback}) { useUiLanguage(); return presentApiError(error,fallback); }
export const toast = {
  success: (text, options) => sonnerToast.success(<UiText text={text} />, options),
  error: (text, options) => sonnerToast.error(<UiText text={text} />, options),
  info: (text, options) => sonnerToast.info(<UiText text={text} />, options),
  warning: (text, options) => sonnerToast.warning(<UiText text={text} />, options),
  apiError: (error, fallback, options) => sonnerToast.error(<UiError error={error} fallback={fallback} />, options),
  dismiss: (...args) => sonnerToast.dismiss(...args),
};
