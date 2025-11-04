# MP Modu Sorun Listesi ve Algoritmik Çözüm Planı (Varsayılan: ❌)
Tüm maddeler varsayılan olarak ❌ durumundadır; tamamladıkça ✅ yapınız.

## Efsane
- ❌: Yapılmadı / doğrulanmadı
- ✅: Tamamlandı / doğrulandı

## P0 – Üretimi/bloklayanı engelleyenler

Build/ESLint hataları (Vercel ve lokal)
Sorun: no-undef (globalThis vb.), env farkları, katı eslint kuralları prod’da derlemeyi kırıyor.
Çözüm: global erişim için güvenli window tespiti, anonim default export’ları isimlendirmek, eslint konfigini CI/Prod ile hizalamak.
Multiplayer idempotency ve yarış koşulları
Sorun: Aynı moveId ile iki kez submit veya çift dinleyici → çift hamle/sıra sapması.
Çözüm: Sunucuda moveId idempotency cache, istemcide duplicate guard; tüm socket aboneliklerinde off/cleanup testleri.
Reconnect ve tam senkronizasyon
Sorun: Disconnect sonrası match/oda kopması, geri dönüşte eksik state.
Çözüm: Reconnect grace, join_match + request_full_state; full_state geldiğinde optimistik yerelleri temizleme.
Otoriter kural doğrulamalarıyla client uyumu
Sorun: İlk hamle merkez, hizalanma, bitişiklik, dolu hücre, sözlük/TR normalize tutarsızlıkları.
Çözüm: Sunucuda kesin doğrulama, istemcide submit öncesi hafif kontrol ve net hata eşlemesi.
Tilebag/Skor tutarlılığı
Sorun: Client ile server dağılım/puan seti farklılıkları skor/torba ekranında sapma yaratıyor.
Çözüm: tilebag_info’yı tek otorite kabul etmek; UI’yi ondan hydrate etmek; divergence telemetrisi.
E2E duman senaryoları
Sorun: Temel akışlar hata verdiğinde fark edilmesi geç oluyor.
Çözüm: Smoke testler (join→move→pass, invalid_turn/word, reconnect→full_state, idempotency) PR/CI’da zorunlu.

### Gerçek kullanıcılar eşleşmiyor (P0) — Matchmaking/Socket kümeleşmesi
Belirti:
- Gerçek iki kullanıcı aynı anda eşleşmeye girdiğinde “rakip bekleniyor” ekranında takılma, bot’a düşme veya farklı odalara bölünme.
- Loglarda iki istemci için ayrı “room created”/“join_queue” olayları, ancak aynı roomId altında buluşamama.

Kök neden (tespit):
- Üretimde birden fazla uygulama instance’ı çalışıyor; socket oda/kuyruk/presence durumu process belleğinde tutuluyor.
- Yük dengeleyici WS bağlantısında sticky session yok; Redis/MessageBroker tabanlı Socket adapter (örn. Redis adapter) yapılandırılmamış.
- Sonuç: Kullanıcı A ve B farklı instance’a bağlandığında aynı kuyruk/oda’yı göremiyor; eşleşme gerçekleşmiyor.

İkincil nedenler (katkıda bulunanlar):
- Namespace/URL farkı: İstemci wss://…/mp, sunucu /socket.io default; veya FEATURE/CONFIG bayrakları iki tarafa farklı queue anahtarı (mode:region:lang:version) ürettiriyor.
- Auth/tenant ayrışması: Token audience/tenant farklı → aynı kuyruğa alınmıyor.
- Versiyon uyumsuzluğu: client_version eşleşmesi zorunlu ama iki uç farklı sürüm → eşleşme reddi (sessiz).

