import { uiText } from '@/lib/uiLanguage.js';
import { useUiLanguage } from '@/lib/useUiTranslation.jsx';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ErrorState, NotFoundContent } from './States.jsx';

export default function RouteError() {
  useUiLanguage();
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundContent />;
  return (
    <div className="container-page py-16">
      <ErrorState error={error} onRetry={() => window.location.reload()} title={uiText("This page failed to load")} />
    </div>
  );
}
