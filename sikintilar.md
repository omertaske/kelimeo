Eşleşmeden sonraki süreçte öne çıkan sıkıntılar (workspace’e göre):

✅ Sunucu-istemci socket akışları (join_match, state_patch, turn_changed, opponent_left, game_over), turn timer ve reconnection akışı hazır.
✅ Board hücresi şeması client tarafında genişletildi: usedMultipliers/isBlank/blankAs alanları eklendi; premium çarpanların tekrar uygulanması engellendi.
✅ Türkçe kelime havuzu için güvenli alias eklendi: src/utils/game/turkishWordPool.js; botUtils importu güncellendi.
✅ Multiplayer UI sunucu otoritesine bağlandı: MultiplayerRoom, full_state ile board/rack’i kuruyor; state_patch.boardDiff ile tahta güncelleniyor; skorlar ve sıra senkron.

✅ Oyun otoritesi sunucuda değil (client-driven):
Hamle doğrulama, puanlama ve TileBag işletimi büyük ölçüde istemcide akıyor. Çoklu istemcide hile/çatallanma riski var. Bkz. GameContext.js, Game.js, gameRules.js
✅ Ortak TileBag senkronizasyonu:
“TEK ORTAK TILE BAG” yorumu var ama otoriter/atomik çekim garanti edilmemiş; yarış halinde farklı iki istemci aynı taşı alabilir. Bkz. commitMove
✅ Kullanılan premium karelerin işaretlenmesi:
Hücre modelinde usedMultipliers tutulmuyor gibi; çarpanlar tekrar tekrar uygulanabilir. initializeBoard’da sadece letter/multiplier/isCenter var. Bkz. GameContext.js
✅ Joker (blank) taş eşlemesi:
UI var ama seçilen harfin kalıcı ve tüm istemcilere senkron temsil edildiğine dair alan yok (ör. cell.isBlank ve cell.blankAs). Bkz. BlankLetterModal.js, letterConstants.js
✅ Sözlük doğrulaması ve güven:
Kelime çıkarma/TDK kontrolü istemcide yapılıyor; çok oyunculuda sunucuda yapılmalı. Bkz. findAllWords kullanımı, gameRules.js
✅ Eşleşme sonrası Socket akışları eksik/dağınık:
join_match/game_ready/state_patch/turn_changed/opponent_left/game_over gibi olaylar ve bir “match service/hook” görünmüyor. (Workspace’te Socket istemci kodu dosyası göremedim.)
✅ Sıra ve süre yönetimi:
Turn timer (örn. 30 sn), pass/timeout akışı ve tekrar eden timeout’ta game_over mantığı tanımlı değil. (Bkz. MATCHMAKING_GUIDE.md – rehber var, akış kod tarafında tamamlanmamış.)
✅ Yeniden bağlanma ve idempotensi:
disconnect → grace period → rejoin + request_full_state akışı ve moveId tabanlı idempotensi yok. (Çift işlenmiş hamle riski)
Local-two-player kalıntıları:
Game.js iki oyuncuyu tek istemcide yönetiyor; gerçek çok oyunculu senaryoda tek otorite seçilmeli ve diğer istemci salt izlememeli.
✅ Türkçe büyük/küçük harf normalizasyonu:
Bazı yerlerde doğru kullanılıyor (src/utils/game/botUtils.js → toUpperCaseTurkish), ama tüm veri yolunda zorunlu kılınmalı. Sözlük/hamle karşılaştırmaları kaynağa göre tutarsız olabilir.
✅ İstersen bu tespitleri eslesme.md’ye “Eşleşme sonrası riskler ve aksiyonlar” bölümü olarak ekleyip işaretleyelim. Hazırladığım eklemeyi uygular mısın?

