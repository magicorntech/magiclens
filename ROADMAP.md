# MagicLens — Yol Haritası

**Proje:** Electron + Vite + TypeScript masaüstü uygulaması. Localdeki kubeconfig dosyalarını bulup Kubernetes cluster yönetim/dashboard arayüzü sunuyor (+ "Sparks" not/vault özelliği).
**Branch:** `release/v0.1.17` (klon: 2026-08-16)
**Bu doküman:** Her önemli adımdan sonra güncellenecek ilerleme/yol haritası kaydı.

---

## 1. Şikayet: Donma + Aşırı RAM Tüketimi

Kod tabanı taranarak (main process k8s katmanı, IPC, renderer state, persistence, kubeconfig discovery) kök nedenler tespit edildi.

### Öncelik 1 — IPC "destroyed" listener birikimi (SİSTEMİK, yüksek güven)
**Sorun:** Stream başlatan her IPC handler, `WebContents` nesnesine yeni bir `'destroyed'` listener ekliyor ama hiçbiri temizlenmiyor. Pencere kapanana kadar birikiyor.

Etkilenen dosyalar:
- `src/main/ipc/resource.handlers.ts:65` — her tab/namespace değişiminde tetikleniyor
- `src/main/ipc/pod.handlers.ts:56` (pod logs), `:81` (pod exec) — her container switch / restart'ta
- `src/main/ipc/node.handlers.ts:16` (node exec)
- `src/main/ipc/terminal.handlers.ts:50` (local terminal)
- `src/main/ipc/portForward.handlers.ts:22` ve `:49` (port-forward)

**Neden önemli:** Normal kullanımda (tab değiştirme, log restart, exec açma) her seferinde bir closure kalıcı olarak birikiyor — "uzun süre açık kaldıkça yavaşlama/RAM artışı" belirtisiyle birebir örtüşüyor.

**Fix:** Pencere başına tek bir `'destroyed'` handler'ı (örn. `src/main/window.ts` içinde), her stream-start'ta değil, tüm `stopAllForSender` metodlarını bir kez çağıracak şekilde kaydedilmeli.

**Efor:** Küçük-orta (7 site'ı tek pattern'e taşımak)

### Öncelik 2 — Senkron "vault" taraması main thread'i bloke ediyor (donmanın asıl kaynağı, yüksek güven)
**Sorun:** `src/main/notes/vaultStore.ts:421-487` içindeki `walkMarkdownFiles`/`readNoteFromDisk` senkron (`readdirSync`/`readFileSync`) çalışıyor. `reminderScheduler.ts:13,173-197` her **5 saniyede bir** `listDueReminders()` üzerinden tüm vault'u yeniden okutuyor; cache de hemen her not yazımında invalidate ediliyor (`vaultStore.ts:728,744,748`).

**Neden önemli:** Electron main process tek thread. Büyük bir not vault'unda bu senkron disk taraması event loop'u bloke ediyor — k8s watch flush'ları dahil **tüm** IPC durduğu için kullanıcı bunu "donma" olarak yaşıyor.

**Fix:** Taramayı async/incremental yap; reminder tick'inde her seferinde tam yeniden tarama yerine sadece yapısal değişiklikte tara, reminder'lar için ayrı hafif bir index tut.

**Efor:** Orta

### Öncelik 3 — Cluster disconnect log/exec akışlarını durdurmuyor (düşük-orta güven)
`src/main/ipc/cluster.handlers.ts:30-37` sadece `resourceWatchManager` ve `portForwardManager` için `stopAllForCluster` çağırıyor; `podLogManager`/`podExecManager`/`nodeExecManager` için böyle bir metod bile yok (sadece `stopAllForSender` var — `podLogManager.ts:82`, `podExecManager.ts:223`). Disconnect, ilgili React bileşeni unmount olmadan gerçekleşirse k8s stream'i main process'te sonsuza dek çalışmaya devam edebilir.

**Fix:** Log/exec/node-exec manager'lara `stopAllForCluster` ekle, `CLUSTER_DISCONNECT`'te çağır.
**Efor:** Küçük

### Öncelik 4 — `AgeCell` başına ayrı `setInterval` (kozmetik, düşük öncelik)
`src/renderer/src/components/ResourceTable/AgeCell.tsx:14-17` — her görünür "Age" hücresi kendi 30sn timer'ını oluşturuyor. Virtualization sadece 60+ satırda devreye giriyor (`ResourceTable.tsx:563`), o yüzden orta boy tablolarda onlarca eşzamanlı timer olabiliyor. Leak değil (cleanup var), ama gereksiz CPU/re-render.

**Fix:** Tek paylaşımlı "tick" store'a konsolide et.
**Efor:** Küçük

### Zaten iyi durumda olanlar (kontrol edildi, sorun yok)
- `resourceWatchManager.ts`, `podLogManager.ts`, `podExecManager.ts` — informer lifecycle düzgün
- `usePodMetricsHistoryStore.ts` / `useNodeMetricsHistoryStore.ts` — sınırlı geçmiş (`MAX_SAMPLES_PER_POD=180`, `MAX_TRACKED_PODS=12`)
- `useTopologyGraph.ts:9-16` — geçmişte tespit edilip düzeltilmiş bir RAM bug'ı (7 eşzamanlı topology informer) hakkında yorum içeriyor. **Not:** Bu, watch/listener lifecycle'ın bu kod tabanında tekrarlayan bir zayıf nokta olduğunu gösteriyor — Öncelik 1 aynı sınıf hatanın başka bir örneği.
- Tab switching düzgün unmount/cleanup yapıyor (`ClusterTabBar.tsx:32-33`, `ResourceKindTabs.tsx:456-464`) — sızıntı renderer'da değil, main process listener kaydında.

---

## 2. Genel Proje Sağlığı

Hafif bir tarama ile tespit edilenler:

