import React from 'react';
import { ErrorState, Panel } from '../components/ui';

interface ModuleBoundaryProps {
  moduleId: string;
  moduleLabel: string;
  children: React.ReactNode;
}

interface ModuleBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Per-module fault isolation boundary so a runtime error in one domain module
 * never crashes the entire control plane shell.
 */
export class ModuleBoundary extends React.Component<ModuleBoundaryProps, ModuleBoundaryState> {
  state: ModuleBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): ModuleBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || '模块渲染发生未预期错误',
    };
  }

  componentDidUpdate(prevProps: ModuleBoundaryProps) {
    if (prevProps.moduleId !== this.props.moduleId && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Panel title={`${this.props.moduleLabel} · 模块异常隔离`}>
          <ErrorState
            title={`板块「${this.props.moduleLabel}」渲染异常`}
            message={this.state.errorMessage}
            onRetry={this.handleReset}
          />
        </Panel>
      );
    }
    return this.props.children;
  }
}
