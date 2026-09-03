import { Button, Modal, Typography } from 'antd'
import { Sparkles } from 'lucide-react'
import { Icon } from '../ui/Icon'
import type { WhatsNewEntry } from '@shared/whatsNew'

/**
 * Shown once after an update, in place of the first-launch tour.
 *
 * Deliberately a small dialog rather than the full-screen intro: someone who has been using the
 * app and simply took an update wants to get back to work, not sit through onboarding. It is
 * dismissible with a single button and never reappears for that version.
 */
export function WhatsNewModal({
  version,
  entry,
  open,
  onClose
}: {
  version: string
  entry: WhatsNewEntry
  open: boolean
  onClose: () => void
}): React.JSX.Element {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      width={480}
      title={
        <span className="ml-whats-new__title">
          <Icon icon={Sparkles} variant="toolbar" style={{ color: 'var(--ml-primary)' }} />
          <span>{entry.title}</span>
          <span className="ml-whats-new__version">v{version}</span>
        </span>
      }
      footer={
        <Button type="primary" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Here&apos;s what changed in this release.
      </Typography.Paragraph>
      <ul className="ml-whats-new__list">
        {entry.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Modal>
  )
}
