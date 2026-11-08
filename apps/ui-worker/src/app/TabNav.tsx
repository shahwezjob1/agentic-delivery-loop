import type { AppTab } from './tab-registry';
import { TAB_DEFINITIONS } from './tab-registry';
import s from './TabNav.module.css';
export function TabNav({
  activeTab,
  onTabChange,
}: {
  activeTab: AppTab;
  onTabChange: (x: AppTab) => void;
}) {
  return (
    <nav className={s.nav} aria-label="Application sections">
      {TAB_DEFINITIONS.map((x) => (
        <button
          key={x.id}
          className={activeTab === x.id ? s.active : ''}
          aria-current={activeTab === x.id ? 'page' : undefined}
          onClick={() => onTabChange(x.id)}
        >
          {x.label}
        </button>
      ))}
    </nav>
  );
}
