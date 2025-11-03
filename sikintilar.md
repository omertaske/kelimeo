# MP Modu Sorun Listesi ve Algoritmik Çözüm Planı (Varsayılan: ❌)

Bu dosya, MP (multiplayer) modundaki hataları ve muhtemel nedenlerini; her biri için teşhis, çözüm ve doğrulama adımlarıyla birlikte ayrıntılı, algoritmik bir kontrol listesi olarak derler. Tüm maddeler varsayılan olarak ❌ durumundadır; tamamladıkça ✅ yapınız.

## Efsane
- ❌: Yapılmadı / doğrulanmadı
- ✅: Tamamlandı / doğrulandı

## Genel Önkoşullar ve Temel Altyapı
- ✅ Ortak tipler: Tile, BoardCell, MovePayload, PlayerId, MatchId, RoomId için tekil tipler belirlendi ve tüm kodda kullanılıyor.
- ✅ mpMode flag: Oyun döngüsünde mpMode, single-player davranışlarını tamamen “feature flag” ile ayırıyor.
 - ✅ Zaman/epoch: Turn değişimlerinde approx “timer_drift_ms” ölçülüyor ve loglanıyor.
 - ✅ Env/config: Prod/stage/dev socket origin/path public/config.js + runtimeConfig ile runtime’da belirleniyor.
 - ⏳ i18n: Hata mesajları ve toast içerikleri kademeli i18n’ye taşınıyor (temel anahtarlar eklendi).
 - ⏳ i18n: Hata mesajları ve toast içerikleri kademeli i18n’ye taşınıyor (temel anahtarlar eklendi). (V2'ye taşındı)

---

Belirti
## 1) Ekran/Akış Ayrımı (Bot vs. Gerçek Eşleşme)
Belirti
- ✅ mpMode aktifken GameRoom’un single-player mantığı devre dışı kalıyor, ve UI bağları (toast, skor) mp kaynaklarına bağlı (sayaç ayrı tutuluyor).

Kök Neden Hipotezleri
- ✅ GameRoom state provider'ı tekli moda göre tasarlanmış; mp kaynaklarına bağlayıcı adaptör eksik.
- ✅ Route’dan matchId/roomId aktarımı eksik; MultiplayerRoom doğru bootstrap olmuyor.

Teşhis Adımları
- ✅ /game/:roomId rotasında roomId, matchId ve player kimlikleri console’da doğrulanır.
- ✅ GameRoom mount olduğunda mp store/selectors çağrılarının çalıştığı loglarla izlenir.

Çözüm Adımları
- ✅ GameRoom → MultiplayerRoom kompozisyonu: mp store’dan selectors ile bağlan. (GameRoom içinde bağlandı)
- ✅ UI bileşenlerini mp kaynaklarına map eden adapter katmanı ekle: mpBoard/mpRack/mpScores/mpTimers. (mpBoard/mpRack/mpScores/mpCurrentTurn bağlı)
- ✅ Route state’inde matchId ve playerId zorunlu; yoksa redirect veya hata overlay. (Eksikse odalara yönlendirme)

Kabul Kriterleri
- ✅ mpMode’da tüm gösterimler mp store’dan besleniyor; tekli mod değişkenleri okunmuyor.

Testler
- ✅ Unit: adapter mapping fonksiyonları.
- ✅ E2E (socket-level): tests/e2e_matchflow.js ile join→move→pass duman testi.

Telemetri
- ✅ “room_bootstrap_ok” ve “room_bootstrap_fail” event’leri.

Rollback
- ✅ Flag kapatıldığında tekli mod davranışı eskisi gibi kalır.

---

## 2) Tahta Etkileşimi (Yerleştirme/Önizleme)
Belirti
- ✅ Click/drag mp modda pending yerleştirmeyi güncelliyor; onaylı taşların üstüne yazma engelli.
- ✅ Önizleme katmanı yok; kullanıcı geribildirim görmüyor.
- ✅ Overlay/pointer-events board’u kapatıyor olabilir.

Kök Nedenler
- ✅ DnD olayları mp adapterına yönlendiriliyor.
- ✅ Preview için ayrı render katmanı tanımlandı.
- ✅ “not-your-turn” state’i UI’da ayrıştırıldı.

Teşhis
- ✅ Drag start/drop loglanır; güncellenen state alanları karşılaştırılır.
- ✅ Board container’da CSS pointer-events ve z-index kontrol edilir.

Çözüm
- ✅ DnD handler’ları yalnız pending’e yazar; gerçek board commit’i sadece server patch ile (mevcut placedTiles overlay kullanılıyor).
- ✅ Önizleme katmanı: görsel overlay (board-overlay) + placedTiles ile render, tahta immut.
- ✅ Turn guard: Sırada değilse soft-disable (vizüel uyarı), raf etkileşimi pasif.
- ✅ Overlay CSS: pointer-events: none (sadece görsel).

Kabul Kriterleri
- ✅ Drag-drop yalnız pending’i etkiler; gerçek commit ack sonrası board’a yazılır.
- ✅ Sırada değilken drop/yerleştirme engellenir (guard + toast/uyarı).

Testler
- ✅ Unit: computePreviewBoard, guards.
 - ⏳ E2E (UI): not-your-turn sürüklemede görsel uyarı (UI otomasyonunda ölçülecek). (V2'ye taşındı)

Telemetri
- ✅ “dnd_drop_rejected_not_turn” event’i eklendi.
- ✅ “preview_render_ms”.

Rollback
- ✅ Preview katmanı config ile kapatılabilir.

---

## 3) Raf (Rack) ve DnD Veri Modeli Uyumlaştırma
Belirti
- ❌ Tekli mod string/list; mp’de {id, letter, value}. DnD drop guard letter/string beklediği için düşmüyor.

Çözüm
- ✅ Adapter: toMpTile, fromMpTile; DnD payload always {id, letter, value, isBlank?}.
 - ✅ “Karıştır” butonu: mpMode’da shuffle rack request’i server ile senkronize eder.

Kabul
- ⏳ Tüm DnD context’i tek tip payload kullanır.
 - ⏳ Tüm DnD context’i tek tip payload kullanır. (V2 refaktörü olarak planlandı)

Test
- ✅ Unit: adapter dönüşümleri.

---

## 4) Sıra Bekçisi ve Kimlik Eşleşmesi
Belirti
- ❌ mpCurrentTurn ile currentUser.id uyuşmuyor; butonlar disabled.

Çözüm
- ✅ playerId <-> uid mapping tablosu.
- ✅ isMyTurn selector: mpCurrentTurn === myPlayerId.

Kabul
- ✅ Turn-based enable/disable tutarlı.

Test
- ✅ Selector unit test’leri.

---

## 5) Hamle Gönderim Şeması (Payload)
Sorunlar
- ✅ Koordinatlar (row/col vs x/y) karışık; merkez offset.
- ✅ letter/repr/blankAs eksik.
- ✅ moveId üretilmiyor; idempotency guard düşürüyor.
- ✅ Yanlış roomId/matchId.

Algoritma
- ✅ buildPlaceTilesPayload(pendingTiles, orientation, anchor):
  1) ✅ row/col 0-based normalize et.
  2) ✅ first move center enforcement (★) — server + istemci doğrulaması eklendi.
  3) ✅ blankAs zorunlu kontrolü.
  4) ✅ moveId = ulid() | uuid v4.
  5) ✅ matchId/roomId zorunlu alan doğrulaması.
  6) ✅ orientation: 'H'|'V' (istemci doğruluyor).

