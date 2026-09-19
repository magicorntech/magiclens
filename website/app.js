const RELEASES = "https://github.com/magicorntech/magiclens/releases/latest";
const API = "https://api.github.com/repos/magicorntech/magiclens/releases/latest";

const I18N = {
  en: {
    "nav.product": "Product",
    "nav.operate": "Operate",
    "nav.sparks": "Sparks",
    "nav.download": "Download",
    "nav.cta": "Get the app",
    "hero.badge": "v0.1.25",
    "hero.eyebrow": "Native desktop · macOS, Windows, Linux",
    "hero.title": "Every cluster.<br><em>One window.</em>",
    "hero.lede": "A local-first Kubernetes desktop. Connect your kubeconfig, open the clusters you run, and operate them without leaving the app.",
    "hero.cta": "Download MagicLens",
    "hero.secondary": "See the product",
    "hero.signed": "Signed & notarized installers",
    "hero.local": "Cluster data stays on your machine",
    "pill.local": "Local-first",
    "pill.multi": "Multi-cluster tabs",
    "pill.map": "Visualizer & Topology",
    "pill.helm": "Helm · Argo · Grafana",
    "pill.lang": "EN · TR · DE · FR · JA · KO · ZH",
    "product.kicker": "The cluster, in view",
    "product.title": "See the shape <em>before</em> you debug.",
    "product.copy": "Tables when you need rows. Maps when you need relations. A timeline when you need the last thirty minutes.",
    "operate.kicker": "Operate, don’t just watch",
    "operate.title": "Scale, exec, tail, <em>ship.</em>",
    "operate.copy": "Restart a rollout, change an image, merge every replica into one log stream, or open a shell in the container. Helm charts and Argo apps live in the same sidebar.",
    "card.logs.title": "Aggregated logs",
    "card.logs.body": "Follow a Deployment as one stream, or isolate a single pod. Tail, wrap, previous instance, download.",
    "card.exec.title": "Exec & terminals",
    "card.exec.body": "Interactive container shells, node debug, and a local terminal that inherits the cluster kubeconfig.",
    "card.helm.title": "Helm & Argo CD",
    "card.helm.body": "Install from the catalog, roll back a release, sync Argo apps — or open Grafana and Prometheus in-app.",
    "ws.kicker": "Workspaces & clusters",
    "ws.title": "Group clusters the way <em>your org</em> works.",
    "ws.copy": "Aurora vs Payments, a region, a lab. Names, logos, accents, keyboard shortcuts. AWS, GCP, Azure, and Huawei marks when the kubeconfig gives them away. Split view for staging beside production.",
    "sparks.kicker": "Sparks",
    "sparks.title": "Runbooks that stay <em>on disk.</em>",
    "sparks.copy": "A local Markdown vault inside MagicLens. Attach a note to a cluster or a Deployment. Wiki links, a graph, a canvas, reminders — nothing is uploaded.",
    "why.kicker": "Why MagicLens",
    "why.title": "Built for people who <em>already</em> have a kubeconfig.",
    "why.local.title": "Local-first",
    "why.local.body": "Talks to the Kubernetes API with your existing credentials. Cluster data does not leave the machine unless you opt into a hosted account.",
    "why.multi.title": "One window, many contexts",
    "why.multi.body": "Tabs, workspaces, split panes, and a macOS menu-bar widget for the clusters you pin.",
    "why.ops.title": "Operate from the same UI",
    "why.ops.body": "Scale, restart, roll back, port-forward, VPN profiles, YAML apply — next to the maps and tables.",
    "why.sign.title": "Signed installers",
    "why.sign.body": "Developer ID + notarized on macOS. Authenticode on Windows. Updates arrive as GitHub Release tags — you choose when to apply.",
    "dl.kicker": "Download",
    "dl.title": "Get the latest <em>signed</em> build.",
    "dl.copy": "Installers live on GitHub Releases. There is nothing to clone or compile.",
    "dl.mac": "Apple Silicon and Intel. Developer ID signed and notarized.",
    "dl.win": "x64 installer. Authenticode-signed.",
    "dl.linux": "AppImage or .deb for x64.",
    "dl.btn": "Download",
    "dl.all": "All versions",
    "dl.forYou": "For this Mac",
    "dl.forWin": "For this PC",
    "dl.forLinux": "For this machine",
    "foot.support": "Support"
  },
  tr: {
    "nav.product": "Ürün",
    "nav.operate": "Operasyon",
    "nav.sparks": "Sparks",
    "nav.download": "İndir",
    "nav.cta": "Uygulamayı al",
    "hero.badge": "v0.1.25",
    "hero.eyebrow": "Yerel masaüstü · macOS, Windows, Linux",
    "hero.title": "Tüm cluster’lar.<br><em>Tek pencere.</em>",
    "hero.lede": "Yerel öncelikli bir Kubernetes masaüstü. Kubeconfig’ini bağla, çalıştırdığın cluster’ları aç, uygulamadan çıkmadan yönet.",
    "hero.cta": "MagicLens’i indir",
    "hero.secondary": "Ürüne bak",
    "hero.signed": "İmzalı ve noter onaylı kurulumlar",
    "hero.local": "Cluster verisi makinede kalır",
    "pill.local": "Yerel öncelikli",
    "pill.multi": "Çoklu cluster sekmeleri",
    "pill.map": "Visualizer ve Topology",
    "pill.helm": "Helm · Argo · Grafana",
    "pill.lang": "EN · TR · DE · FR · JA · KO · ZH",
    "product.kicker": "Cluster görünür",
    "product.title": "Şekil ortaya çıksın, <em>sonra</em> debug.",
    "product.copy": "Satır gerektiğinde tablolar. İlişki gerektiğinde haritalar. Son otuz dakika gerektiğinde timeline.",
    "operate.kicker": "Sadece izleme, yönet",
    "operate.title": "Scale, exec, tail, <em>yayınla.</em>",
    "operate.copy": "Rollout’u yeniden başlat, imajı değiştir, tüm replica’ları tek log akışında birleştir veya container’da kabuk aç. Helm chart’ları ve Argo uygulamaları aynı kenar çubuğunda.",
    "card.logs.title": "Birleşik loglar",
    "card.logs.body": "Bir Deployment’ı tek akışta takip et veya tek pod’a in. Tail, satır kaydır, önceki instance, indir.",
    "card.exec.title": "Exec ve terminaller",
    "card.exec.body": "Etkileşimli container kabuğu, node debug ve cluster kubeconfig’ini miras alan yerel terminal.",
    "card.helm.title": "Helm ve Argo CD",
    "card.helm.body": "Katalogdan kur, release geri al, Argo uygulamalarını senkronize et — veya Grafana ile Prometheus’u uygulama içinde aç.",
    "ws.kicker": "Workspace ve cluster’lar",
    "ws.title": "Cluster’ları <em>organizasyonun</em> gibi grupla.",
    "ws.copy": "Aurora ve Payments, bir bölge, bir lab. İsim, logo, renk, kısayol. Kubeconfig söylerse AWS, GCP, Azure, Huawei işaretleri. Staging ile production yan yana — split view.",
    "sparks.kicker": "Sparks",
    "sparks.title": "Runbook’lar <em>diskte</em> kalsın.",
    "sparks.copy": "MagicLens içinde yerel bir Markdown kasası. Notu bir cluster’a veya Deployment’a bağla. Wiki link, grafik, canvas, hatırlatıcı — hiçbir şey yüklenmez.",
    "why.kicker": "Neden MagicLens",
    "why.title": "Kubeconfig’i <em>zaten</em> olanlar için.",
    "why.local.title": "Yerel öncelikli",
    "why.local.body": "Mevcut kimlik bilgilerinle Kubernetes API’ye konuşur. Hosted hesap açmadıkça cluster verisi makineden çıkmaz.",
    "why.multi.title": "Tek pencere, çok context",
    "why.multi.body": "Sekmeler, workspace’ler, split paneller ve sabitlediğin cluster’lar için macOS menü çubuğu.",
    "why.ops.title": "Aynı arayüzden operasyon",
    "why.ops.body": "Scale, restart, rollback, port-forward, VPN profilleri, YAML apply — haritaların ve tabloların yanında.",
    "why.sign.title": "İmzalı kurulumlar",
    "why.sign.body": "macOS’ta Developer ID ve noter. Windows’ta Authenticode. Güncellemeler GitHub Release etiketleriyle gelir — sen uygularsın.",
    "dl.kicker": "İndir",
    "dl.title": "Son <em>imzalı</em> sürümü al.",
    "dl.copy": "Kurulumlar GitHub Releases’ta. Klonlanacak veya derlenecek bir şey yok.",
    "dl.mac": "Apple Silicon ve Intel. Developer ID imzalı ve noter onaylı.",
    "dl.win": "x64 kurulum. Authenticode imzalı.",
    "dl.linux": "x64 için AppImage veya .deb.",
    "dl.btn": "İndir",
    "dl.all": "Tüm sürümler",
    "dl.forYou": "Bu Mac için",
    "dl.forWin": "Bu PC için",
    "dl.forLinux": "Bu makine için",
    "foot.support": "Destek"
  }
};

