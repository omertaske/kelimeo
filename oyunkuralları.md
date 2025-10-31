Genel özet

✅ Tahta: 15×15 kare.

✅ Her oyuncunun rafı (rack): en fazla 7 taş.

✅ Taşlar: harf + puan (boş/wild taşların puanı 0).

✅ Her hamlede yatay veya dikey düz bir çizgi üzerinde ardışık olarak taş yerleştirilir; çapraz kelimeler oluşabilir ve onlar da geçerli olmalı.

✅ Hamle geçerliliği sözlük kontrolüne dayanır.

✅ Oyun; bir oyuncu tüm taşlarını bitirip çantayı boşaltırsa veya ardışık yeterli sayıda puansız tur olursa sona erer.

Veri yapıları (uygulama için)

✅ Board[15][15] — hücre: {letter: char|null, isBlank: bool, usedMultipliers: bool}

✅ Multiplier[15][15] — NONE, DL, TL, DW, TW (veya enum)

✅ TileBag — multiset / liste (harf, değer, kalanAdet)

✅ Rack[player] — list (max 7 Tile)

✅ Dictionary — hashset veya trie (hızlı contains(word) gerekiyor)

✅ Player — {score: int, rack: Rack}

Başlatma (init)

✅ initBoard() — çarpanları yerleştir (merkez kare DW).

✅ initTileBag() — standart dağılımı yükle (100 taş, 2 boş). (Standart dağılım aşağıda tam liste var). 
hasbro-new.custhelp.com
+1

✅ Her oyuncu rastgele 7 taş çeker: drawTiles(player, 7).