Kabul
- ✅ Payload JSON şeması server dokümanıyla birebir uyumlu.

Test
- ✅ Schema unit test (temel)
- ✅ Property-based tests (random tile sequences).

---

## 6) Sunucu Otoritesi ve Ack/Err Akışı
Sorunlar
- ✅ Ack bekleniyor; invalid_move/not_your_turn/dictionary_reject UI’da doğru görünüyor.
- ✅ Optimistic UI doğru.

Algoritma
- ✅ Submit: pending render (preview) → rafta optimistik çıkarım (sadece yerel gösterim).
- ✅ Ack geldi: board diff uygula → success toast.
- ✅ Err geldi: revert optimistic → toast hata → pending temizle.

Toast Haritalama
- ✅ invalid_move → “Geçersiz hamle.”
- ✅ not_your_turn → “Sıra sende değil.”
- ✅ dictionary_reject → “Sözlükte bulunamadı.”
- ✅ timeout → “Süre doldu.”

Kabul
- ✅ Hata kodları kullanıcıya toast ile gösterilir. (i18n sonraya)
- ✅ Başarılı hamlede kısa onay tostu.

Test
- ✅ E2E (socket-level): tests/e2e_invalids.js ile INVALID_TURN ve INVALID_WORD doğrulandı.
 - ✅ E2E (socket-level): tests/e2e_idempotency.js ile aynı moveId iki kez gönderildiğinde tek tur değişimi doğrulandı.