## Eşleşme Sonrası Riskler ve Aksiyonlar

 - [x] Sunucu-otoriteli hamle doğrulama ve skor hesaplama: tiles sağlandığında server tam doğrulama/puanlama yapıyor; tiles yoksa geçici minimal yol kullanılıyor.
 - [x] TileBag’i sunucuda tut ve çekimleri atomik yap: TileBag server state’e alındı, çekimler tek akışta işleniyor (Node tek-thread; event handler’lar ardışık). 
- [x] Board hücresi için usedMultipliers alanı ekle; bir kez kullanıldıktan sonra tekrar uygulanmasın (client-level uygulandı)
- [x] Joker taş için kalıcı alanlar: cell.isBlank ve cell.blankAs (client-level kalıcı alan eklendi)
- [x] Socket akışları: join_match, game_ready, state_patch, turn_changed, opponent_left, game_over (istemci servis/hook mevcut)
- [x] Turn timer (örn. 30 sn), pass ve timeout akışları; tekrarlanan timeout’ta game_over (server tarafında mevcut)
- [x] Reconnection: disconnect → grace period → join_match ile dönüş + request_full_state senkronu (server+client mevcut)
- [x] Idempotensi: moveId ile aynı hamle ikinci kez işlenmesin (server tarafında processedMoveIds ile mevcut)
- [x] Sözlük doğrulamasını sunucuya taşı (minimal): place_tiles akışında sunucuda sozluk.gov.tr ile validateWords desteklendi; kapsam genişletilebilir.
- [x] Case normalization: Sunucuda toUpperCaseTurkish/toLowerCaseTurkish yardımcıları eklendi ve place_tiles doğrulamasında kullanılıyor.
 [x] Sözlük doğrulamasını sunucuya taşı (minimal): place_tiles akışında validateWords ile doğrulama (sozluk.gov.tr) eklendi.
 [x] Case normalization: Sunucuda toUpperCaseTurkish/toLowerCaseTurkish yardımcıları eklendi ve kullanılıyor.

Board’lu oyun ekranı komponentinin dosya yolu ve adı (ör: src/components/game/Game.js veya GameRoom.js).
O ekrana giden mevcut route (ör: /game/:roomId veya /rooms/:id).
Plan:

Matchmaking sonrası navigate’i senin route’una çevir.
Multiplayer akışını (join_match, state_patch, turn_changed, vs.) o komponentin içine küçük bir hook ile entegre et.
“MultiplayerRoom”u devreden çıkar (gerekirse silerim).
eslesme.md’de “UI entegrasyonu (özel board)” maddesini ✅ yaparım.
Hook taslağı (senin ekrana takılacak basit adaptör):

// useMultiplayerGame.ts
// İstediğin yere koyabilirsin (ör: src/services/useMultiplayerGame.ts)
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

type Events = {
  onGameReady?: (s: any) => void;
  onStatePatch?: (p: any) => void;
  onTurnChanged?: (t: any) => void;
  onOpponentLeft?: () => void;
  onGameOver?: (g: any) => void;
  onWaitingOpponent?: () => void;
  onFullState?: (s: any) => void;
  onError?: (e: any) => void;
};

export function useMultiplayerGame(matchId: string, userId: string, events: Events = {}) {
  const socketRef = useRef<ReturnType<typeof io>>();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io({ transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.emit('join_match', { matchId, userId });
    socket.on('waiting_opponent', () => events.onWaitingOpponent?.());
    socket.on('game_ready', (s) => events.onGameReady?.(s));
    socket.on('state_patch', (p) => events.onStatePatch?.(p));
    socket.on('turn_changed', (t) => events.onTurnChanged?.(t));
    socket.on('opponent_left', () => events.onOpponentLeft?.());
    socket.on('game_over', (g) => events.onGameOver?.(g));
    socket.on('full_state', (s) => events.onFullState?.(s));
    socket.on('match_error', (e) => events.onError?.(e));

    return () => socket.disconnect();
  }, [matchId, userId]);

  const placeTiles = (move: any) => socketRef.current?.emit('place_tiles', { matchId, userId, move });
  const passTurn = () => socketRef.current?.emit('pass_turn', { matchId, userId });
  const leaveMatch = () => socketRef.current?.emit('leave_match', { matchId, userId });
  const requestFullState = () => socketRef.current?.emit('request_full_state', { matchId, userId });

  return { connected, placeTiles, passTurn, leaveMatch, requestFullState };
}

