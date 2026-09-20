import type {
  V1ClusterRole,
  V1ClusterRoleBinding,
  V1NetworkPolicy,
  V1Pod,
  V1Service
} from '@kubernetes/client-node'
import { SERVICES } from './demoCatalog'

/** One representative pod per demo workload, with intentional insecure profiles. */
export function buildDemoSecurityInventory(): {
  pods: V1Pod[]
  services: V1Service[]
  policies: V1NetworkPolicy[]
  roles: V1ClusterRole[]
  bindings: V1ClusterRoleBinding[]
} {
  const specs: Array<{
    name: string
    ns: string
    kind: string
    image: string
    patch?: (pod: V1Pod) => void
  }> = [
    {
      name: 'storefront',
      ns: 'shop',
      kind: 'Deployment',
      image: 'shop/storefront:latest'
    },
    {
      name: 'checkout-api',
      ns: 'shop',
      kind: 'Deployment',
      image: 'shop/checkout:1.2.0'
    },
    {
      name: 'image-resizer',
      ns: 'shop',
      kind: 'Deployment',
      image: 'ghcr.io/aurora/image-resizer:1.4.2',
      patch: (pod) => {
        const c = pod.spec!.containers![0]
        c.securityContext = { ...(c.securityContext || {}), privileged: true }
      }
    },
    {
      name: 'admin-console',
      ns: 'shop',
      kind: 'Deployment',
      image: 'node:22-alpine'
    },
    {
      name: 'payments-api',
      ns: 'payments',
      kind: 'Deployment',
      image: 'payments/api:2.0.0',
      patch: (pod) => {
        const c = pod.spec!.containers![0]
        c.securityContext = {
          ...(c.securityContext || {}),
          capabilities: { add: ['NET_ADMIN'], drop: [] }
        }
      }
    },
    {
      name: 'payments-worker',
      ns: 'payments',
      kind: 'Deployment',
      image: 'payments/worker:2.0.0'
    },
    {
      name: 'postgres',
      ns: 'data',
      kind: 'StatefulSet',
      image: 'postgres:16'
    },
    {
      name: 'redis',
      ns: 'data',
      kind: 'StatefulSet',
      image: 'redis:7.4'
    },
    {
      name: 'rabbitmq',
      ns: 'data',
      kind: 'StatefulSet',
      image: 'rabbitmq:3.13-management'
    },
    {
      name: 'grafana',
      ns: 'monitoring',
      kind: 'Deployment',
      image: 'grafana/grafana:11.5.2',
      patch: (pod) => {
        pod.spec!.volumes = [
          {
            name: 'host-data',
            hostPath: { path: '/var/lib/grafana', type: 'DirectoryOrCreate' }
          }
        ]
        pod.spec!.containers![0].volumeMounts = [{ name: 'host-data', mountPath: '/var/lib/grafana' }]
      }
    },
    {
      name: 'debug-sidecar',
      ns: 'shop',
      kind: 'Deployment',
      image: 'alpine:3.20',
      patch: (pod) => {
        pod.spec!.volumes = [
          { name: 'docker', hostPath: { path: '/var/run/docker.sock', type: 'Socket' } }
        ]
        pod.spec!.containers![0].volumeMounts = [
          { name: 'docker', mountPath: '/var/run/docker.sock' }
        ]
      }
    },
    {
      name: 'cilium-agent',
      ns: 'kube-system',
      kind: 'DaemonSet',
      image: 'quay.io/cilium/cilium:v1.16',
      patch: (pod) => {
        pod.spec!.hostNetwork = true
        pod.spec!.hostPID = true
        const c = pod.spec!.containers![0]
        c.securityContext = { ...(c.securityContext || {}), privileged: true }
      }
    },
    {
      name: 'argocd-server',
      ns: 'argocd',
      kind: 'Deployment',
      image: 'quay.io/argoproj/argocd:v2.14.5',
      patch: (pod) => {
        pod.spec!.serviceAccountName = 'argocd-server'
        pod.spec!.automountServiceAccountToken = true
      }
    },
    {
      name: 'ingress-nginx-controller',
      ns: 'ingress-nginx',
      kind: 'Deployment',
      image: 'registry.k8s.io/ingress-nginx/controller:v1.12.1'
    },
    {
      name: 'prometheus',
      ns: 'monitoring',
      kind: 'Deployment',
      image: 'prom/prometheus:v2.55.1'
    },
    {
      name: 'fraud-engine',
      ns: 'payments',
      kind: 'Deployment',
      image: 'python:3.12'
    },
    {
      name: 'catalog-api',
      ns: 'shop',
      kind: 'Deployment',
      image: 'shop/catalog:1.0.0',
      patch: (pod) => {
        pod.spec!.containers![0].env = [
          { name: 'CHECKOUT_URL', value: 'http://checkout-api.shop.svc' },
          { name: 'SEARCH_URL', value: 'http://search-index.shop.svc' }
        ]
      }
    },
    {
      name: 'search-index',
      ns: 'shop',
      kind: 'Deployment',
      image: 'elasticsearch:8.15.0'
    }
  ]

  const pods: V1Pod[] = specs.map((s) => {
    const pod: V1Pod = {
      metadata: {
        name: `${s.name}-0`,
        namespace: s.ns,
        ownerReferences: [
          {
            apiVersion: 'apps/v1',
            kind: s.kind,
            name: s.name,
            uid: `demo-${s.name}`,
            controller: true
          }
        ]
      },
      spec: {
        serviceAccountName: 'default',
        automountServiceAccountToken: true,
        containers: [
          {
            name: s.name,
            image: s.image,
            ports: [{ containerPort: 8080 }],
            // Intentionally incomplete securityContext → real rules fire
            securityContext: {}
          }
        ]
      }
    }
    s.patch?.(pod)
    return pod
  })

  // Wire storefront env for vectors
  const storefront = pods.find((p) => p.metadata?.name?.startsWith('storefront'))
  if (storefront?.spec?.containers?.[0]) {
    storefront.spec.containers[0].env = [
      { name: 'CHECKOUT_HOST', value: 'checkout-api.shop.svc' },
      { name: 'CATALOG_HOST', value: 'catalog-api.shop.svc' }
    ]
  }
  const checkout = pods.find((p) => p.metadata?.name?.startsWith('checkout-api'))
  if (checkout?.spec?.containers?.[0]) {
    checkout.spec.containers[0].env = [
      { name: 'PAYMENTS_URL', value: 'payments-api.payments.svc' }
    ]
  }
  const payments = pods.find((p) => p.metadata?.name?.startsWith('payments-api'))
  if (payments?.spec?.containers?.[0]) {
    payments.spec.containers[0].env = [
      { name: 'DB_HOST', value: 'postgres.data.svc' },
      { name: 'REDIS_HOST', value: 'redis.data.svc' }
    ]
  }

  const lbNames = new Set([
    'storefront',
    'admin-console',
    'argocd-server',
    'grafana',
    'ingress-nginx-controller'
  ])
  const nodePortNames = new Set(['rabbitmq', 'redis', 'prometheus'])

  const services: V1Service[] = SERVICES.map((row) => {
    const name = row.name
    const type = lbNames.has(name) ? 'LoadBalancer' : nodePortNames.has(name) ? 'NodePort' : 'ClusterIP'
    return {
      metadata: { name, namespace: row.namespace },
      spec: {
        type,
        clusterIP: '10.96.0.10',
        ports: [{ name: 'http', port: 80, targetPort: 8080 as unknown as number, nodePort: type === 'NodePort' ? 30080 : undefined }],
        selector: { app: name }
      },
      status:
        type === 'LoadBalancer'
          ? { loadBalancer: { ingress: [{ ip: '34.90.12.8' }] } }
          : undefined
    } as V1Service
  })

  // Only monitoring has a NetworkPolicy → shop/payments/data trigger SEC-NET-001
  const policies: V1NetworkPolicy[] = [
    {
      metadata: { name: 'default-deny', namespace: 'monitoring' },
      spec: { podSelector: {}, policyTypes: ['Ingress'] }
    }
  ]

  const roles: V1ClusterRole[] = [
    {
      metadata: { name: 'redis-admin' },
      rules: [{ apiGroups: ['*'], resources: ['*'], verbs: ['*'] }]
    },
    {
      metadata: { name: 'argocd-server' },
      rules: [{ apiGroups: ['*'], resources: ['*'], verbs: ['*'] }]
    },
    {
      metadata: { name: 'view' },
      rules: [{ apiGroups: [''], resources: ['pods'], verbs: ['get', 'list'] }]
    }
  ]

  const bindings: V1ClusterRoleBinding[] = [
    {
      metadata: { name: 'redis-admin-binding' },
      roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind: 'ClusterRole', name: 'redis-admin' },
      subjects: [{ kind: 'ServiceAccount', name: 'default', namespace: 'data' }]
    },
    {
      metadata: { name: 'argocd-server-admin' },
      roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind: 'ClusterRole', name: 'argocd-server' },
      subjects: [{ kind: 'ServiceAccount', name: 'argocd-server', namespace: 'argocd' }]
    }
  ]

  return { pods, services, policies, roles, bindings }
}