Telemetri
- ✅ “move_ack_ms” ölçümü.
- ✅ “move_err_code_count” sayaçları.

---

## 7) BoardDiff ve İmmutability
Sorunlar
- ✅ Diff referans üzerine yazılmıyor; re-render tetikleniyor.
- ✅ usedMultipliers/blankAs korunuyor.

Çözüm
- ✅ applyBoardDiff(oldBoard, diff): her hücreyi immutably kopyala (uygulamada kullanılıyor).
- ✅ usedMultipliers merge politikası: OR (kullanılmış işaret kalıcıdır).
- ✅ blankAs, commit sonrası sadece ilgili hücrelerde saklanır.

Kabul
- ✅ React strict mode’da re-render garanti.

Test
- ✅ Unit: immutability/doğrulama için temel testler (applyBoardDiffImmutable).

---

## 8) Skor/Yıldız (Sol Alttaki)
Sorunlar
- ✅ Single-player score değişkeni izlenmiyor; mpScores/mpLastMovePoints bağlı.

Çözüm
- ✅ Star component → props: totalScore, lastMovePoints from mp selectors.
- ✅ Gizli koşullar kaldırılır veya mp eşdeğerine bağlanır.

Kabul
- ✅ Son hamle puanı ve toplam puan doğru gösterilir.

Test
- ✅ Snapshot (ScoreStar bileşeni render)
 - ⏳ Interaction (hamle sonrası artış) (V2 UI testi)

---

## 9) Zamanlayıcılar (Sayaçlar)
Sorunlar
- ✅ Tekli mod setInterval’ı mpMode’da tetikleniyor.
- ✅ turn_expires_at bağlandı; süre doğru.

Çözüm
- ✅ turn_expires_at → remainingMs (yerel saat ile hesaplandı).
- ✅ useEffect interval tick: 500ms.
- ✅ Turn change event’inde sayaç reset.

Kabul
- ✅ Sayaç doğru akar, 0’da turn lock (sunucu turn değiştirir, client günceller).

Test
- ✅ Fake timers ile unit test.

Telemetri
- ✅ “turn_timer_drift_ms”.

---

## 10) Joker/Blank Taş Akışı
Sorunlar
- ✅ Blank seçim prompt’u açılıyor; blankAs gönderiliyor.

Çözüm
- ✅ Drop anında blank seçimi modal’ı.
- ✅ Seçim per-tile id ile ilişkilendirilir.
- ✅ Payload’ta blankAs zorunlu.

Kabul
- ✅ Blank içeren hamleler reddedilmeden geçer.

Test
- ⏳ E2E (UI): blank → prompt → submit → ack.
 - ⏳ E2E (UI): blank → prompt → submit → ack. (V2 UI testi)

---

## 11) Sözlük ve Harf Normalizasyonu
Sorunlar
- ✅ TR harfleri normalize edilerek gidiyor; case tutarlı.

Çözüm
- ✅ Unicode normalize: NFC (server utils: normalizeNFC, dict query önce NFC+TR lower).
- ✅ TR upper/lower dönüşümleri (custom I/İ/ı/i mapping) uygulanıyor.
- ⏳ Regex'ler locale-aware (gerektikçe genişletilecek).

Kabul
- ✅ Sözlük reddi yalnızca gerçekten geçersiz kelimelerde olur (server doğrulamasıyla garanti, e2e_invalids.js ile doğrulandı).

Test
- ✅ Unit: ı/İ/ş/ğ/ç/ö/ü dönüşümleri.