| Alan | Durum | Not |
|---|---|---|
| Test altyapısı | ❌ Yok | `vitest`/`jest`/`playwright`/`@testing-library` bağımlılıklarda yok, `src/` içinde hiç `.test.`/`.spec.` dosyası yok |
| Lint | ❌ Yok | ESLint/Prettier config dosyası bulunamadı (repo genelinde) |
| TypeScript strict mode | ✅ Açık | `tsconfig.web.json` → `strict: true` |
| `any` kullanımı | ✅ Az | Sadece 1 yerde |
| TODO/FIXME/HACK | — | 0 (ya gerçekten temiz ya da bu marker'lar kullanılmıyor) |
| CI | ⚠️ Sınırlı | `.github/workflows/release.yml` var ama test/lint çalıştıran bir workflow yok |
| Kod boyutu | ⚠️ Büyük dosyalar | `NotesPage.tsx` (1867 satır), `vpnManager.ts` (1864 satır), `vaultStore.ts` (1210 satır) — bölünmeye aday |

**En kritik açık:** Test coverage sıfır. Öncelik 1-3'teki fix'leri yaparken regresyon riskini azaltacak hiçbir otomatik güvence yok. En azından etkilenen manager'lar (`resourceWatchManager`, `podLogManager`, `podExecManager`, `vaultStore`) için birkaç birim/entegrasyon testi eklemek, bu fix'lerin güvenle yapılmasını sağlar.

---

## 3. Önerilen Sıra

1. [x] **Öncelik 1** — IPC `'destroyed'` listener fan-out'unu pencere başına tek handler'a indir (7 site)
2. [x] **Öncelik 2** — Vault taramasını async/incremental yap, reminder scheduler'ı tam yeniden-tarama yapmayacak şekilde ayır
3. [x] **Öncelik 3** — Log/exec/node-exec manager'lara `stopAllForCluster` ekle
4. [x] **Öncelik 4** — `AgeCell` timer'larını konsolide et
5. [ ] Test altyapısı kur (vitest önerilir, Vite zaten kullanılıyor) — önce etkilenen manager'lar için
6. [ ] ESLint/Prettier config ekle
7. [ ] Büyük dosyaları (`NotesPage.tsx`, `vpnManager.ts`, `vaultStore.ts`) bölmeyi değerlendir

---

## Uygulanan Fix'ler (2026-08-16)

### Öncelik 1 — IPC listener leak
Yeni paylaşımlı yardımcı: [`src/main/ipc/senderCleanup.ts`](src/main/ipc/senderCleanup.ts) — `onSenderDestroyed(sender, key, cleanup)`. Sender başına `Map<key, cleanup>` tutuyor, `'destroyed'` listener'ı ilk çağrıda bir kez kaydediyor; aynı `(sender, key)` ile tekrar çağrılırsa callback'i biriktirmek yerine üzerine yazıyor. `resource.handlers.ts` (eski `WeakSet` guard'ı kaldırılıp bu yardımcıya taşındı), `pod.handlers.ts` (log + exec), `node.handlers.ts`, `terminal.handlers.ts`, `portForward.handlers.ts` (pod + service) — 7 site de bu yardımcıyı kullanacak şekilde güncellendi.

### Öncelik 2 — Vault senkron tarama
`walkMarkdownFiles`/`readNoteFromDisk` async'e çevrilmedi (tüm `vaultStore.ts` senkron fs API'si üzerine kurulu, ~1200 satır, hiç testi yok — riskli olurdu). Onun yerine asıl mekanizma düzeltildi: `writeNoteFile()` her yazımda **tüm** cache'i (`invalidateCache()`) sıfırlıyordu, bu da bir sonraki okumada (genelde 5sn'lik reminder scheduler tick'i) tüm vault'un senkron olarak yeniden taranıp okunmasına yol açıyordu. Artık `createNote`/`updateNote`/`removeNote` sadece değişen tek notu cache'e in-place işliyor (`upsertCachedNote`/`removeCachedNote`, bkz. [`vaultStore.ts`](src/main/notes/vaultStore.ts)), tam disk taraması sadece cache soğukken (ilk yükleme, vault yolu değişimi, klasör/toplu işlemler) gerçekleşiyor.

### Öncelik 3 — Cluster disconnect temizliği
`podLogManager`/`podExecManager` session'larına `clusterId` eklendi, ikisine de `stopAllForCluster()` eklendi; `nodeExecManager` (zaten `podExecManager` session'larını kullanıyor) buna delege ediyor. `cluster.handlers.ts`'teki `CLUSTER_DISCONNECT` artık bunları da çağırıyor.

### Öncelik 4 — AgeCell timer'ları
Yeni paylaşımlı hook: [`src/renderer/src/hooks/useSharedClockTick.ts`](src/renderer/src/hooks/useSharedClockTick.ts) — `useSyncExternalStore` ile tek bir 30sn `setInterval`, kaç `AgeCell` render olursa olsun. `AgeCell.tsx` bunu kullanacak şekilde sadeleştirildi.

**Doğrulama:** `npm run typecheck:node` ve `npm run typecheck:web` temiz geçti. `npm run dev` ile uygulama başlatıldı, main process hatasız ~1 dakika stabil çalıştı (görsel doğrulama yapılamadı — bu ortamda ekran kaydı izni yok, pencere kullanıcının kendi ekranında açık).

**Not:** Test altyapısı olmadığı için bu fix'ler manuel olarak (typecheck + canlı çalıştırma) doğrulandı, otomatik regresyon testi yok. Roadmap madde 5 (vitest kurulumu) hâlâ açık ve öncelikli.

---

## 4. UI/UX İyileştirmeleri (2026-08-16, ikinci oturum)

### Resource-kind tab bar düzeltmeleri
- Pinlenmiş tab'lar kapat (X) butonu göstermiyordu, pinlenmemişler gösteriyordu → farklı genişlik ("biri büyük biri küçük"). `.ml-resource-tab-label-actions`'a `min-width: 48px` verildi, artık tüm tab'lar aynı genişlikte.
- Tab'lar arası boşluk 2px → 4px (sıkışık/"içe içe" görünüm gideriliyor).
- Split-view (bölünmüş görünüm) tab bar'ının kenar boşluğu 8px → 14px (sol menüye yapışıklık).

