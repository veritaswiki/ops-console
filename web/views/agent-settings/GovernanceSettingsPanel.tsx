import React from 'react';
import type { A2AStateResponse } from '../../types';
import { WidgetSkeleton } from '../../components/ui';
import { AgentLogsSection } from '../../components/AgentLogsSection';
import { AiGovernanceSection } from '../../components/AiGovernanceSection';
import { SwarmMemorySection } from '../../components/SwarmMemorySection';

export type GovernanceSubTab = 'swarm' | 'guardrails' | 'logs';

export function GovernanceSettingsPanel({
  subTab,
  a2aState,
  focusedLogAgentId,
  readOnly,
  onReloadA2A,
  onOpenAgentLogs,
  onToast,
}: {
  subTab: GovernanceSubTab;
  a2aState: A2AStateResponse | null;
  focusedLogAgentId: string;
  readOnly: boolean;
  onReloadA2A: () => Promise<void>;
  onOpenAgentLogs: (agentId: string) => void;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}) {
  return (
    <div className="space-y-6" data-testid="settings-section-governance">
      {subTab === 'swarm' ? (
        a2aState?.swarmMetrics && a2aState?.superAgentConfig ? (
          <SwarmMemorySection
            agents={a2aState.agents}
            swarmMetrics={a2aState.swarmMetrics}
            superAgentConfig={a2aState.superAgentConfig}
            superAgentTickets={a2aState.superAgentTickets || []}
            contextSpillNodes={a2aState.contextSpillNodes || []}
            triggerEvents={a2aState.triggerEvents || []}
            readOnly={readOnly}
            onReload={onReloadA2A}
            onOpenAgentLogs={onOpenAgentLogs}
            onToast={onToast}
          />
        ) : (
          <WidgetSkeleton heightClass="h-[460px]" label="正在加载蜂群协同引擎" />
        )
      ) : subTab === 'guardrails' ? (
        <AiGovernanceSection readOnly={readOnly} onToast={onToast} />
      ) : (
        <AgentLogsSection
          agents={a2aState?.agents || []}
          initialAgentId={focusedLogAgentId}
          readOnly={readOnly}
          onToast={onToast}
          onDataMutated={() => void onReloadA2A()}
        />
      )}
    </div>
  );
}
