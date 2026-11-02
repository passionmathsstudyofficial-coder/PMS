import { isLanguage, projectLanguage } from '../../../shared/localization.js';
import { ApiError } from './error.js';
import { localizePublicContent } from '../services/languageContent.js';
export function requestLanguage(req) {
  const language = req.query.lang ?? (isLanguage(req.cookies?.['pms-lang']) ? req.cookies['pms-lang'] : 'en');
  if (!isLanguage(language)) throw new ApiError(400, 'Language must be en or hi');
  return language;
}
export function languageResponse(req,res,next) {
  try {
    req.language = requestLanguage(req);
    if (req.query.lang === undefined) res.vary('Cookie');
    if (req.method === 'GET') {
      const json = res.json.bind(res);
      res.json = body => { res.set('Content-Language',req.language); return json(localizePublicContent(body,req.language)); };
    }
    next();
  } catch(error) { next(error); }
}
