export type CloudProviderId = 'aws' | 'gcp' | 'azure' | 'huawei'

export const CLOUD_PROVIDER_LABELS: Record<CloudProviderId, string> = {
  aws: 'AWS',
  gcp: 'Google Cloud',
  azure: 'Azure',
  huawei: 'Huawei Cloud'
}

const RULES: { id: CloudProviderId; test: RegExp }[] = [
  {
    id: 'huawei',
    test: /myhuaweicloud\.com|huaweicloud|\.huawei\.com|\bcce[-_./]|ccestack/
  },
  {
    id: 'aws',
    test: /eks\.amazonaws\.com|amazonaws\.com|arn:aws:eks|aws-iam-authenticator|eksctl|\.eks\.|\baws\b/
  },
  {
    id: 'azure',
    test: /azmk8s\.io|\.azure\.com|login\.microsoftonline\.com|kubelogin|\baks[-_./]|\bazure\b/
  },
  {
    id: 'gcp',
    test: /container\.googleapis\.com|cloud\.google\.com|gke-gcloud-auth-plugin|\bgke_|\.gke\.|googleapis\.com|\bgke\b|\bgcp\b/
  }
]

/** Infer managed Kubernetes provider from kubeconfig server, context, and exec hints. */
export function detectCloudProvider(...parts: Array<string | undefined | null>): CloudProviderId | null {
  const hay = parts.filter(Boolean).join('\n').toLowerCase()
  if (!hay.trim()) return null
  for (const rule of RULES) {
    if (rule.test.test(hay)) return rule.id
  }
  return null
}