Teşhis (algoritmik, adım adım):
1) Handshake’e instanceId ekleyin ve istemciye geri yansıtın (server: process.env.INSTANCE_ID || hostname).
2) Aynı eşleşme denemesinde iki kullanıcının instanceId değerlerini toplayın; farklı ise küme sorunu olası.
3) Geçici olarak ölçek = 1 (tek instance) çalıştırın; sorun kayboluyorsa kök neden “paylaşımsız durum + non-sticky”.
4) Socket adapter sağlık kontrolü: Redis’e PING, pub/sub echo testi; başarısızsa adapter devre dışı.
5) Queue anahtarını (mode:region:lang:version) her iki uçta loglayın; fark varsa runtime config/normalize hatası.
6) Auth/tenant kontrolleri: token.claims.tenant, audience, region eşleşiyor mu; eşleşmiyorsa tek kuyrukta buluşamaz.
7) L4/L7 sticky yapılandırmasını doğrulayın (yoksa “tamamen paylaşımlı adapter” şart).
8) Eşleşme sürelerini ölçün (p50/p95); tail latency anomali varsa kuyruk/lock çakışması olası.
9) Redis keyspace taraması: queue:* ve match:* anahtar TTL/enkaz (orphan) var mı; varsa GC eksik.
10) Aynı kullanıcıyla tekrar denemede idempotency anahtarları (pair_id/match_idempotency_key) çakışıyor mu kontrol edin.

Çözüm (mimari ve uygulama adımları):
1) Socket/oda durumu ve matchmaking kuyruğu için paylaşımlı adapter kurun:
   - Redis adapter (socket.io-redis veya eşdeğeri), REDIS_URL zorunlu.
   - Publish/Subscribe ile oda yayılımı; process-local oda bilgisini kaldırın.
2) Sticky session gerekirse etkinleştirin; ancak tek başına güvenmeyin (kaynak olarak Redis’i otorite yapın).
3) Deterministik kuyruk anahtarı: queue:{mode}:{region}:{lang}:{client_major} (server ve client aynı adapter ile üretmeli).
4) Kuyruk algoritması:
   - LPUSH queue_key user_ticket{userId, elo, ts, constraints}; 
   - Eşleşme işçisi BRPOP/BLMOVE ile çift çekip sıralı eşleşme dener.
   - Uyuşmazlık (elo/constraint) varsa REQUEUE (LPUSH back) + küçük backoff.
5) Çift taraflı kilitleme/idempotency:
   - SETNX lock: match_lock:{u1}:{u2} with TTL (5–10s); başarılıysa devam.
   - match_id = ULID(); MATCH:HMSET match:{id} meta + TTL.
6) Oda kurulumu ve olay yayını:
   - roomId = match:{id}; her iki socketId için to(roomId).emit('match_found', payload).
   - Sunucu tarafı join_room, istemci tarafı ack sonrası request_full_state.
7) İstemci tarafı guard:
   - “Eşleşme bulundu” ack gelmeden UI commit etme; preview overlay kullan (P2-16 ile uyumlu).
8) Versiyon/flag hizalaması:
   - client_major sürümü ve feature gates sunucu ile uyuşmazsa eşleşmeden önce down-negotiation veya reddi açık hata ile dön.
9) Hata ve retry:
   - 409_ALREADY_PAIRED, 409_LOCK_CONTENTION gibi kodlar; jittered backoff (200–800ms).
10) GC ve TTL:
   - queue ticket TTL (60s), match obj TTL (24h), orphan room cleanup cron.
11) Güvenlik:
   - Tenant/region doğrulaması; payload’ta userId ile socket.owner eşleşmesi; event schema validation.
12) Telemetri (aşağıda metrikler detaylandırıldı) ve alarm eşikleri.
13) Kaçak dinleyici koruması: subscribe/unsubscribe yaşam döngüsü (P1-15 ile uyumlu).
14) Reconnect desteği:
   - reconnect → join_match + request_full_state; optimistic state temizliği (P0-3 ile uyumlu).
15) Idempotency anahtarları:
   - pair_id = hash(userA,userB,queue_key,ts_bucket); duplicate eşleşmeleri engelle.

Doğrulama:
- Tek instance’da yeşil, çok instance’da Redis adapter açıkken yeşil; adapter kapalıyken kırmızı olmalı (kontrollü).
- Çapraz bölge/region farklılığında eşleşme bilinçli reddediliyor mu; kullanıcı mesajı doğru mu.
- E2E smoke “2 gerçek kullanıcı eşleşir” senaryosu p95<3s.

Hata kodu → kullanıcı mesajı eşlemesi (bu sorun özelinde):
- MM_NO_ADAPTER: “Eşleşme hizmeti şu an kullanılamıyor. Lütfen tekrar deneyin.”
- MM_VERSION_MISMATCH: “Sürüm uyumsuzluğu nedeniyle eşleşme yapılamadı. Lütfen uygulamayı güncelleyin.”
- MM_CONSTRAINT_MISMATCH: “Uygun rakip bulunamadı, tekrar deneniyor…
- MM_LOCK_CONTENTION: “Eşleşme hazırlanıyor, lütfen bekleyin…”