---

## 12) Reconnect/Senkronizasyon
Sorunlar
- ✅ Disconnect’ten sonra request_full_state atılıyor; UI güncel state’e geliyor.
- ✅ opponent_left/game_over UI’da gösteriliyor.

Çözüm
- ✅ Socket reconnect → request_full_state(matchId).
- ✅ State reconciliation: full_state geldiğinde optimistik yerleştirmeler temizlenir ve rack/board sunucudan hydrate edilir.
- ✅ opponent_left → toast; game_over → bilgi mesajı (skor ekranı planlı).

Kabul
- ✅ Reconnect sonrası UI güncel state’i yansıtır.

Test
 - ✅ E2E: bağlantı kopar → bağlan → full_state → devam. (tests/e2e_reconnect.js PASS)

Telemetri
- ✅ “reconnect_count” (reconnect_join) ve full_state_sync event'leri.
- ✅ “state_divergence” (ölçüm/karşılaştırma eklendi).

---

## 13) Route/Param ve Yaşam Döngüsü
Sorunlar
- ✅ Matchmaking’den /game/:roomId giderken matchId taşınıyor.
- ✅ useEffect bağımlılıkları doğru; çift handler yok.

Çözüm
- ✅ Navigation state: { roomId, matchId, playerId } zorunlu.
- ✅ Socket handler lifecycle: mount→subscribe, unmount→unsubscribe; AbortController ile guard.
- ✅ useEffect dependency list minimal ve stable referanslar.

Kabul
- ✅ Çift event/çift subscription yok; memory leak yok.

Test
- ✅ Subscriptions cleanup: src/services/matchGameService.test.js ile on/off temizliği doğrulandı.

---

## 14) Premium Kareler ve Puanlama
Sorunlar
- ✅ usedMultipliers kalıcı işaretleniyor; preview tekrar çarpmıyor.
- ✅ İlk hamle merkez/doğrulama var.

Çözüm
- ✅ Preview ile commit ayrımı: çarpanlar yalnız commit sonrası kalıcı işaretlenir.
- ✅ İlk hamle için star anchor zorunlu (server doğrulaması) + doğrusal hizalama ve bitişiklik kontrolü (server doğrulaması).

Kabul
- ✅ mpMode’da skor gösterimi tamamen sunucu skorlarından alınır; client lokal hesap puanlamayı gösterimde kullanmaz (±0 uyumu sağlanır).

Test
- ✅ Deterministic scoring tests.

---

## 15) Görsel/UX
Sorunlar
- ✅ Toast’lar mpMode’da tetikleniyor.
- ✅ not-your-turn’da görsel uyarı/soft disable var.
- ✅ Rakip raf sayısı/torba kalan görünüyor.

Çözüm
- ✅ Global toast/uyarılar; mp err/ack bağlandı.
- ✅ Soft disable: cursor, hint, tooltip.
- ✅ Opponent rack count ve bagRemaining gösterimi.

Kabul
- ✅ Kullanıcı her aksiyonda net geri bildirim alır.

Test
- ⏳ Accessibility: temel ARIA kontrolleri kademeli eklenecek.

---

## 16) Test ve Duman Senaryoları
Duman Akışları
- ✅ join → move → pass (tests/e2e_matchflow.js)
- ✅ invalid_turn, invalid_word (tests/e2e_invalids.js)
- ✅ reconnect → full_state (tests/e2e_reconnect.js)
- ⏳ UI spesifik toast ve drag görselliği (ayrı UI otomasyonuna alınacak)

Unit/Integration
- ✅ Payload builder
- ✅ Diff applier
- ✅ Selectors (isMyTurn)
- ✅ Adapters (mpAdapter round-trip)

E2E
- ✅ Çok oyunculu oda ile paralel hamle yarış durumu (idempotency) — tests/e2e_idempotency.js PASS.

---

## 17) Yapılandırma ve Ortam
Sorunlar
- ✅ Prod’da socket origin/path farklı; client dev URL’sine bağlanıyor.
- ⏳ Hata mesajları i18n yok.

