const modules = import.meta.glob<string>('./devicons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
})

function iconIdFromPath(path: string): string {
  return path.replace(/^.*\//, '').replace(/\.svg$/i, '')
}

export const DEVICON_URLS: Record<string, string> = {}
for (const [path, url] of Object.entries(modules)) {
  DEVICON_URLS[iconIdFromPath(path)] = url
}

const RULES: { id: string; test: RegExp }[] = [
  { id: 'prometheus', test: /prometheus|alertmanager|thanos|pushgateway|prom\/|kube-state-metrics|node-exporter|blackbox-exporter/ },
  { id: 'grafana', test: /grafana|loki|tempo|mimir/ },
  { id: 'nginx', test: /nginx|ingress-nginx/ },
  { id: 'argocd', test: /argo(?:cd)?|argoproj/ },
  { id: 'helm', test: /\bhelm\b|tiller/ },
  { id: 'kubernetes', test: /kubernetes|kube-proxy|coredns|metrics-server|pause/ },
  { id: 'elasticsearch', test: /elastic(?:search)?|kibana|logstash|\bbeats\b|filebeat|metricbeat/ },
  { id: 'jaeger', test: /jaeger/ },
  { id: 'opentelemetry', test: /opentelemetry|otelcol|otel-collector/ },
  { id: 'kafka', test: /kafka|strimzi/ },
  { id: 'rabbitmq', test: /rabbitmq/ },
  { id: 'redis', test: /redis/ },
  { id: 'postgresql', test: /postgres|postgresql|pgbouncer|crunchy/ },
  { id: 'mongodb', test: /mongo(?:db)?/ },
  { id: 'mysql', test: /mysql|mariadb|percona/ },
  { id: 'cassandra', test: /cassandra/ },
  { id: 'influxdb', test: /influx/ },
  { id: 'vault', test: /vault/ },
  { id: 'consul', test: /consul/ },
  { id: 'envoy', test: /envoy/ },
  { id: 'traefik', test: /traefik/ },
  { id: 'tomcat', test: /tomcat/ },
  { id: 'apache', test: /httpd|apache/ },
  { id: 'airflow', test: /airflow/ },
  { id: 'spark', test: /spark/ },
  { id: 'hadoop', test: /hadoop/ },
  { id: 'jenkins', test: /jenkins/ },
  { id: 'gitlab', test: /gitlab/ },
  { id: 'github', test: /github|ghcr|actions-runner/ },
  { id: 'terraform', test: /terraform|atlantis/ },
  { id: 'ansible', test: /ansible|awx/ },
  { id: 'fastapi', test: /fastapi|uvicorn/ },
  { id: 'django', test: /django/ },
  { id: 'flask', test: /flask|gunicorn/ },
  { id: 'spring', test: /spring/ },
  { id: 'graphql', test: /graphql|apollo/ },
  { id: 'nextjs', test: /next(?:js)?/ },
  { id: 'react', test: /react/ },
  { id: 'angular', test: /angular/ },
  { id: 'vuejs', test: /vue/ },
  { id: 'svelte', test: /svelte/ },
  { id: 'electron', test: /electron/ },
  { id: 'nodejs', test: /node(?:js)?|express|nest/ },
  { id: 'javascript', test: /javascript|\.js\b|node-app|frontend|ui/ },
  { id: 'typescript', test: /typescript|\.ts\b/ },
  { id: 'python', test: /python|django|flask|celery/ },
  { id: 'go', test: /\bgo(?:lang)?\b|golang/ },
  { id: 'java', test: /java|openjdk|jdk|jre|maven/ },
  { id: 'kotlin', test: /kotlin/ },
  { id: 'scala', test: /scala/ },
  { id: 'csharp', test: /dotnet|csharp|aspnet|\.net/ },
  { id: 'php', test: /\bphp\b|wordpress|laravel/ },
  { id: 'ruby', test: /ruby|rails/ },
  { id: 'rust', test: /rust/ },
  { id: 'aws', test: /amazonaws|eks|aws-cli/ },
  { id: 'gcp', test: /gcr\.io|gke|google-cloud/ },
  { id: 'azure', test: /azurecr|azure|aks/ },
  { id: 'cloudflare', test: /cloudflare/ },
  { id: 'digitalocean', test: /digitalocean/ },
  { id: 'wordpress', test: /wordpress/ },
  { id: 'drupal', test: /drupal/ },
  { id: 'magento', test: /magento/ },
  { id: 'ubuntu', test: /ubuntu/ },
  { id: 'debian', test: /debian/ },
  { id: 'linux', test: /linux/ },
  { id: 'bash', test: /bash|busybox|alpine/ },
  { id: 'docker', test: /docker/ }
]

function haystack(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).join('\n').toLowerCase()
}

export function matchWorkloadIcon(
  images: string[] | undefined,
  name?: string,
  extra?: string
): string {
  const hay = haystack([...(images ?? []), name, extra])
  if (hay.trim()) {
    for (const rule of RULES) {
      if (rule.test.test(hay) && DEVICON_URLS[rule.id]) return DEVICON_URLS[rule.id]
    }
  }
  return DEVICON_URLS.docker || DEVICON_URLS.kubernetes || ''
}
