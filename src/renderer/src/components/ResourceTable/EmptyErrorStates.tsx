import { Alert, Button, Empty, Skeleton } from 'antd'

export function LoadingState(): React.JSX.Element {
  return <Skeleton active paragraph={{ rows: 6 }} />
}

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps): React.JSX.Element {
  return (
    <Alert
      type="error"
      showIcon
      message="Failed to load resources"
      description={message}
      action={
        <Button size="small" danger onClick={onRetry}>
          Retry
        </Button>
      }
    />
  )
}

export function EmptyState(): React.JSX.Element {
  return <Empty description="No resources found" />
}