✅ İlk oyuncu kura ile belirlenir (rastgele çekilen harfe göre A'ya en yakın vb.).

Hamle türleri (her turda birini seçebilirsin)

✅ Play (place tiles) — tahtaya 1 veya daha fazla taş yerleştirip kelime oluştur.

✅ Exchange (swap) — rafındaki n taşı çantaya koyup aynı sayıda yeni taş çek (puan 0). Sadece çantada en az 7 taş kaldıysa izinli. (Resmi kural: çanta 7'den az kaldıysa değiş tokuş yapılamaz). 
Vikipedi
+1

✅ Pass — sıra atlanır, puan 0.

Play (yerleştirme) — doğrulama adımları (zorunlu kontroller)

✅ Yeni yerleştirilen taşların hepsi aynı satırda veya aynı sütunda olmalı.

✅ Yeni taşların kapladığı pozisyonlar kesintisiz bir aralık olmalı; eğer arada boş kare varsa, o kare önceden dolu olmalıdır (yani arada yalnızca önceden konmuş harf olabilir).

✅ İlk hamle: ana kelime merkez kareyi (board[7][7]) kapsamalı.

✅ En az bir yeni taş, tahtadaki mevcut bir harfe komşu olmalı (ilk hamle hariç).

✅ Bir hamle sırasında daha önceden dolu bir kareye taş konamaz (çakışma).

✅ Diagonal (köşegen) yerleştirme yasak.

✅ Hamleyle oluşan tüm yeni kelimeler (ana + çapraz) sözlükte (Dictionary.contains) olmalı.

✅ Eğer herhangi bir geçersizlik varsa hamle reddedilir (veya challenge sisteminize göre işlem yapılır).

Kelime çıkarma mantığı (how to extract words)

✅ Ana kelime: oynanan taşların aynı satır/kolonda oluşturduğu en geniş ardışık blok (baştan sona).

✅ Çapraz kelimeler: her yeni yerleştirilen taş için, karşı yönde (dikine) komşu harflerle bir blok oluşuyorsa o blok da ayrı bir kelime olur.

✅ Tüm bu kelimeler tek tek sözlük kontrolünden geçmelidir.

Puanlama — tam kural

✅ Her oluşturulan kelimenin puanı ayrı ayrı hesaplanır ve toplam hamle puanı bu kelimelerin toplamıdır.

✅ Harf puanları: kelime içinde yer alan her harfin yüz değeri toplanır (blank = 0).

✅ Harf çarpanları (DL/TL): yalnızca o hamlede yeni yerleştirilen harflerin üzerindeki DL/TL etkili olur. Önceden var olan harflerin üzerindeki DL/TL etkisi kullanılmaz.

✅ Kelime çarpanları (DW/TW): hamlede kullanılan yeni bir harf DW/TW karesine yerleşiyorsa, o hamledeki kelimenin toplam skoruna uygulanır; birden çok word multiplier varsa çarpılar çarpılır (ör. iki DW ⇒ ×4, iki TW ⇒ ×9). Yine, yalnızca o hamlede yeni kullanılan DW/TW etkilidir.

✅ Hesaplama sırası: önce her harfin (varsa) letter-multiplier ile çarpılmış değeri toplanır; ardından bütün applicable word-multiplier'lar toplanan toplamın üzerine uygulanır. (letter multipliers first, then word multipliers). 
Vikipedi

✅ Çapraz kelimeler: her biri ayrı ayrı hesaplanır; eğer çapraz kelime yeni konulan harf bir premium kare üzerindeyse onun premium etkisi çapraz kelimeye uygulanır (yine yalnızca yeni konulan kareler için).

✅ Bingo (7 taş kullanma): Eğer oyuncu tek hamlede rafındaki tüm 7 taşı kullanırsa +50 bonus eklenir. 
service.mattel.com

Boş (blank/wild) taşlar

✅ Boş taşın değeri 0.

✅ O oyuncu boş taşı oynarken hangi harfi temsil ettiğini belirtir; o hamlede bildirdiği harf o boş taş için oyunun sonuna kadar sabittir (challenge ile geri alınmazsa).

Geçersiz hamle / challenge (itiraz) — varyantlar

⚠️ Challenge sistemi henüz uygulanmadı. Şu an tüm kelimeler otomatik olarak TDK API ile kontrol ediliyor.

✅ Eğer bir oyuncu hamleyi tamamlayıp taşları çekmeden önce rakibi challenge ederse, oluşturulan tüm kelimeler sözlükte aranır.

✅ Eğer en az bir kelime sözlükte değilse: hamle geri alınır, oynayan oyuncu o tur için puan alamaz (hamle iptal).

✅ Eğer tüm kelimeler geçerliyse: challenger cezalandırılır (çeşitli varyantlar var).



✅ Bir oyuncu turunda değiş tokuş yapmayı seçerse: seçtiği taşları çantaya geri koyar, sonra aynı sayıda yeni taş çeker; bu hamle puansızdır (skoru 0) ve sıra biter.

✅ Restriction: Çantada en az 7 taş kalmışsa değiş tokuş yapılabilir; 7'den azsa değiş tokuş yapılamaz. (Resmi uygulamalarda bu şart yer alır). 
Vikipedi
+1

Oyun sonu ve final puanlama (net kural)

✅ Oyun biterse:

✅ Bir oyuncu tüm taşlarını bitirip çantayı boşalttıysa -> diğer oyuncuların raflarındaki taşların toplam değeri (sum) oynayan oyuncunun puanına eklenir; aynı miktar her rakibin puanından çıkarılır. (Standart kural). 
Vikipedi
+1

✅ Eğer oyun ardışık yeterli puansız tur (genelde 6 puansız tur) nedeniyle bitiyorsa -> her oyuncunun rafındaki taşların toplamı kendi puanından düşülür; o puanlar başka bir oyuncuya eklenmez (bazı turnuvalarda farklı uygulamalar olabilir). 
Vikipedi

✅ Not: Turnuva varyasyonları bu hesapta küçük farklar yapabilir; maç başında netleştirin.

Diğer önemli kurallar / nüanslar (kaçırılmaması gerekenler)

✅ Harf/kelime çarpanlarının etkisi sadece o kare ilk kez kullanılınca geçerlidir. Önceden yerleştirilmiş bir harfin üzerindeki premium bir kare tekrar kullanılmaz. 
Vikipedi

✅ Aynı hamlede oynanan bir kelime hem bir harf çarpanını hem kelime çarpanını kapsıyorsa önce letter multiplier uygulanır, sonra word multiplier. 
Vikipedi

✅ Kelimeyi iki uçtan da genişletmek (ör. TRAIN→STRAINERS) mümkündür; ana kelimeyi genişletirken ortaya çıkan yeni kelimelerin de sözlükte olması gerekir.

✅ Boş taşla oynanan ve sözlükte olmayan kelime challenge sonucunda geçersizse, boş taşın hangi harfi temsil ettiği de geri alınır (her şey geri döner).

✅ Hamlelerin skorunu oyuncu açıklayıp belirtmelidir; saat/clock varsa skoru açıkladıktan sonra karşı tarafın süresi başlar.

✅ Kelimeler tekrar kullanılabilir; aynı kelimeyi oyunda başka bir yerde tekrar koymak yasak değil.

✅ Oyuncuların hangi sözlük veya wordlist kullanacağı (örn. TWL, SOWPODS/CSW, OSW) maç öncesi kararlaştırılmalı; turnuvalarda genelde resmi wordlist kullanılır. (TDK API kullanılıyor)



|     Harf    | Adet | Puan |
| :---------: | :--: | :--: |
|      A      |  12  |   1  |
|      B      |   2  |   3  |
|      C      |   2  |   4  |
|      Ç      |   2  |   4  |
|      D      |   3  |   3  |
|      E      |   8  |   1  |
|      F      |   1  |   7  |
|      G      |   2  |   5  |
|      Ğ      |   1  |   8  |
|      H      |   1  |   5  |
|      I      |   4  |   2  |
|      İ      |   4  |   1  |
|      J      |   1  |  10  |
|      K      |   3  |   1  |
|      L      |   5  |   1  |
|      M      |   2  |   2  |
|      N      |   7  |   1  |
|      O      |   3  |   2  |
|      Ö      |   1  |   7  |
|      P      |   1  |   5  |
|      R      |   6  |   1  |
|      S      |   3  |   2  |
|      Ş      |   2  |   4  |
|      T      |   4  |   1  |
|      U      |   3  |   2  |
|      Ü      |   2  |   3  |
|      V      |   1  |   7  |
|      Y      |   2  |   3  |
|      Z      |   1  |   4  |
| Boş (Joker) |   2  |   0  |

Notlar

Boş taşlar (joker) her harfi temsil edebilir ama puanı 0.

Toplam: 100 taş, 29 farklı harf + 2 boş.

Türkçe’de yüksek puanlı harfler (J, Ğ, F, Ö, V) nadir ve stratejik.

Kelime uzunlukları İngilizce’ye göre daha kısa olduğundan harf sıklıkları buna göre dengelenmiştir.

Hatalar / sınır durumlar (implementasyon uyarıları)

✅ Sözlük doğrulaması: genel contains(word) yeterli; ama bazı turnuva listeleri (TWL, CSW) farklıdır — kullanıcı seçim opsiyonel. (TDK API kullanılıyor)

✅ Tahta güncellemesi: multipliers bir kez kullanıldıktan sonra o hücre usedMultipliers=true işaretlenmeli.

✅ Çok oyunculu (3+): son puanlama kuralları aynı; kapanışta oynayan tüm taşları bitirdiyse diğer oyuncuların kalanları eklenir.

✅ Zamanlı oyun: hamleyi bitirip puan açıkladıktan sonra rakibin saati başlar — uygulamada sıra-mantığı ve clock senkronizasyonu dikkat ister.

✅ Exchange: oyuncu değiş tokuş yapınca çantaya geri koyduğu taşlar karıştırılmalı (shuffle).