### Algoritmik Eşleştirme ve Senkronizasyon Planı (detaylı)
1) Normalize config: mode, region, lang, client_major = derive(window.CONFIG || env).
2) queue_key = format("queue:%s:%s:%s:%s", mode, region, lang, client_major).
3) ticket = { userId, elo, ts=now(), constraints, idempotencyKey }.
4) LPUSH queue_key ticket; EXPIRE queue_key 1h.
5) Worker: BLPOP queue_key timeout=1s; buffer’a al.
6) Buffer’dan uygun aday çiftlerini sıralı dene (elo delta, blacklist, latency).
7) SET NX lock match_lock:{u1}:{u2} ttl=10s; başarısızsa sonraki çifte geç.
8) match_id = ULID(); HMSET match:{match_id} meta; EXPIRE 24h.
9) roomId = "match:"+match_id; server.sockets.in(roomId).synchronize via adapter.
10) Emit to users: match_found{ matchId, roomId, seed, queue_key }.
11) İstemci: join_room(roomId) → ack → request_full_state(matchId).
12) Sunucu: authoritative full_state üret ve yayınla; tilebag_info tek otorite (P0-5 ile uyumlu).
13) İstemci: preview overlay → ack geldiğinde commit; guard not-my-turn aktif (P1-9).
14) Reconnect: on connect → if pending matchId → rejoin + request_full_state.
15) Telemetri: mm_queue_wait_ms, mm_pair_ms, mm_cross_instance_rate, adapter_health.
16) Alarm: adapter_unavailable > 1m, mm_wait_p95 > 5s, mm_abandon_rate > 5%.
17) GC: expired tickets temizle; orphan match temizle.
18) Idempotency: duplicate ticket id → önceki eşleşmeye yönlendir.
19) Backoff: başarısız eşleşmede ticket REQUEUE + jitter.
20) Audit log: match lifecycle (queued → paired → room_joined → started).

## P1 – Doğruluk/kararlılık artırıcılar
7) Hamle payload normalizasyonu

Sorun: row/col, repr/blankAs, matchId/roomId eksik/hatalı olabilir.
Çözüm: Tek adapter ile payload üretimi; property-based testler.
Board diff immutability ve multiplier durumu
Sorun: Diff uygularken referans paylaşımı, multiplier’ların yanlış kalıcılaşması.
Çözüm: Immutable kopya + yalnız ack’te multiplier kalıcı işaretleme.
“Sıra sende değil” guard’ları
Sorun: DnD ve butonlar sıra dışı iken etkileşime izin verebilir.
Çözüm: isMyTurn temelinde UI guard, overlay ve toast; testle doğrulama.
Blank/joker akışı
Sorun: Blank seçim yapılmadan submit; yanlış blankAs repr.
Çözüm: Zorunlu seçici; payload’ta blankAs; drop anında tile-id ile ilişki.
Hata kodu → kullanıcı mesajı eşlemesi
Sorun: Hata mesajları tutarsız/tekrarlı.
Çözüm: errorMap util + i18n anahtarları; toast de-dupe.
Runtime config ve feature flag’ler
Sorun: Ortamlar arası URL/feature farkları.
Çözüm: window.CONFIG; FEATURES ile MP/preview/telemetry gating; rollout/canary.
Telemetri ve loglar
Sorun: Çözülemeyen saha hatalarında veri eksikliği.
Çözüm: move_ack_ms, timer_drift_ms, state_divergence, room_bootstrap; hata oranları.
Sözlük/TR normalize
Sorun: I/İ/ı/i ve NFC farklılıkları false-negative sözlük reddi.
Çözüm: NFC + TR-lower/upper normalize; hata kodunu ayrıştırma.
Abonelik yaşam döngüsü
Sorun: Çift dinleyici/kaçaklar performans ve çift olaylara yol açar.
Çözüm: Mount/unmount’ta off; duplicate listener koruması; unit test.
P2 – UX, erişilebilirlik, performans, borç
16) DnD önizleme katmanı