### Kaynak detay drawer'ında çift kapatma ikonu
`ResourceDetailDrawer.tsx`'te antd `Drawer`'ın kendi `title={null}` olmasına rağmen hâlâ render ettiği varsayılan kapatma butonu vardı, altında da `ResourceDetailPanel`'in kendi header'ı (isim + X) ayrıca render oluyordu → 2 X ikonu. Drawer'a `closable={false}` eklendi, tek header/X kaldı.

### Network ve Storage Overview sayfaları (yeni)
Cluster/Workloads/Config overview sayfalarının aynı deseni: [`NetworkOverviewPage.tsx`](src/renderer/src/components/Overview/NetworkOverviewPage.tsx) (Services/Ingresses/NetworkPolicies/EndpointSlices/Endpoints/IngressClasses sayıları, tipe göre Service dağılımı, bekleyen Ingress'ler, endpoint'i olmayan Service'ler) ve [`StorageOverviewPage.tsx`](src/renderer/src/components/Overview/StorageOverviewPage.tsx) (PVC/PV/StorageClass sayıları, bağlı/bağlı-olmayan claim'ler, sahipsiz volume'lar). Sol menüde Network/Storage bölümlerine "Overview" girdisi olarak eklendi (`resourceNavConfig.ts`), `VirtualPageKey`'e `networkOverview`/`storageOverview` eklendi, `ClusterView.tsx`'te wire edildi, `en.ts`+`tr.ts`'e çeviriler eklendi (diğer diller otomatik İngilizce fallback alıyor — `withEnglishFallback` mekanizması sayesinde, `i18n/index.ts`).

### Genel "sağa sola yapışık" sayfa padding sorunu (paylaşımlı, tüm resource-kind sayfalarını etkiliyordu)
`.ml-resource-page` (Pods/Services/PVC/... gibi her tekil kaynak listesi sayfasının kullandığı sınıf) üst/alt padding'i **sıfırdı**, oysa Overview sayfalarının kullandığı `.ml-overview-page` 16px üst/alt padding alıyordu — kaynak tabloları toolbar'dan itibaren üst kenara yapışık duruyordu. `.ml-resource-page` padding'i `12px ... 16px` yapıldı; ayrıca yatay boşluk kaynağı olan `--ml-resource-inline-pad` değişkeni (tab bar + resource page'in ikisi de kullanıyor) 16px'ten 20px'e çıkarıldı.

**Doğrulama:** `npm run typecheck:web` temiz. Dev server HMR ile canlı yansıdı, hata yok, process stabil.

**Açık/bekleyen:**
- ~~Nodes sayfası netleştirme~~ → Kullanıcı üç seçeneği de işaretledi (kolon seçimi zaten vardı; daha fazla widget + serbest yerleşim tasarım denetimine dahil edildi).
- ~~Genel "daha profesyonel app" pasosu~~ → **design-is** skill'i ile yapılandırılmış Dieter Rams denetimi tamamlandı (bkz. bölüm 5). Kullanıcı onayı bekleniyor: `/make-plan` prompt'unu çalıştırıp uygulamaya geçelim mi?

## 5. Tasarım Denetimi (Dieter Rams, design-is skill) — 2026-08-16

Tüm çıktılar: [`DESIGN-IS-2026-08-16/`](DESIGN-IS-2026-08-16/) klasöründe (`00-scope.md`, `01-evidence.md`, `02-scorecard.md`, `03-verdict.md`, `04-handoff-prompt.md`).

**Sonuç: 20/30 → REFINE** (temel sağlam, hiçbir prensip 0 almadı — "start over" değil, "sıkılaştır").

Öne çıkan bulgular:
- **Kullanıcının kendi gözlemi doğrulandı:** Cluster Overview ve Nodes sayfaları neredeyse aynı — ikisi de `useClusterMetrics` + `NodesHealthBanner` + neredeyse özdeş CPU/Memory/Pods kartlarını ayrı ayrı render ediyor.
- Tasarım token sistemi (spacing/tipografi) tanımlı ama hiç zorunlu kılınmamış — `tokens.ts`'teki spacing scale hiçbir CSS değişkenine bağlanmamış (ölü kod), 220 yerde ham hex renk kodu token sistemini es geçiyor.
- `:focus-visible` stili 14.000+ satırlık CSS'te sadece 4 yerde var.
- `prefers-reduced-motion` hiç desteklenmiyor, 17 sürekli-çalışan animasyon var.
- Metin/dürüstlük tarafı **kusursuz** (3/3) — hiç şişirilmiş pazarlama dili, hiç dark pattern yok.