Komponent entegrasyon örneği (senin board ekranına takılacak):

// Board ekranındaki komponent içinde (örnek kullanım)
// Not: Buradaki setState çağrılarını kendi state/Context’ine uyarlayacaksın.
function GameScreen({ matchId, userId }) {
  const { connected, placeTiles, passTurn, leaveMatch, requestFullState } =
    useMultiplayerGame(matchId, userId, {
      onGameReady: (s) => /* tüm board/raf/skoru s ile kur */,
      onStatePatch: (p) => /* patch’e göre board/raf/skoru güncelle */,
      onTurnChanged: (t) => /* aktif oyuncu/süre göstergesi */,
      onOpponentLeft: () => /* bekleme overlay’i */,
      onGameOver: (g) => /* sonuç ekranı */,
      onWaitingOpponent: () => /* “rakip bekleniyor” */,
      onFullState: (s) => /* senkron tam state */,
      onError: (e) => /* toast/log */,
    });

  const onUserMove = (move) => {
    // move: senin board’un ürettiği hamle modeli
    placeTiles(move);
  };

  return (
    // mevcut board UI’n
    // butonlar: onUserMove, passTurn, leaveMatch vb.
    // bağlantı/süre/aktif oyuncu göstergelerini UI’na bağla
    <div>...</div>
  );
}


Aşağıdaki sorunlar, mevcut workspace’e bakınca “eşleşme sonrası oyun” akışını bozan başlıklar:

✅ Yanlış ekran/route kullanımı (legacy ekran açılıyor)

Eşleşmeden sonra görünen ekranın, legacy olan src/components/Game.js olması muhtemel. Mimari dokümana göre ana tahta/raf ekranları “gameRoom” altında tanımlı, “game” klasörü legacy. Bkz. ARCHITECTURE.md (gameRoom birincil, game legacy). Eşleşme sonrası doğru route/komponente yönlendirme eksik.
✅ Gerçek zamanlı (socket) katman eksikliği

İstemci tarafında eşleşme sonrası “join → state sync → turn → move → pass → disconnect/rejoin” olaylarını yöneten bir Socket servis/hook görünmüyor. services/ altında tdkService/storageService var; socket tabanlı “match/multiplayer” servisi yok.
✅ Sunucu-istemci senkronu (game_ready, state_patch, turn_changed, opponent_left, game_over) tanımlı değil; bu yüzden board ekranın çok oyunculu durumu alamıyor.
✅ Oyun otoritesi ve doğrulama (client-driven risk)

Hamle doğrulama, skor ve TileBag işlemleri istemci tarafında kurgulanmış izlenimi var; sunucu-otoriteli kontrol ve sözlük doğrulaması eksik. Çok oyunculuda hile/çatallanma riski doğar. Sözlük/kurallar referansı: oyunkuralları.md.
✅ Board premium kullanımının kalıcı işaretlenmesi

Kurallar, premium karelerin bir kez kullanıldıktan sonra hücrede usedMultipliers=true ile kalıcı işaretlenmesini ister. Bkz. oyunkuralları.md (notlarda açıkça yazıyor). Kodda bu bayrak her hücrede garanti altına alınmış görünmüyor; aksi halde çarpan tekrar uygulanabilir.
Premium tanımları: src/constants/boardConstants.js — konumlar doğru olsa da “kullanıldı mı” bilgisinin oyun state’ine işlenmesi gereklidir.
✅ Joker (blank) taşların kalıcı temsili