const TABS = {
  en: [
    { id: "visualizer", label: "Visualizer", src: "images/visualizer.png", note: "Cluster-wide map. Namespaces and Helm releases become groups; workloads get brand icons from the image — nginx, postgres, Argo, Grafana." },
    { id: "topology", label: "Topology", src: "images/topology.png", note: "One namespace, live. Owns / selects / routes / mounts. Insights flag crash loops, empty services, and zero-ready workloads." },
    { id: "nodes", label: "Nodes", src: "images/nodes.png", note: "Fleet dashboard: kubelet versions, ready counts, CPU and memory, hotspots. One not-ready node turns the strip to Degraded." },
    { id: "timeline", label: "Timeline", src: "images/timeline.png", note: "Namespaced events as a Gantt. Filter by kind and warning. Hover a bar for reason, message, and count." },
    { id: "clusters", label: "Clusters", src: "images/clusters.png", note: "Scan ~/.kube or any folder. Pin favorites. Cloud logos when the kubeconfig can tell AWS, GCP, Azure, or Huawei." },
    { id: "helm", label: "Helm", src: "images/helm.png", note: "Charts and Releases on one page. Values editor, history, rollback, uninstall." },
    { id: "storage", label: "Storage", src: "images/storage.png", note: "PVC capacity, used bytes, percent full. Amber bars before a volume pages." },
    { id: "split", label: "Split", src: "images/split.png", note: "Two cluster tabs side by side — Visualizer vs Nodes, staging vs production." }
  ],
  tr: [
    { id: "visualizer", label: "Visualizer", src: "images/visualizer.png", note: "Cluster genelinde harita. Namespace ve Helm release’leri grup; workload kartları imajdan marka ikonları alır — nginx, postgres, Argo, Grafana." },
    { id: "topology", label: "Topology", src: "images/topology.png", note: "Tek namespace, canlı. Owns / selects / routes / mounts. Insights crash loop, boş service ve sıfır-ready workload’ları işaretler." },
    { id: "nodes", label: "Nodes", src: "images/nodes.png", note: "Filo panosu: kubelet sürümleri, ready sayıları, CPU ve bellek, hotspot’lar. Tek not-ready node şeridi Degraded yapar." },
    { id: "timeline", label: "Timeline", src: "images/timeline.png", note: "Namespace event’leri Gantt olarak. Kind ve warning filtresi. Çubuğun üzerinde reason, mesaj, sayı." },
    { id: "clusters", label: "Cluster’lar", src: "images/clusters.png", note: "~/.kube veya herhangi bir klasörü tara. Favorileri sabitle. Kubeconfig söylerse AWS, GCP, Azure, Huawei logoları." },
    { id: "helm", label: "Helm", src: "images/helm.png", note: "Charts ve Releases tek sayfada. Values editörü, geçmiş, rollback, kaldırma." },
    { id: "storage", label: "Depolama", src: "images/storage.png", note: "PVC kapasite, kullanılan byte, doluluk. Volume dolmadan amber bar." },
    { id: "split", label: "Split", src: "images/split.png", note: "İki cluster sekmesi yan yana — Visualizer ve Nodes, staging ve production." }
  ]
};

