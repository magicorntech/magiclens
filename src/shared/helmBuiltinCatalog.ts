import type { HelmCatalogChart } from './types/helm'

function logo(id: string): string {
  return `https://artifacthub.io/image/${id}`
}

function chart(
  repoName: string,
  repoUrl: string,
  name: string,
  version: string,
  appVersion: string,
  description: string,
  stars: number,
  logoId: string | null
): HelmCatalogChart {
  return {
    id: `${repoName}/${name}`,
    name,
    displayName: name,
    description,
    version,
    appVersion,
    repoName,
    repoUrl,
    logoUrl: logoId ? logo(logoId) : null,
    stars,
    official: stars > 500
  }
}

export const BUILTIN_HELM_CHARTS: HelmCatalogChart[] = [
  chart('fairwinds-stable', 'https://charts.fairwinds.com/stable', 'astro', '2.0.0', '1.6.0', 'Emit datadog monitors based on kubernetes state.', 12, 'd105c862-147f-440d-a6b1-2cda56f24d9b'),
  chart('fairwinds-stable', 'https://charts.fairwinds.com/stable', 'goldilocks', '11.1.1', 'v4.16.2', 'A Helm chart for running Fairwinds Goldilocks.', 40, '7ded8503-62b0-4f01-8e5d-4b1231129691'),
  chart('grafana', 'https://grafana.github.io/helm-charts', 'grafana', '8.10.1', '11.5.1', 'The leading open source software for dashboards.', 1200, 'b4fed1a7-6c8f-4945-b99d-096efa3e4116'),
  chart('prometheus-community', 'https://prometheus-community.github.io/helm-charts', 'kube-prometheus-stack', '91.4.1', 'v0.94.0', 'kube-prometheus-stack collects Kubernetes manifests, Grafana dashboards, and Prometheus rules combined with documentation and scripts to provide easy to operate end-to-end Kubernet', 1233, '0503add5-3fce-4b63-bbf3-b9f649512a86'),
  chart('cert-manager', 'https://charts.jetstack.io', 'cert-manager', '1.21.2', 'v1.21.2', 'A Helm chart for cert-manager', 992, '6d75ecff-a328-495b-a7fc-12cd84499974'),
  chart('argo', 'https://argoproj.github.io/argo-helm', 'argo-cd', '10.9.2', 'v3.5.3', 'A Helm chart for Argo CD, a declarative, GitOps continuous delivery tool for Kubernetes.', 848, 'e16221f4-a3b1-49f6-9b65-cb4dbf30ed83'),
  chart('ingress-nginx', 'https://kubernetes.github.io/ingress-nginx', 'ingress-nginx', '4.15.1', '1.15.1', 'Ingress controller for Kubernetes using NGINX as a reverse proxy and load balancer', 822, '282abebe-66ad-46f7-991d-abdb72ca01b7'),
  chart('prometheus-community', 'https://prometheus-community.github.io/helm-charts', 'prometheus', '29.31.1', 'v3.14.0', 'Prometheus is a monitoring system and time series database.', 552, '0503add5-3fce-4b63-bbf3-b9f649512a86'),
  chart('bitnami', 'https://charts.bitnami.com/bitnami', 'redis', '28.2.1', '8.10.2', 'Redis(R) is an open source, advanced key-value store. It is often referred to as a data structure server since keys can contain strings, hashes, lists, sets and sorted sets.', 508, '914fbe31-b125-470b-9792-a8a8dee95c77'),
  chart('bitnami', 'https://charts.bitnami.com/bitnami', 'postgresql', '18.11.4', '18.6.0', 'PostgreSQL (Postgres) is an open source object-relational database known for reliability and data integrity. ACID-compliant, it supports foreign keys, joins, views, triggers and st', 431, '371d5e57-34c4-46ef-909e-658c1502ced8'),
  chart('traefik', 'https://traefik.github.io/charts', 'traefik', '41.6.0', 'v3.7.13', 'A Traefik based Kubernetes ingress controller', 429, 'f019cbfd-b8d4-43ef-b115-791bba16bf1f'),
  chart('k8s-dashboard', 'https://kubernetes.github.io/dashboard', 'kubernetes-dashboard', '7.14.0', '', 'General-purpose web UI for Kubernetes clusters', 364, 'c711f9f9-28b3-4ee8-98a2-30e00abf9f02'),
  chart('grafana', 'https://grafana.github.io/helm-charts', 'loki', '7.3.0', '3.6.12', 'Helm chart for Grafana Enterprise Logs supporting monolithic, simple scalable, and microservices modes.', 333, '6e0c6a8b-99fe-4ed5-a2ff-7799ba373223'),
  chart('metrics-server', 'https://kubernetes-sigs.github.io/metrics-server/', 'metrics-server', '3.14.0', '0.9.0', 'Metrics Server is a scalable, efficient source of container resource metrics for Kubernetes built-in autoscaling pipelines.', 318, '92b1716e-c455-4113-9a8e-1141b2961479'),
  chart('hashicorp', 'https://helm.releases.hashicorp.com', 'vault', '0.34.1', '2.0.4', 'Official HashiCorp Vault Chart', 297, 'c8d6d027-b302-49f5-b8aa-964910ed04eb'),
  chart('gitlab', 'http://charts.gitlab.io/', 'gitlab', '10.4.0', 'v19.4.0', 'GitLab is the most comprehensive AI-powered DevSecOps Platform.', 280, 'b973c749-af26-4492-9a15-ad59b977ecbe'),
  chart('harbor', 'https://helm.goharbor.io', 'harbor', '1.19.2', '2.15.2', 'An open source trusted cloud native registry that stores, signs, and scans content', 274, '93376a3e-0c15-4dfd-b747-5f11576321fb'),
  chart('bitnami', 'https://charts.bitnami.com/bitnami', 'keycloak', '25.2.0', '26.3.3', 'Keycloak is a high performance Java-based identity and access management solution. It lets developers add an authentication layer to their applications with minimum effort.', 273, '84e8d984-f5ae-4573-912f-bb7ca9be0603'),
  chart('jenkinsci', 'https://charts.jenkins.io/', 'jenkins', '5.9.63', '2.568.3', 'Jenkins - Build great things at any scale! As the leading open source automation server, Jenkins provides over 2000 plugins to support building, deploying and automating any projec', 253, '6aedc434-b6b1-41e1-8610-a6ecb664bd14'),
  chart('external-secrets-operator', 'https://charts.external-secrets.io/', 'external-secrets', '2.10.0', 'v2.10.0', 'External secrets management for Kubernetes', 247, 'f23fb631-4a3c-46c0-bda1-7a048cabf10d'),
  chart('external-dns', 'https://kubernetes-sigs.github.io/external-dns/', 'external-dns', '1.22.0', '0.22.0', 'ExternalDNS synchronizes exposed Kubernetes Services and Ingresses with DNS providers.', 238, '80e6b87a-544d-4794-aa15-02c73884f9cc'),
  chart('longhorn', 'https://charts.longhorn.io', 'longhorn', '1.12.1', 'v1.12.1', 'Longhorn is a distributed block storage system for Kubernetes.', 221, 'fbd5b075-5f1f-438c-aa78-356c14e158c5'),
  chart('bitnami', 'https://charts.bitnami.com/bitnami', 'rabbitmq', '16.0.14', '4.1.3', 'RabbitMQ is an open source general-purpose message broker that is designed for consistent, highly-available messaging scenarios (both synchronous and asynchronous).', 215, 'c428241f-1cae-4b27-aba7-7c3ac67b9a88'),
  chart('gitlab', 'http://charts.gitlab.io/', 'gitlab-runner', '0.93.0', '19.4.0', 'GitLab Runner', 211, null),
  chart('aws', 'https://aws.github.io/eks-charts', 'aws-load-balancer-controller', '3.5.0', 'v3.5.0', 'AWS Load Balancer Controller Helm chart for Kubernetes', 208, '713df283-63b6-498f-abf1-f0631c201511'),
  chart('bitnami', 'https://charts.bitnami.com/bitnami', 'kafka', '32.4.3', '4.0.0', 'Apache Kafka is a distributed streaming platform designed to build real-time pipelines and can be used as a message broker or as a replacement for a log aggregation solution for bi', 204, 'da3e7fa0-2d82-43e9-8cad-87bac262e9dc'),
  chart('bitnami', 'https://charts.bitnami.com/bitnami', 'external-dns', '9.0.3', '0.18.0', 'ExternalDNS is a Kubernetes addon that configures public DNS servers with information about exposed Kubernetes services to make them discoverable.', 200, '02e08c6f-28bb-4f1d-885f-ec60c2d4c2f2'),
  chart('cilium', 'https://helm.cilium.io/', 'cilium', '1.21.0-pre.2', '1.21.0-pre.2', 'eBPF-based Networking, Security, and Observability', 199, '2ae85972-bf12-41a5-afb2-9b1147b2aa56'),
  chart('bitnami', 'https://charts.bitnami.com/bitnami', 'mysql', '14.0.3', '9.4.0', 'MySQL is a fast, reliable, scalable, and easy to use open source relational database system. Designed to handle mission-critical, heavy-load production applications.', 198, 'd45c30b0-a6ce-493b-9f00-0f117e2e7974'),
  chart('apache-airflow', 'https://airflow.apache.org/', 'airflow', '1.22.0', '3.2.2', 'The official Helm chart to deploy Apache Airflow, a platform to programmatically author, schedule, and monitor workflows', 197, 'bff3dcd3-1071-4b30-b24f-b0aa9db32688'),
  chart('bitnami', 'https://charts.bitnami.com/bitnami', 'mongodb', '19.2.1', '8.3.11', 'MongoDB(R) is a relational open source NoSQL database. Easy to use, it stores data in JSON-like documents. Automated scalability and high-performance. Ideal for developing cloud na', 194, '914fbe31-b125-470b-9792-a8a8dee95c77'),
  chart('elastic', 'https://helm.elastic.co', 'elasticsearch', '8.5.1', '8.5.1', 'Official Elastic helm chart for Elasticsearch', 193, 'a8078b43-787e-4dd1-96e0-5611bacd362b'),
  chart('vmware-tanzu', 'https://vmware-tanzu.github.io/helm-charts/', 'velero', '12.2.0', '1.18.2', 'A Helm chart for velero', 191, 'cb1f1716-c3ea-402f-8e12-3cc471d73e2e'),
  chart('nextcloud', 'https://nextcloud.github.io/helm/', 'nextcloud', '9.2.6', '34.0.3', 'A file sharing server that puts the control and security of your own data back into your hands.', 190, '3fb48919-25f8-475a-aba0-8ff63e3ada3b'),
  chart('bitnami', 'https://charts.bitnami.com/bitnami', 'minio', '17.0.21', '2025.7.23', 'MinIO(R) is an object storage server, compatible with Amazon S3 cloud storage service, mainly used for storing unstructured data (such as photos, videos, log files, etc.).', 169, 'afd67ebf-7003-41b4-87c0-a74e57b2da22'),
  chart('cluster-autoscaler', 'https://kubernetes.github.io/autoscaler', 'cluster-autoscaler', '9.59.0', '1.35.0', 'Scales Kubernetes worker nodes within autoscaling groups.', 166, '7cc54181-9a86-4bef-bf76-d90134ecd027'),
  chart('metallb', 'https://metallb.github.io/metallb', 'metallb', '0.16.1', 'v0.16.1', 'A network load-balancer implementation for Kubernetes using standard routing protocols', 153, '68f1b3c9-94da-43f0-89df-a759a8cff818'),
  chart('istio-official', 'https://istio-release.storage.googleapis.com/charts', 'istiod', '1.31.0-rc.0', '1.31.0-rc.0', 'Helm chart for istio control plane', 141, '97b11572-7bbb-4482-ab17-eb02115590b9'),
  chart('kyverno', 'https://kyverno.github.io/kyverno/', 'kyverno', '3.9.1', 'v1.19.1', 'Kubernetes Native Policy Management', 140, '46c2e3db-f88c-441b-9b5a-62d517963d1d'),
  chart('cloudnative-pg', 'https://cloudnative-pg.io/charts/', 'cloudnative-pg', '0.29.0', '1.30.0', 'CloudNativePG Operator Helm Chart', 140, 'af3f28b9-6983-42db-a080-779340bc0126'),
  chart('argo', 'https://argoproj.github.io/argo-helm', 'argo-workflows', '2.0.6', 'v4.1.3', 'A Helm chart for Argo Workflows', 139, 'e16221f4-a3b1-49f6-9b65-cb4dbf30ed83'),
  chart('rancher-stable', 'https://releases.rancher.com/server-charts/stable', 'rancher', '2.15.1', 'v2.15.1', 'Install Rancher Server to manage Kubernetes clusters across providers.', 139, '938cdfac-5505-4575-93d8-049e5e817ce3'),
  chart('gitea', 'https://dl.gitea.com/charts', 'gitea', '12.7.0', '1.27.0', 'Gitea Helm chart for Kubernetes', 133, '44a8fad2-2606-48e0-97c3-453951586c7e'),
  chart('sonarqube', 'https://SonarSource.github.io/helm-chart-sonarqube', 'sonarqube', '2026.4.1', '2026.4.1', 'SonarQube is a self-managed, automatic code review tool that systematically helps you deliver clean code. As a core element of our Sonar solution, SonarQube integrates into your ex', 133, '132ce52d-b560-46c0-8163-ed24eef8ec56'),
  chart('fluent', 'https://fluent.github.io/helm-charts', 'fluent-bit', '0.58.2', '5.1.2', 'Fast and lightweight log processor and forwarder for Linux, OSX and BSD family operating systems.', 127, '963e86b2-30aa-4ee2-bcfd-b70d64f8b3c6'),
  chart('datadog', 'https://helm.datadoghq.com', 'datadog', '3.246.0', '7', 'Datadog Agent', 116, 'a9afe0b9-be3a-4017-bcee-94ca0ce1713f'),
  chart('oauth2-proxy', 'https://oauth2-proxy.github.io/manifests', 'oauth2-proxy', '10.7.0', '7.15.3', 'A reverse proxy that provides authentication with Google, Github or other providers', 111, null),
  chart('runix', 'https://helm.runix.net/', 'pgadmin4', '1.66.0', '9.17', 'pgAdmin4 is a web based administration tool for PostgreSQL database', 109, '61ef8ba4-4c21-438e-a0a2-e35628f1e193'),
  chart('bitnami', 'https://charts.bitnami.com/bitnami', 'wordpress', '34.0.1', '7.1.1', 'WordPress is the world\'s most popular blogging and content management platform. Powerful yet simple, everyone from students to global corporations use it to build beautiful, functi', 107, '2b02241b-36d9-487e-b747-3f37bd4cb9a5'),
  chart('bitnami', 'https://charts.bitnami.com/bitnami', 'nginx', '25.1.13', '1.31.6', 'NGINX Open Source is a web server that can be also used as a reverse proxy, load balancer, and HTTP cache. Recommended for high-demanding sites due to its ability to provide faster', 106, 'df8b0c56-3686-47ad-b3cf-44ab4c2ef096'),
  chart('bitnami', 'https://charts.bitnami.com/bitnami', 'thanos', '17.3.1', '0.39.2', 'Thanos is a highly available metrics system that can be added on top of existing Prometheus deployments, providing a global query view across all Prometheus installations.', 106, 'b7eafe7e-d9ca-4f04-a162-062b71eeefce'),
  chart('goauthentik', 'https://charts.goauthentik.io/', 'authentik', '2026.8.3', '2026.8.3', 'authentik is an open-source Identity Provider focused on flexibility and versatility', 104, '4f662184-8f4a-4315-ad15-412ca9720569'),
  chart('bitnami-labs', 'https://bitnami-labs.github.io/sealed-secrets/', 'sealed-secrets', '2.18.6', '0.37.0', 'Helm chart for the sealed-secrets controller.', 101, null),
  chart('argo', 'https://argoproj.github.io/argo-helm', 'argocd-apps', '2.0.5', '', 'A Helm chart for managing additional Argo CD Applications and Projects', 99, 'e16221f4-a3b1-49f6-9b65-cb4dbf30ed83'),
  chart('nginx', 'https://helm.nginx.com/stable', 'nginx-ingress', '2.7.3', '5.6.3', 'NGINX Ingress Controller', 98, '62c16f84-a100-4147-9577-4b1133ce2ab4'),
  chart('kedacore', 'https://kedacore.github.io/charts', 'keda', '2.20.2', '2.20.2', 'Event-based autoscaler for workloads on Kubernetes', 98, '575cefe9-39f5-4608-9a4e-adf68560be7f'),
  chart('nfs-subdir-external-provisioner', 'https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner', 'nfs-subdir-external-provisioner', '4.0.18', '4.0.2', 'nfs-subdir-external-provisioner is an automatic provisioner that used your *already configured* NFS server, automatically creating Persistent Volumes.', 97, null),
  chart('artifact-hub', 'https://artifacthub.github.io/helm-charts/', 'artifact-hub', '1.23.0', '1.23.0', 'Artifact Hub is a web-based application that enables finding, installing, and publishing Cloud Native packages.', 95, '35c5d3c7-421e-4b4a-97b0-86f4602a2f59'),
  chart('mojo2600', 'https://mojo2600.github.io/pihole-kubernetes/', 'pihole', '2.38.0', '2026.07.2', 'Installs pihole in kubernetes', 93, '9608b6db-8a7c-4854-a51b-ff36651aa63c'),
  chart('prometheus-community', 'https://prometheus-community.github.io/helm-charts', 'kube-state-metrics', '8.5.0', '2.20.0', 'Install kube-state-metrics to generate and expose cluster-level metrics', 92, '6c29c611-e72b-40e1-bbcc-a40c8cfa19ff'),
  chart('hashicorp', 'https://helm.releases.hashicorp.com', 'consul', '2.0.4', '2.0.4', 'Official HashiCorp Consul Chart', 89, '080055be-17ec-4e42-9f66-e74c9b2e95d8'),
  chart('community-charts', 'https://community-charts.github.io/helm-charts', 'n8n', '1.24.40', '2.38.4', 'A Helm chart for fair-code workflow automation platform with native AI capabilities. Combine visual building with custom code, self-host or cloud, 400+ integrations.', 89, 'd65108f6-ec3b-4100-b003-635e5fc0b880'),
  chart('bitnami', 'https://charts.bitnami.com/bitnami', 'mariadb', '28.0.0', '13.1.1', 'MariaDB is an open source, community-developed SQL database server that is widely in use around the world due to its enterprise features, flexibility, and collaboration with leadin', 86, '252b526a-b40b-4140-82b3-0db4398c43cf'),
]

export function demoHelmCatalog(query: string): HelmCatalogChart[] {
  const q = query.trim().toLowerCase()
  if (!q) return BUILTIN_HELM_CHARTS
  return BUILTIN_HELM_CHARTS.filter((c) =>
    [c.name, c.displayName, c.description, c.repoName].join(' ').toLowerCase().includes(q)
  )
}
