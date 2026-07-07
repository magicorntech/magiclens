import { Typography } from 'antd'

interface KubectlCommandPreviewProps {
  command: string
}

export function KubectlCommandPreview({ command }: KubectlCommandPreviewProps): React.JSX.Element {
  return (
    <div style={{ marginTop: 12 }}>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
        Equivalent kubectl command
      </Typography.Text>
      <Typography.Paragraph
        code
        copyable
        style={{ marginBottom: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
      >
        {command}
      </Typography.Paragraph>
    </div>
  )
}
