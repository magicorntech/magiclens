import { Empty, Typography } from 'antd'

/**
 * Shown when the `argoproj.io` CRDs aren't registered on the connected cluster. This is a
 * normal state, not an error — most clusters don't run Argo CD — so it reads as information
 * rather than a failure.
 */
export function ArgoNotInstalled(): React.JSX.Element {
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', minHeight: 240 }}>
      <Empty
        description={
          <span>
            <Typography.Text strong>Argo CD is not installed on this cluster</Typography.Text>
            <br />
            <Typography.Text type="secondary">
              MagicLens looks for the <code>argoproj.io/v1alpha1</code> resources. Install Argo CD,
              or switch to a cluster that runs it.
            </Typography.Text>
          </span>
        }
      />
    </div>
  )
}