**Öncelikli 5 hamle** (`03-verdict.md`'de detaylı): (1) Cluster Overview/Nodes birleştirme, (2) token sistemini zorunlu kıl, (3) focus-visible ekle, (4) reduced-motion + bundle-splitting, (5) Nodes dashboard'a daha fazla widget + esnek yerleşim (kullanıcı talebi).

### Uygulanan fix'ler (2026-08-16, üçüncü oturum)

- **Overview sayfaları "yapışık" padding:** `.ml-overview-page` kendi subtree'sinde `--ml-resource-inline-pad` tanımsız olduğu için erken düzeltmemizi (Move: resource-kind sayfaları) miras almıyordu — ayrıca 20px olarak sabitlendi.
- **Move 1 (Cluster/Nodes çakışması):** `defaultNodesDashboardPrefs`'te `health`/`resources` bölümleri artık varsayılan olarak **kapalı** (Cluster Overview zaten aynı veriyi gösteriyor); mevcut kullanıcı özelleştirmeleri etkilenmiyor, Settings'ten hâlâ açılabilir.
- **Move 2 (token zorunluluğu, kısmi):** `tokens.ts`'teki spacing scale artık gerçek CSS değişkenleri olarak `buildTheme.ts`'e bağlandı (önceden ölü kod); 2 hatalı token referansı (`--ml-spacing-lg`→`--ml-spacing-md`) düzeltildi; Overview stat kartlarındaki 3 ham hex renk (`#16a34a`/`#d97706`/`#dc2626`) `--ml-success`/`--ml-warning`/`--ml-error` token'larına bağlandı. **Not:** 220 ham renk kodunun tamamını görsel doğrulama yapamadan (bu ortamda ekran erişimi yok) toplu değiştirmek riskli olurdu — sadece en net/güvenli olanlar düzeltildi.
- **Move 3 (focus-visible + a11y):** 14.000+ satırlık CSS'e evrensel bir `:focus-visible` kuralı eklendi (mevcut 4 özel kural önceliğini koruyor); "MFA" artık ilk kullanımda açılıyor (en.ts + tr.ts); 3 kebab (MoreHorizontal) butonuna `aria-label` eklendi; resource-kind tab listesine ArrowLeft/ArrowRight ile klavye navigasyonu eklendi (ARIA `tab` deseni artık tam).
- **Move 4 (reduced-motion):** Global `@media (prefers-reduced-motion: reduce)` kuralı eklendi (tüm CSS animasyon/transition'ları kapsıyor); `App.tsx`'e `MotionConfig reducedMotion="user"` eklendi (framer-motion animasyonları da OS ayarına uyuyor). **Bundle-splitting (Monaco/antd lazy-load) bilinçli olarak ertelendi** — React.lazy() sınırları eklemek editör akışını değiştirir, bunu ekran erişimi olmadan güvenle doğrulayamam.
- **Move 5 (Nodes dashboard, kısmi):** `quickInsights`/`topConsumers` (hotspot analizi — Cluster Overview ile çakışmıyor) artık varsayılan olarak **açık**, kullanıcı bunların var olduğunu fark etmemiş olabilirdi. **Serbest sürükle-bırak yerleşim henüz uygulanmadı** — bu, kendi planımızda da belirtildiği gibi büyük bir mimari karar (resizable-columns vs tam drag-grid), kullanıcı onayı gerekiyor.

**Doğrulama:** `npm run typecheck:web` + `npm run typecheck:node` temiz. Dev server ~5 saattir kesintisiz çalışıyor, tüm HMR güncellemeleri hatasız.

---

## 6. Nodes sayfası — özelleştirme + tasarım birleştirme (2026-08-17)

**Bulunan bug:** `NodesOverviewPage` bölümleri sabit sırada render ediyordu, `dashboardPrefs.order`'ı hiç okumuyordu — Ayarlar'daki sürükle-sırala kaydediliyor ama sayfaya hiç yansımıyordu. Artık sıra gerçekten uygulanıyor.

**Eklenenler:**
- **Yarım/tam genişlik**: Sayfa 2 sütunlu grid; her bölüm Ayarlar'dan `half`/`full` yapılabiliyor (dar pencerede otomatik tek sütun). Tam serbest drag-grid yerine bu seçildi — denetim planındaki düşük riskli seçenek.
- **3 yeni widget** (ek API çağrısı yok, mevcut veriden): Kubelet Versions (sürüm dağılımı + skew uyarısı), Node Roles (rol dağılımı + not-ready sayacı), Capacity Headroom (kapasite vs allocatable farkı — varsayılan kapalı).
- `layoutVersion` migration'ı: varsayılan düzen değiştiğinde kayıtlı eski sıra otomatik güncelleniyor, göster/gizle tercihleri korunuyor.

**Yerleşim düzeltmesi (kullanıcı geri bildirimi):** Yeni widget'ları önce tablonun üstüne koymuştum, sayfanın asıl içeriği olan tabloyu aşağı itiyordu. Sıra: hotspots (katlanabilir uyarı şeridi) → **tablo** → fleet widget'ları → events.

**Tasarım birleştirme:** Nodes sayfası artık Cluster/Workloads/Config overview sayfalarıyla aynı kart dilini kullanıyor — `.ml-detail-section` ile eşleşen spotlight başlık şeridi, alt çizgi ve uppercase başlık tipografisi (`.ml-nodes-page__table-head`, `.ml-nodes-fleet-card__head`, hotspots toggle). Önceden Nodes kendi bespoke düz-başlık düzenini kullanıyordu.

**Karar:** Cluster Overview **kaldırılmadı** (kullanıcı onayıyla) — içinde Nodes'a ait olmayan cluster geneli bilgiler var (namespace/deployment/service sayıları, problemli pod'lar, cluster event paneli). Çakışma zaten Nodes'taki tekrar eden sağlık/kaynak kartları varsayılan kapatılarak giderilmişti.

**Tasarım birleştirme, ikinci ve son tur — bileşen seviyesinde:** Önceki turda sadece CSS ile görsel eşleştirme yapılmıştı (Nodes kendi `.ml-nodes-page__*` sınıflarını kullanıp Cluster Overview'un stiline benzetiliyordu). Kullanıcı "aynı olsun" deyince bunu bileşen seviyesine taşıdım: `NodesOverviewPage` artık Cluster Overview'un kullandığı **gerçek** `OverviewPage`/`DetailOverview`/`DetailSection` bileşenlerini kullanıyor (bespoke section wrapper'lar değil). `NodesFleetWidgets.tsx`'teki 3 widget kendi kart kabuğunu render etmek yerine `*Chip`/`*Body` olarak ikiye bölündü, kabuğu artık saran `DetailSection` sağlıyor. Sayfa başlığı da eklendi ("Nodes overview"), Cluster Overview'daki gibi. Yarım/tam genişlik özelleştirmesi korundu (`DetailOverview`'un flex-column akışı içine `.ml-nodes-overview-row` ile iki-sütunlu satırlar yerleştirilerek).

**Sıralama düzeltmesi (kullanıcı geri bildirimi):** "Recent events" varsayılan sırada `capacity`'den hemen sonra, `health`/`resources`'tan önce duruyordu — kullanıcı görünürde son sırada gördü ama health/resources açılırsa events ortada kalırdı. `events` artık koşulsuz en sonda (`layoutVersion` 3'e çıkarıldı, mevcut kullanıcılar için migration tetiklendi).

## 7. Cluster Overview kaldırıldı, içeriği Nodes sayfasına taşındı (2026-08-17)

Kullanıcı kararını değiştirdi: Cluster Overview tamamen kaldırıldı, içeriği (namespace/deployment/service/problem-pod sayıları, CPU/Memory kapasite-allocatable bilgileri) Nodes sayfasına taşındı — **veri kaybı yok**.

**Kaldırılanlar:** `ClusterOverviewPage.tsx` silindi; `VirtualPageKey`'den `clusterOverview` çıkarıldı; sol menüdeki "Overview → Cluster" girdisi kaldırıldı (Overview bölümünde artık sadece Topology var); `virtualPageLabels.ts`, `resourceKindIcons.tsx`, `AppShell.tsx`, `ClusterView.tsx`'teki tüm referanslar temizlendi.

**Nodes sayfasına eklenenler:**
- **Yeni `summary` bölümü**: Namespaces/Deployments/Services/Problem Pods stat grid'i (Cluster Overview'daki `OverviewStat` kartlarının birebir aynısı, tıklanınca ilgili kaynağa gidiyor).
- **`resources` bölümü genişletildi**: Var olan `NodesResourceGrid` (CPU/Memory/Pods kartları, geçmiş grafiği popover'ı olan — Cluster Overview'unkinden daha zengin) korundu, yanına Cluster Overview'daki `DetailFactGrid` (CPU/Memory kapasite+allocatable + Nodes ready/total) eklendi. İkinci, daha zayıf bir kart grid'i eklemek yerine mevcut daha iyi widget genişletildi.
- Events zaten `NodesEventsStrip` üzerinden `ClusterEventsPanel`'i (node seçili değilken) kullanıyordu — ayrı bir taşıma gerekmedi.

**Migration:** `health`/`resources`/`summary` artık varsayılan **açık** (Cluster Overview kaldırıldığı için tek gösterim yeri burası oldu). Önceden bu üçünü kapatmış olan kullanıcılar için bile `layoutVersion` 4'e çıkarılıp zorla açıldı — aksi halde içerik sessizce kaybolmuş gibi görünürdü.

**Doğrulama:** İki typecheck de temiz, uygulama ~4,5 saattir kesintisiz çalışıyor (canlı cluster bağlantı hataları ortamın internet erişimi olmamasından, koddan bağımsız).

## 8. Sol menü — Topology'yi Overview'dan çıkarma (2026-08-17)

Cluster Overview kaldırılınca "Overview" bölümünde sadece Topology kalmıştı. Kullanıcı Topology'yi bu gruplamadan çıkarmak istedi. Basitçe Topology'yi silmek yerine (özelliği kaybetmemek için), yeni bir nav item tipi eklendi: `NavStandaloneVirtualItem` — Nodes/Namespaces/Events gibi üst seviye tek başına bir menü öğesi, ama bir `ResourceKind` yerine bir virtual page'e (`VirtualPageKey`) işaret ediyor. Topology artık Nodes'un hemen altında, kendi bölümü olmadan, tek başına duruyor. `ResourceMenu.tsx`'te arama/filtreleme/klavye navigasyonu/collapsed-rail görünümlerinin hepsine bu yeni tip için destek eklendi.

## 9. Nodes sayfası — Kubelet Versions/Node Roles yeniden konumlandırıldı (2026-08-17)

Kullanıcı isteğiyle bu iki widget sayfanın en üstüne, hotspots'un (Quick Insights/Top Consumers) bile üstüne taşındı — artık sayfayı açar açmaz ilk görülen şey. `layoutVersion` 5'e çıkarıldı, mevcut kullanıcılar için sıralama migration'ı tetiklendi (göster/gizle tercihleri korunarak).

## 10. Tab / namespace butonu / sayfa içeriği hizalaması (2026-08-20)

**Kök neden — iki denemenin neden tutmadığı:** Hizalama matematiği `global.css` üzerinden hesaplanıyordu, ama `devtools-refine.css` **ondan sonra** import ediliyor (`main.tsx:22`) ve tam bu padding'leri `!important` ile eziyor:

- `.resource-kind-tabs-root { --ml-resource-inline-pad: 0px }` → tab bar gutter'ı 20 değil **0**
- `.ml-resource-page { padding: 0 !important }` → sayfa gutter'ı 20 değil **0**
- `.ml-resource-toolbar { padding: 8px 8px !important }` → namespace butonu **8px**'de

Yani tab bar, sayfa gövdesi ve Nodes overview 0'da, namespace butonu 8'de duruyordu — kullanıcının gördüğü "5px gibi" fark buydu ve `global.css`'te yapılan hiçbir düzeltme etkili olamazdı.

**Çözüm:** Üç satırın paylaştığı tek bir token tanımlandı — `devtools-refine.css` içinde `--ml-resource-gutter: 8px`. Tab bar, toolbar ve `.ml-resource-page-body > .ml-overview-page` (Nodes) artık hepsi bu token'ı kullanıyor, dolayısıyla birlikte hareket ediyorlar. Sonuç: tab kutusunun sol kenarı = namespace butonunun sol kenarı = Nodes sayfa içeriği = 8px; tab ikonu = namespace ikonu = 15px.

**Bonus — drag geri geldi:** Sürükleme tutamacı `left: -6px` ile `.ml-resource-tab-bar__scroll` (`overflow-x: auto`) içinde negatif konumdaydı; içerik kutusunun solu kırpıldığı için **ilk tab'ın tutamacı görünmüyor ve tıklanamıyordu** — kullanıcının "drag kalkmamalı" uyarısının sebebi. `left: 7px` yapıldı (label'ın padding'iyle aynı), böylece tutamaç tam ikon yuvasına oturuyor ve asla kırpılmıyor. Tutamaç görünürken ikon `opacity: 0` oluyor; ikonu kaydırmak yerine gizlemek tab genişliğini sabit tutuyor (aksi halde hover'da tüm şerit titrerdi). Drag mekanizmasına (framer-motion `Reorder` + `dragControls`) dokunulmadı.

---

## İlerleme Günlüğü

- **2026-08-16:** Repo klonlandı, `release/v0.1.17`'ye geçildi. Performans kök-neden taraması (Explore agent) + genel sağlık taraması tamamlandı, roadmap oluşturuldu.
- **2026-08-16:** Öncelik 1-4 fix'leri uygulandı (yukarıya bkz). `npm install` çalıştırıldı (Electron binary'si postinstall'da inememişti, manuel `node install.js` ile indirildi). Typecheck temiz. `npm run dev` ile uygulama çalıştırılıp main process'in hatasız ayakta kaldığı doğrulandı.
- **2026-08-16 (devam):** Tab bar genişlik/spacing düzeltmeleri, drawer çift-X fix'i, Network/Storage Overview sayfaları eklendi, genel resource-page padding sorunu giderildi (bkz. bölüm 4). Nodes özelleştirme ve genel "profesyonel tasarım" talepleri netleştirme bekliyor.
- **2026-08-16 (design-is denetimi):** design-is skill ile Dieter Rams denetimi yapıldı, 20/30 → REFINE (bkz. bölüm 5, `DESIGN-IS-2026-08-16/`). Kullanıcı onayı üzerine önerilen 5 hamlenin çoğu uygulandı: overview sayfası padding'i, Cluster/Nodes çakışması gideriliyor (varsayılan kapalı), spacing token'ları CSS'e bağlandı, evrensel focus-visible + MFA/aria-label/ok-tuşu navigasyonu eklendi, prefers-reduced-motion desteği (CSS + framer-motion) eklendi, Nodes dashboard'da gizli widget'lar (Quick Insights/Top Consumers) varsayılan açıldı. Bundle-splitting ve serbest sürükle-bırak yerleşimi ekran doğrulaması gerektirdiği için bilinçli olarak ertelendi.
- **2026-08-16 (Helm Charts sayfası):** `HelmChartsPage.tsx`'te gerçek bir bug bulundu ve düzeltildi — namespace seçici hiçbir işe yaramıyordu (`useHelmCharts` namespace parametresi almıyor, filtre mantığı seçimi hiç okumuyordu); artık chart'lar seçili namespace'e göre gerçekten filtreleniyor, boş-durum mesajı da duruma göre ayrıştı (cluster'da hiç yok / bu namespace'de yok / arama sonucu yok). Sayfa başlığı ile toolbar arasındaki sıkışık boşluk da (4px → 14px) düzeltildi.
- **2026-08-20 (hizalama kök nedeni):** Tab / namespace butonu / Nodes sayfası hizası düzeltildi (bkz. bölüm 10). Önceki iki denemenin tutmamasının sebebi bulundu: `devtools-refine.css`, `global.css`'ten sonra yüklenip aynı padding'leri `!important` ile eziyor. Ortak `--ml-resource-gutter` token'ı eklendi. Aynı incelemede ilk tab'ın drag tutamacının overflow tarafından kırpıldığı (dolayısıyla sürüklenemediği) tespit edilip düzeltildi.
- **2026-09-01 (menü bar widget paketlenmiş build'de görünmüyordu):** Kök neden: `electron-builder.yml` içindeki `files:` listesinde `resources/**` yoktu, dolayısıyla `resources/icon.png` asar'a hiç girmiyordu. `nativeImage.createFromPath()` eksik dosyada hata fırlatmıyor, **boş** bir image dönüyor; macOS boş tray image'ını sıfır genişlikli status item olarak çiziyor — widget hiç başlamamış gibi görünüyor. Dev'de `__dirname/../../resources` proje köküne denk geldiği için sorun görünmüyordu. `resources/**` eklendi (aynı yol dock/pencere/bildirim ikonları tarafından da kullanılıyordu), `trayImage()` boş image'ı artık net bir hata mesajıyla bildiriyor ve `createTray()` ikon yoksa metin etiketiyle geri düşüyor. Doğrulama: `--dir` paketi alındı, `asar list` ile `/resources/icon.png`'in içeride olduğu, paketlenmiş binary çalıştırılıp `[menu-bar-widget]` hatası üretilmediği görüldü.
- **2026-09-01 (Apple Developer / imzalama):** `docs/code-signing.md` eklendi — Developer ID sertifikası, notarization ve otomatik güncellemenin uçtan uca kurulumu. CI (`release.yml`) zaten 5 secret'a bağlı olarak imzalama/notarization yapacak şekilde kuruluymuş; electron-builder 25'te `APPLE_ID`+`APPLE_APP_SPECIFIC_PASSWORD`+`APPLE_TEAM_ID` set edilince notarization otomatik çalışıyor, ek config gerekmiyor (kaynak koddan doğrulandı). `build/afterSign.js`'te gerçek bir tuzak düzeltildi: hook sadece `CSC_LINK` env var'ına bakıyordu, dolayısıyla keychain'deki bir kimlikle yapılan **yerel** imzalı build'lerde gerçek imzanın üzerine ad-hoc imza basıp hem imzayı hem notarization ticket'ını geçersiz kılıyordu (notarization bu hook'tan ÖNCE çalışıyor). Artık `codesign -dvv` ile mevcut imzaya bakıyor. Tespit mantığı ad-hoc imzalı gerçek build üzerinde test edildi.
- **2026-09-01 (Argo CD entegrasyonu):** Sol menüye "Argo CD" bölümü ve 4 sayfa eklendi (Dashboard, Applications, Application Sets, Projects). **Veri kaynağı kararı:** Argo REST API yerine doğrudan Kubernetes CRD'leri (`argoproj.io/v1alpha1`) okunuyor — böylece ek sunucu URL'i/token'ı/login gerekmiyor, mevcut kubeconfig bağlantısı yetiyor ve uygulamanın geri kalanıyla tutarlı kalıyor. Sync/Refresh, `argocd` CLI'nin deklaratif yaptığı gibi çalışıyor: refresh → `argocd.argoproj.io/refresh` annotation'ı, sync → Application'ın `.operation` alanı (merge-patch). Yeni dosyalar: `src/shared/types/argocd.ts`, `src/main/k8s/argoCdService.ts`, `src/main/ipc/argocd.handlers.ts`, `src/renderer/src/queries/useArgoCd.ts`, `src/renderer/src/components/ArgoCD/*`, `src/renderer/src/icons/ArgoLogo.tsx`. `AppShell.tsx`'teki uzayan `!==` zinciri `CLUSTER_SCOPED_VIRTUAL_PAGES` set'ine çevrildi (Argo sayfaları cluster kapsamlı, header namespace seçicisi gizleniyor).
  **Canlı doğrulama** (ej-env-preprod cluster'ı): 322 Application / 136 ApplicationSet / 4 AppProject — kullanıcının ekran görüntüsündeki sayılarla birebir aynı. İki gerçek şema tuzağı canlı veriyle yakalandı ve düzeltildi: (1) bu cluster'daki app'ler **multi-source** (`spec.sources[]`, `spec.source` değil) — kod zaten iki durumu da karşılıyordu; (2) multi-source app'lerde `status.sync.revision` **boş**, commit `status.sync.revisions[]` içinde — fallback eklenmeseydi Revision sütunu her satırda boş görünecekti. Ayrıca `app.kubernetes.io/name=argocd-server` selector'ının namespace'i (`argo-cd`) ve Ingress'ten türetilen "Open Argo UI" URL'inin (`https://argo-cd.preprod.emlakjet.com`) doğru çözüldüğü teyit edildi.
- **2026-09-01 (bulunan bug, düzeltilmedi):** `src/main/k8s/nodeExecService.ts:30` — debug pod adı 63 karaktere kesiliyor ama sondaki `-` temizlenmiyor; `slice(0,63)` trim'den sonra çalıştığı için uzun GKE node adlarında RFC 1123 ihlali oluşuyor ve **node shell hiç açılmıyor** (HTTP 422). Uygulama çalıştırılırken canlı logda yakalandı.
- **2026-09-01 (tasarım düzeltmeleri):** (1) **Sol menüde Argo isimleri boştu** — `ResourceMenu` etiketleri i18n'den okuyor (`t('resourceNav.virtual.<key>')` / `t('resourceNav.sections.<id>')`), yeni eklenen key'ler `en.ts`/`tr.ts`'e yazılmamıştı. Eklendi. (2) **Argo sayfaları kenarlara yapışıktı** — virtual sayfalar `.resource-kind-tabs-content` içine padding'siz basılıyor, her sayfa kendi gutter'ını vermek zorunda; `.ml-argo-page`'e diğer standalone virtual sayfalarla (`.ml-overview-page`) aynı `16px 20px` verildi. (3) **Cluster tab'ları tab gibi görünmüyordu** — kök neden: şerit `--ml-bg-elevated`, aktif tab `--ml-bg-container` kullanıyordu, ama **light paletinde ikisi de `#ffffff`** (`palette.ts`), bazı şemalarda da `bgElevated: container` (`schemes.ts`). Bu durumda şerit + aktif tab + alttaki içerik aynı renge düşüp tek düz bant oluyordu. Şerit `--ml-bg-layout`'a çevrildi (her şemada container'dan farklı), pasif tab'lara tam kenarlık verildi, aktif tab'ın "içeriğe bağlı" görünümü korundu. Tarayıcıda light palet değerleri pinlenerek ölçüldü: önce şerit=`#ffffff`/aktif=`#ffffff` (aynı), sonra şerit=`#f3f0f9`/aktif=`#ffffff` (farklı).
- **2026-09-01 (Argo sayfaları tasarım revizyonu):** **Padding neden tutmadı:** `.ml-argo-page` `var(--ml-resource-inline-pad, 20px)` kullanıyordu, ama atası `.resource-kind-tabs-root` bu token'ı `devtools-refine.css`'te **`0px`** olarak tanımlıyor — değişken tanımlı olduğu için `20px` fallback'i hiç devreye girmiyordu, padding `16px 0` hesaplanıyordu. `.ml-overview-page` bu yüzden token'ı kendi üzerinde yeniden tanımlıyor. Aynı yaklaşım uygulandı: `.ml-argo-page` kendi `--ml-argo-gutter: 24px`'ini tanımlıyor (dar pencerede 14px). Tarayıcıda gerçek cascade içinde ölçüldü: ata token `0px`, hesaplanan padding `24px`.
  **Diğer düzenlemeler:** (1) Ortak `ArgoPageHeader` (başlık + alt başlık + aksiyon) dört sayfada da kullanılıyor, sayfalar tek bir bölüm gibi okunuyor. (2) Dashboard'daki 7 sayaç, ayraçlı tek bir bordered "statband"e alındı; sıfır olan kötü-durum sayaçları kırmızı yerine soluk gösteriliyor. (3) Application Sets / Projects kartları artık tıklanabilir ve ilgili sayfaya gidiyor (önceden sadece sayı gösteren boş kutulardı). (4) "Needs attention" tablosundan her satırda "Application" yazan anlamsız Kind sütunu kaldırıldı; yerine Project ve gerçek mesaj kolonu geldi. (5) **Gerçek layout bug'ı:** Applications sayfasında iki filtre Select'i (130+140+8=278px) `ResourceTableToolbar`'ın `leading` slot'una konmuştu, ama o slot `devtools-refine.css`'te `width: 200px !important` ile sabitlenmiş — eziliyorlardı. Filtreler `actions` slot'una taşındı.
- **2026-09-01 (resource tab bar revizyonu — cluster şeridiyle uyumsuzluk):** Üstteki cluster tabları tab gibi görünürken alttaki resource tabları düz yazı gibi duruyordu; sadece hover'da beliriyorlardı. Sebep aynı palet çakışması: şerit `--ml-bg-elevated`, aktif tab `--ml-bg-container` kullanıyordu ve light palette'te ikisi de `#ffffff`. Tab'lar `.ml-browser-tab` ile aynı dile getirildi: şerit `--ml-bg-container` (üstteki aktif cluster tab'ının yüzeyini sürdürüyor), pasif tab'lar `--ml-bg-layout` %45 + tam kenarlık (hover gerekmeden görünür), aktif tab `--ml-bg-layout` (yani `.resource-kind-tabs-content`'in rengi) + kenarlık + `margin-bottom:-1px` ile şeridin alt çizgisini köprüleyerek içeriğe bağlanıyor; accent çizgi alt kenar açık kalması gerektiği için üste alındı (`inset 0 2px 0`). Tab'a 1px kenarlık eklenince metin 1px kayacağı için label padding 7px→6px ve drag handle `left` 7px→6px ile telafi edildi. Tarayıcıda ölçüldü — hizalama korunuyor (tab kutusu 8px = namespace butonu 8px, tab ikonu 15px = ns ikonu 15px) ve light/dark ikisinde de şerit≠aktif tab, aktif tab==içerik.
- **2026-09-01 (sağ üst chrome alanı):** Cluster şeridinin sağ üstündeki arama+ikon paneli (`.ml-browser-tabs__actions`) `--ml-bg-elevated` ile boyanıyordu; şerit `--ml-bg-layout`'a çevrilince şeridin sağ köşesinde daha açık bir dikdörtgen olarak kalmıştı. Panel de `--ml-bg-layout`'a alındı (yanındaki `box-shadow` rengi dahil). **Yan etki yakalandı:** arama kutusu (`.app-top-bar-search--strip`) da `--ml-bg-layout` kullanıyordu, panel aynı renge gelince kaybolacaktı — `--ml-bg-container`'a çevrildi (her şemada layout'tan farklı). Üç palette de ölçüldü (mevcut tema, light, dark): panel==şerit ve arama kutusu != panel.
- **2026-09-01 (Argo detay drawer + Settings sayfaları + edit/delete):** (1) **Detay drawer** eklendi — Needs attention, Recent activity (sadece `kind=Application` satırları) ve Applications tablosundaki satırlara tıklayınca açılıyor. İçerik: Properties, Summary, Source (multi-source'ta her repo numaralı), Destination, Sync policy, Managed resources (`status.resources`), Last operation, History (`status.history`), Events. Alan yolları canlı cluster'da doğrulandı — `history` boş liste, `resources[]` kayıtlarında health yok (ConfigMap/Service'te health kavramı yok), `operationState.operation.initiatedBy` ya `{automated:true}` ya da `{username}`. (2) **Edit/Delete** drawer başlığına eklendi; Application bir CRD olduğu için mevcut generic `dynamic` mutation yolu (`resource.getManifest` + paylaşılan YAML editör, `resource.delete`) kullanıldı, Argo'ya özel yazma kodu yok. Delete onay istiyor ve Argo'nun resources-finalizer'ının yönetilen tüm kaynakları da sileceğini açıkça söylüyor. (3) **Repositories ve Clusters** sayfaları eklendi — ikisi de Argo'nun namespace'indeki etiketli Secret'lardan okunuyor (`argocd.argoproj.io/secret-type=repository|cluster`). Canlı doğrulama: 4 repo, 3 cluster — ekran görüntüleriyle birebir.
  **GÜVENLİK KARARI:** repository Secret'ları canlı kimlik bilgisi taşıyor (`username`, `password` — gerçek bir Atlassian API token'ı; ayrıca `sshPrivateKey`/`tlsClientCertKey` olabilir). Servis bu anahtarları **hiç decode etmiyor**; sadece `name`, `url`, `type`, `project` okunuyor. Böylece kimlik bilgileri renderer'a, UI'a veya log'a hiçbir şekilde ulaşmıyor. `secretValue()` üzerindeki yorumda bu açıkça belirtildi.
  **EKSİK:** Ekran görüntüsündeki iç içe "Settings" alt-grubu yapılmadı — mevcut nav modeli (`section` → `entries`) iç içe grup desteklemiyor, eklemek `ResourceMenu`'nün render/arama/klavye/collapsed-flyout yollarının hepsini değiştirmeyi gerektiriyordu. Repositories ve Clusters şimdilik Argo CD bölümünün altında düz girdiler olarak duruyor.
- **2026-09-01 (Repositories/Clusters detay drawer):** Satır içi edit/delete butonları kaldırıldı; onun yerine satıra tıklayınca uygulamanın **mevcut generic Secret detay drawer'ı** (`ResourceDetailDrawer`, `kind="Secrets"`) açılıyor. Bu drawer zaten Properties / Events / maskeli Data alanları / kalem-çöp kutusu aksiyonlarını içeriyor — yani kullanıcının ekran görüntüsündeki ekranın ta kendisi. Paralel bir UI yazmak yerine `ResourceListItem`'a uyarlayan küçük bir `toSecretItem()` adaptörü eklendi (`ResourceListItem` sadece id/name/namespace/age/status/columns istiyor). Bunun için `ArgoRepository`/`ArgoClusterEntry` tiplerine arkadaki Secret'ın `namespace`'i eklendi. Sonuç: Argo Settings sayfaları uygulamanın geri kalanıyla birebir aynı davranıyor ve edit/delete kodu tek yerde kalıyor.