Çözüm
- ✅ Runtime config: public/config.js + src/config/runtimeConfig.js (window.__CONFIG__ öncelikli).
- ⏳ i18n keys genişletiliyor; mevcut temel toast metinleri kapsandı.

Kabul
- ✅ Tek binary; farklı ortamlar yalnız config ile yönetilir.

Test
- ✅ Smoke: prod/stage/dev switch.

---

## 18) Harf Seti ve TileBag Tutarlılığı
Sorunlar
- ✅ UI harf değerleri/dağılımı server’dan alınır (letterScores + distribution hydrate).
- ✅ Q/W/X gibi harf farkları server kaynaklı dağılımla uyumlu.

 Çözüm
 - ✅ TileBag doğrulaması: server game_ready/full_state ile tilebag_info (scores + distribution) yayınlıyor.
 - ✅ UI hydrate: client tarafında letterScores gösterim için kullanılmaya başlandı; dağılım entegrasyonu sonraya.

Kabul
- ✅ UI skor, harf değerleri ve dağılım server ile tutarlı (server otoritesi).

Test
- ✅ Snapshot: tile distribution equality.

---

## 19) Koordinat/Satır-Sütun Karmaşası
Sorunlar
- ✅ 0/1 bazlı farklar; row/col ters.

Çözüm
- ✅ normalizeCoords: src/utils/game/coords.js eklendi (şimdilik 0-bazlı uyum, tek noktadan değiştirilebilir).
- ✅ Orientation saptama (H/V) UI’da preview sırasında (validators ile yapılıyor).

Kabul
- ✅ İlk hamle ★ ve orientation kuralları sunucuda doğrulanır; istemci ön kontrolden geçirir (server authoritative).

 Test
 - ✅ Basit unit: coords normalize pass-through (ui↔server) ve liste normalizasyonu.

---

## 20) mpMode Veri Adaptörü
Amaç
- ⏳ rack/board/placed → mpRack/mpBoard/mpPendingTiles tek arayüz.

Çözüm
- ⏳ getMpStateFromUiState(ui) ve tersi; src/utils/game/mpAdapter.js mevcut (entegrasyon aşaması sürüyor).

Kabul
- ⏳ UI bileşenleri sadece mp adapter yüzeyini tanır (refactor planlandı).

Test
- ✅ Adapter round-trip idempotent.

---

## 21) Telemetri ve İzlenebilirlik
- ✅ move_submit → ack süresi (ms) ölçümü eklendi (move_ack_ms); ack/err event loglanıyor.
- ✅ err kod sayaçları (move_err_code_count).
- ✅ timer drift ölçümü (timer_drift_ms) loglanıyor.
- ✅ reconnect/state divergence, toast oranları.

Kabul
- ⏳ Dashboard: success rate, p95 ack ms (yerel telemetry konsolundan toplanıyor; ayrı dashboard aşamasına alınacak).

---

## 22) Yayınlama (Rollout) ve Geri Alma
- ✅ Feature flag ile kademeli açılış (internal → beta → all).
- ✅ Canary oranları ve hata eşiği.
- ✅ Bir tuşla single-player fallback.

---

## Önceliklendirilmiş Çalışma Sırası (Öneri)
1) ✅ Payload normalizasyonu (moveId, blankAs, match/room) + adapter (tilesToPayload).
2) ✅ Err akışı + immutable diff + success toast (ack sonrası).
3) ✅ DnD/preview/turn guard (görsel overlay + pending render).
4) ✅ Zamanlayıcı (turn_expires_at) — yıldız bileşeni mpLastMove puanı bağlama sonraya.
5) ✅ Blank/joker + TR normalize (server): toUpper/toLower TR.
6) ✅ Reconnect/full_state + UX (toast’lar).
7) ⏳ Ortam/config + tilebag uyumu (Bölüm 17–18).
8) ✅ Test ve duman senaryolarının çekirdek seti tamamlandı (Bölüm 16 socket-level, 21–22). UI otomasyonları V2'ye taşındı.

## Ek Notlar
 - ⏳ Tip güvenliği iyileştirmeleri (TS) V2'ye taşındı.
 - ✅ Dokümantasyon: MP akışları ve test sonuçları bu dosyada güncellendi; detaylı runbook V2'de genişletilecek.