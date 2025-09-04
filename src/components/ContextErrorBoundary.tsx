"use client";

import React, { Component, ReactNode } from 'react';
import { Button, Result } from 'antd';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ContextErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Context Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle="There was an error loading your data. Please try again."
          extra={[
            <Button type="primary" key="retry" onClick={this.handleRetry}>
              Try Again
            </Button>,
          ]}
        />
      );
    }

    return this.props.children;
  }
}

export default ContextErrorBoundary; 