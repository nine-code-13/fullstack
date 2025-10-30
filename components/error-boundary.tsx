'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新状态，下次渲染时显示降级UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 可以在这里记录错误信息
    console.error('Error caught by Error Boundary:', error);
    console.error('Error info:', errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 自定义降级UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md">
            <Alert variant="destructive">
              <TriangleAlert className="h-6 w-6" />
              <AlertTitle className="text-xl font-bold">Oops! Something went wrong</AlertTitle>
              <AlertDescription className="mt-2">
                {this.state.error?.message || 'An unexpected error occurred'}
              </AlertDescription>
            </Alert>

            <div className="mt-6 flex justify-end">
              <Button onClick={this.resetErrorBoundary}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}