let lang = localStorage.getItem("ml-lang") || (navigator.language.startsWith("tr") ? "tr" : "en");
let tabId = "visualizer";

function t(key) {
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
}

function applyI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.classList.toggle("is-on", btn.dataset.lang === lang);
  });
  renderTabs();
  markSuggestedOs();
}

function renderTabs() {
  const host = document.getElementById("productTabs");
  const tabs = TABS[lang];
  host.innerHTML = "";
  tabs.forEach((tab) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab" + (tab.id === tabId ? " is-on" : "");
    btn.textContent = tab.label;
    btn.addEventListener("click", () => {
      tabId = tab.id;
      renderTabs();
    });
    host.appendChild(btn);
  });
  const active = tabs.find((x) => x.id === tabId) || tabs[0];
  const img = document.getElementById("productShotImg");
  const title = document.getElementById("productShotTitle");
  const note = document.getElementById("productNote");
  const shot = document.getElementById("productShot");
  img.src = active.src;
  img.alt = "MagicLens " + active.label;
  title.textContent = active.label;
  note.textContent = active.note;
  shot.dataset.full = active.src;
}

function detectOs() {
  const ua = navigator.userAgent;
  if (/Mac|iPhone|iPad/.test(ua)) return "mac";
  if (/Win/.test(ua)) return "win";
  if (/Linux|X11/.test(ua)) return "linux";
  return "";
}