Sorun: Ack gelmeden board’a yazma; görsel karışıklık.
Çözüm: Preview overlay; ack’te commit.
Erişilebilirlik (a11y)
Sorun: role=button div, klavye erişimi eksik.
Çözüm: Gerçek button/aria-label/tabIndex; jest-axe planı.
UI tutarlılıkları
Sorun: not-your-turn görsel uyarı, skor yıldız overlay süresi.
Çözüm: Konsolide UI durumu; küçük görsel iyileştirmeler.
Kod karmaşıklığı (GameRoom)
Sorun: Büyük bileşen, nested ternary, yan etkiler.
Çözüm: Parçalama (hooks/helpers), selector’lar, for…of, erken return.
Test kapsamı genişletme
Sorun: Adapters/coords/validators sınırlı senaryo.
Çözüm: Edge-case unit testler; CI raporu.
Performans
Sorun: Gereksiz yeniden render; büyük patch’lerde yavaşlık.
Çözüm: Memoized selector’lar, key stabilitesi, lazy render.
Hata dayanıklılığı/geri dönüş
Sorun: Socket kesilmesi/timeout’ta UI akışı belirsiz.
Çözüm: Retry/backoff; offline banner; graceful degrade.
Güvenlik/erişim
Sorun: roomId/matchId manipülasyonu, yetkisiz katılım.
Çözüm: Sunucuda kimlik doğrulama/oda yetkisi; event payload doğrulaması.
Dokümantasyon/runbook
Sorun: Lokal/Prod farkları, test/telemetry anlatımı düşük.
Çözüm: Kısa runbook; sorun giderme bölümü.
CI entegrasyonu
Sorun: Lokalda yeşil ama prod’da kırmızı.
Çözüm: CI’da lint+unit+E2E (socket) pipeline; Vercel build öncesi kalite kapıları.
İlk uygulanacak adım önerisi (hızlı kazanımlar)

P0 paketini kapat: build/ESLint, idempotency, reconnect, server doğrulama uyumları, tilebag/score, E2E smoke.
Ardından P1’de errorMap+i18n, guard’lar, runtime config/flags ve telemetri.
P2’de GameRoom refaktörü, a11y ve performans.

## E2E duman senaryoları
- ❌ Temel akışlar hata verdiğinde fark edilmesi geç oluyor.
- ✅ Smoke testler (join→move→pass, invalid_turn/word, reconnect→full_state, idempotency) PR/CI’da zorunlu.
- ✅ “İki gerçek kullanıcı, iki farklı instance” → Redis adapter açıkken 3s içinde match_found alır; adapter kapalıyken test bilinçli kırmızı.
- ✅ Namespace/queue_key uyuşmazlığı: Farklı queue_key ile eşleşmeme ve doğru kullanıcı mesajı.
- ✅ Version mismatch: Client_major farklıyken eşleşme reddi ve doğru hata kodu.
- ✅ Reconnect → join_match + request_full_state; eşleşme durumu korunur.

## Telemetri ve loglar
- move_ack_ms, timer_drift_ms, state_divergence, room_bootstrap
- mm_queue_wait_ms, mm_pair_ms, mm_total_time_ms
- mm_cross_instance_rate (aynı match içinde farklı instanceId yüzdesi)
- adapter_health (redis_ping_ms, pubsub_echo_ms)
- mm_abandon_rate, mm_timeout_count
- alarm: adapter_unavailable_sustained, mm_wait_p95_anomaly

## Runbook — Eşleşmeme olayında hızlı teşhis
1) Feature flags ve window.CONFIG dump: client_major/mode/region/lang aynı mı.
2) Her iki istemcide instanceId’yı kontrol edin; farklıysa adapter/sticky incelemesi yapın.
3) Redis health: PING, PUB/SUB echo; başarısızsa MM_NO_ADAPTER.
4) Keyspace: SCAN queue:* ve match:*; orphan/TTL sorunlarını kontrol edin.
5) Tek instance’e düşüp yeniden dener misiniz? Sorun kayboluyorsa cluster kaynaklıdır.
6) E2E “çapraz-instance” testini koşturun; p95/p99 gözleyin.
7) Alarm geçmişi: adapter_unavailable ve mm_wait_p95_anomaly kayıtlarını inceleyin.