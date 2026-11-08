import { TabNav } from './TabNav';
import { useQueryTab } from './use-query-tab';
import { RequestsPage } from '../features/requests/RequestsPage';
import { TicketsPage } from '../features/tickets/TicketsPage';
import { PoLogsPage } from '../features/po-logs/PoLogsPage';
import { WingmanPage } from '../features/wingman/WingmanPage';
import { DevAgentPage } from '../features/dev-agent/DevAgentPage';
import s from './AppShell.module.css';
export function AppShell() {
  const { tab, setTab } = useQueryTab();
  return (
    <div className={s.shell}>
      <header>
        <p>Cloudflare Workers POC</p>
        <h1>Agentic Delivery Loop</h1>
        <TabNav activeTab={tab} onTabChange={setTab} />
      </header>
      <main>
        {tab === 'requests' ? (
          <RequestsPage />
        ) : tab === 'tickets' ? (
          <TicketsPage />
        ) : tab === 'po-logs' ? (
          <PoLogsPage />
        ) : tab === 'wingman' ? (
          <WingmanPage />
        ) : (
          <DevAgentPage />
        )}
      </main>
    </div>
  );
}