Kurallar “isBlank” ve “blankAs” gibi alanlara atıf yapıyor (bkz. oyunkuralları.md), ancak oyun state’inde ve UI’da bu değerlerin kalıcı/senkron tutulduğuna dair net bir veri alanı akışı görünmüyor. Çok oyunculuda jokerin hangi harfi temsil ettiği tüm istemcilerde aynı olmalı.
✅ Eşleşme sonrası süre/sıra yönetimi yok

Turn timer (örn. 30 sn), pas/timeout akışı, tekrar eden timeout’ta otomatik game_over gibi mekanikler tanımlı değil. Çok oyunculuda sıranın kimde olduğunu, sürenin nasıl aktığını UI’a bağlayacak olaylar eksik.
✅ Yeniden bağlanma ve idempotensi eksik

disconnect → grace period → rejoin + tam state senkronu (request_full_state) kurgusu yok.
Aynı hamlenin iki kez işlenmesini engelleyecek moveId tabanlı idempotensi yok.
“Lobby” kalıntıları ve yönlendirme

Mimari dokümanda “lobby” hâlâ geçiyor (bkz. ARCHITECTURE.md); route/menü üzerinden tamamen kaldırıldığı garanti değil. Eşleşme sonrası dönüş path’leri de netleşmeli (oyundan çık → nereye?).
Türkçe kelime havuzu dosyası sorunları

Dosya adı platform-uyumluluk riski: src/utils/game/turkıshWordPool.js “ı” (dotless i) içeriyor. Depoda/CI’da ve bazı IDE’lerde sorun çıkarabilir. src/utils/game/botUtils.js da aynı adı import ediyor; çapraz platformda güvenli değil.
İçerik bütünlüğü bozuk:
Araya karışmış kısa kelime blokları (“ÜST, VAR, YAZ, …”) listeleri, diziyi kirletiyor (ör. satır 35-43 civarı, 76-98, 98-112).
Yinelenen girdiler: ör. “BALCI” ve “BASAK” tekrarı (bkz. satır 237+).
Yazım/alfabe hataları: “CARŞAMBA” (ÇARŞAMBA olmalı) vb. (bkz. satır 269+).
Bu liste, sözlük doğrulamasını yanıltır ve haksız puan/hamlelere yol açar. Sunucu tarafı sözlük kontrolü şart.
✅ Büyük/küçük harf normalizasyonu

Türkçe harfler için normalize edilmediğinde eşleşme/validasyon sapar. src/utils/game/botUtils.js içinde toUpperCaseTurkish kullanımı var; ancak tüm giriş/karşılaştırma noktalarında zorunlu kılındığı garanti değil.
Harf seti/puanlar ile kuralların uyumu

src/constants/letterConstants.js kurallarla genel olarak uyumlu görünüyor; fakat boş/joker taşların skor ve sayısının tüm akışta doğru ele alınması (raf doldurma, skor hesaplama, jokerin 0 puan olması) UI ve state katmanında tekrar kontrol gerektiriyor.
✅ Eşleşme görev dokümantasyonu eksik

İstediğin “eslesme.md” workspace’te görünmüyor; bu nedenle tamamlanma durumunu işaretlemek ve takibi yapmak mümkün değil.
Önerilen kısa yol haritası (sadece yön verici):

Route düzelt: Eşleşme → “gameRoom” tabanlı board ekranına navigate; legacy src/components/Game.js devreden çıkmalı.
İstemci Socket servisi ekle: join_match, state_patch, turn_changed, opponent_left, game_over, request_full_state olaylarını tek bir hook/serviste topla; board ekranına bağla.
Sunucu otoritesi: hamle doğrulama, skor, TileBag çekimi, sözlük check’i server’da olsun; moveId ile idempotent yap.
Turn timer + reconnection grace: timeout → sıra değişimi; ardışık timeout → game_over; disconnect → grace → rejoin/finish.
Board state: usedMultipliers ve joker blankAs alanlarını kalıcı tut; state_patch’lerle tüm istemcilere yayınla.
Word pool bakımı: dosya adını “turkishWordPool.js” yap; listeyi temizle (yinelenen, hatalı ve araya karışmış blokları ayıkla); TDK kontrolüne dayalı whitelist yaklaşımı uygula.

