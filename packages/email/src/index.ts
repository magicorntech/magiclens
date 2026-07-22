import nodemailer from 'nodemailer'

export interface SmtpConfig {
  host: string
  port: number
  user?: string
  password?: string
  from: string
}

export function createMailer(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: false,
    auth: config.user ? { user: config.user, pass: config.password } : undefined
  })
}

export async function sendInvitationEmail(
  config: SmtpConfig,
  params: {
    to: string
    organizationName: string
    inviteUrl: string
    invitedByName: string
  }
): Promise<void> {
  const mailer = createMailer(config)
  await mailer.sendMail({
    from: config.from,
    to: params.to,
    subject: `You're invited to ${params.organizationName} on MagicLens`,
    text: `${params.invitedByName} invited you to join ${params.organizationName} on MagicLens.\n\nAccept: ${params.inviteUrl}\n`,
    html: `<p><strong>${params.invitedByName}</strong> invited you to join <strong>${params.organizationName}</strong> on MagicLens.</p>
<p><a href="${params.inviteUrl}">Accept invitation</a></p>`
  })
}

export async function sendCredentialsEmail(
  config: SmtpConfig,
  params: {
    to: string
    name: string
    organizationName: string
    temporaryPassword: string
    mustChangePassword: boolean
  }
): Promise<void> {
  const mailer = createMailer(config)
  const changeNote = params.mustChangePassword
    ? '\nYou will be asked to change this password on first login.\n'
    : '\n'
  await mailer.sendMail({
    from: config.from,
    to: params.to,
    subject: `Your MagicLens account for ${params.organizationName}`,
    text: `Hello ${params.name},\n\nYour MagicLens account for ${params.organizationName} is ready.\n\nEmail: ${params.to}\nTemporary password: ${params.temporaryPassword}${changeNote}`,
    html: `<p>Hello <strong>${params.name}</strong>,</p>
<p>Your MagicLens account for <strong>${params.organizationName}</strong> is ready.</p>
<p>Email: <code>${params.to}</code><br/>Temporary password: <code>${params.temporaryPassword}</code></p>
${params.mustChangePassword ? '<p>You will be asked to change this password on first login.</p>' : ''}`
  })
}
