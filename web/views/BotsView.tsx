import React from 'react';
import { fetchBots, fetchLinearState } from '../api';
import type { BotFleetResponse, LinearStateResponse, ToastHandler } from '../types';
import { ModuleFrame } from '../modules/ModuleFrame';
import { ErrorState, ViewSkeleton, type ConfirmModalState } from '../components/ui';
import { BotSystemSection } from '../components/BotSystemSection';

export function BotsView({
  readOnly = false,
  onToast,
  onConfirm,
}: {
  readOnly?: boolean;
  onToast?: ToastHandler;
  onConfirm?: (modal: ConfirmModalState) => void;
}) {
  const [botsState, setBotsState] = React.useState<BotFleetResponse | null>(null);
  const [linearState, setLinearState] = React.useState<LinearStateResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadAll = React.useCallback(async () => {
    setError(null);
    try {
      const [bots, lin] = await Promise.all([fetchBots(), fetchLinearState()]);
      setBotsState(bots);
      setLinearState(lin);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 Bot 列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (loading && !botsState) {
    return <ViewSkeleton />;
  }

  if (error && !botsState) {
    return <ErrorState title="Bot 加载失败" message={error} onRetry={() => void loadAll()} />;
  }

  return (
    <ModuleFrame
      title="Bot"
      description="创建和管理 GitHub、Telegram、Discord、Slack 与 Webhook 自动化机器人，自动接收消息并派发给 Agent。"
      meta={`${botsState?.summary.online || 0}/${botsState?.summary.total || 0} Bot 在线`}
      testId="view-bots"
    >
      <BotSystemSection
        botsState={botsState}
        projects={linearState?.projects || []}
        availableAgents={linearState?.availableAgents || []}
        readOnly={readOnly}
        onReload={loadAll}
        onToast={onToast}
        onConfirm={onConfirm}
      />
    </ModuleFrame>
  );
}

export default BotsView;