## Eşleşme Sonrası Oyun – Uygulama Algoritması

1) Route ve ekran
   - Matchmaking success → navigate('/gameRoom/:matchId').
   - Legacy ekran (src/components/Game.js) devre dışı bırakılır; board ekranı birincil kaynak olur.

2) Socket/hook entegrasyonu (istemci)
   - useMultiplayerGame hook’u ile bağlan: connect → emit('join_match', { matchId, userId }).
   - Event’leri dinle: waiting_opponent, game_ready, state_patch, turn_changed, opponent_left, game_over, full_state, match_error.
   - Reconnect’te emit('request_full_state') ile tam state senkronu yap.

3) Sunucu otoritesi (doğrulama ve skor)
   - İstemci sadece intent gönderir: place_tiles(move), pass_turn.
   - Sunucu hamleyi doğrular: Türkçe case normalize → yerleşim kuralları → sözlük kontrolü → skor (multipliers) → joker (isBlank/blankAs=0 puan).
   - Başarılı hamlede state’i tek otorite olarak günceller ve yayınlar.

4) TileBag ve hamle commit akışı (atomik)
   - Begin txn/lock (matchId).
   - moveId idempotensi: işlenmişse no-op.
   - Doğrulama → skor → board apply.
   - usedMultipliers=true kalıcı işaretle; boş taşlar için cell.isBlank=true ve cell.blankAs=harf ata.
   - Raf doldurma için TileBag’ten çekimleri atomik yap; TileBag state’ini güncelle.
   - Commit → emit('state_patch') ve emit('turn_changed').

5) UI state güncelleme (board ekranı)
   - onGameReady/full_state → board/raf/skor/timer initial mount.
   - onStatePatch → yalnız diff’i uygula (board/raf/skor).
   - onTurnChanged → aktif oyuncuyu ayarla, geri sayımı başlat/güncelle.
   - onOpponentLeft → bekleme overlay’i göster; dönerse full_state iste.
   - onGameOver → sonuç ekranı ve çıkış rotasına yönlendir.

6) Sıra ve süre yönetimi
   - Turn timer (örn. 30 sn) sunucu tarafından takip edilir; kalan süre state_patch ile yayınlanır.
   - pass_turn akışı: kullanıcı pas → sıra değişir.
   - timeout → otomatik pas; ardışık timeout eşiğinde game_over.

7) Reconnection ve idempotensi
   - disconnect → grace period (örn. 30–60 sn) → rejoin (join_match) + request_full_state.
   - Tüm mutasyon event’lerinde moveId zorunlu; aynı moveId ikinci kez işlenmez.

8) Sözlük ve Türkçe normalizasyon
   - Sunucu sözlük doğrulaması tek kaynak; istemci sözlük sadece görsel yardım.
   - Tüm giriş/karşılaştırmalarda toUpperCaseTurkish kullan; backend’te de aynı kuralı uygula.
   - Türkçe kelime havuzu dosyasını turkishWordPool.js adına taşı; yinelenen/hatalı girdileri temizle.

9) Test planı (e2e ve yarış senaryoları)
   - İki istemci: join → hamle → pass → disconnect/rejoin → game_over.
   - TileBag yarış testi: eşzamanlı çekimde tekil/atomik sonuç doğrulaması.
   - Idempotensi testi: aynı moveId ile çift gönderimde tek işlenme.
   - Timer/timeout: süre dolumu → pas → ardışık timeout’ta game_over.

10) Operasyonel/telemetri
   - match log’ları: moveId, süre, skor, TileBag snapshot.
   - Hata event’lerinde (match_error) kullanıcıya sade mesaj, log’a detay.