function markSuggestedOs() {
  const os = detectOs();
  const label = { mac: t("dl.forYou"), win: t("dl.forWin"), linux: t("dl.forLinux") };
  document.querySelectorAll(".os-card").forEach((card) => {
    const match = card.dataset.os === os;
    card.classList.toggle("is-suggested", match);
    const hint = card.querySelector("[data-suggest]");
    if (hint) hint.textContent = match ? label[os] : "";
  });
}

function openLightbox(src) {
  const box = document.getElementById("lightbox");
  box.querySelector("img").src = src;
  box.classList.add("is-open");
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("is-open");
}

async function hydrateRelease() {
  try {
    const res = await fetch(API);
    if (!res.ok) return;
    const data = await res.json();
    const tag = data.tag_name || "v0.1.25";
    I18N.en["hero.badge"] = tag;
    I18N.tr["hero.badge"] = tag;
    document.querySelectorAll('[data-i18n="hero.badge"]').forEach((el) => {
      el.textContent = tag;
    });
    const assets = data.assets || [];
    const pick = (test) => assets.find((a) => test(a.name))?.browser_download_url;
    const mac = pick((n) => /arm64\.dmg$/.test(n)) || pick((n) => /\.dmg$/.test(n));
    const win = pick((n) => /Setup.*\.exe$/.test(n) || /\.exe$/.test(n));
    const linux = pick((n) => /\.AppImage$/.test(n)) || pick((n) => /\.deb$/.test(n));
    if (mac) document.querySelector('[data-dl="mac"]').href = mac;
    if (win) document.querySelector('[data-dl="win"]').href = win;
    if (linux) document.querySelector('[data-dl="linux"]').href = linux;
  } catch {
    /* keep latest-release fallback */
  }
}

document.querySelectorAll("[data-lang]").forEach((btn) => {
  btn.addEventListener("click", () => {
    lang = btn.dataset.lang;
    localStorage.setItem("ml-lang", lang);
    applyI18n();
  });
});

document.getElementById("navToggle").addEventListener("click", () => {
  document.getElementById("nav").classList.toggle("is-open");
});

document.querySelectorAll(".nav-links a, .nav-cta").forEach((a) => {
  a.addEventListener("click", () => document.getElementById("nav").classList.remove("is-open"));
});

document.addEventListener("click", (e) => {
  const shot = e.target.closest(".shot.is-clickable");
  if (shot) openLightbox(shot.dataset.full || shot.querySelector("img")?.src);
});

document.getElementById("lightbox").addEventListener("click", closeLightbox);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

window.addEventListener("scroll", () => {
  document.getElementById("nav").classList.toggle("is-scrolled", window.scrollY > 8);
}, { passive: true });

applyI18n();
hydrateRelease();
