import { useEffect, useState } from 'react';
import { parseTab, type AppTab } from './tab-registry';
const read = () => parseTab(new URLSearchParams(location.search).get('tab'));
function url(tab: AppTab) {
  const u = new URL(location.href);
  u.searchParams.set('tab', tab);
  return u;
}
export function useQueryTab() {
  const [tab, setState] = useState(read);
  useEffect(() => {
    const current = new URLSearchParams(location.search).get('tab');
    if (current !== tab) history.replaceState(null, '', url(tab));
    const f = () => setState(read());
    addEventListener('popstate', f);
    return () => removeEventListener('popstate', f);
  }, []);
  return {
    tab,
    setTab(t: AppTab) {
      history.pushState(null, '', url(t));
      setState(t);
    },
  };
}
