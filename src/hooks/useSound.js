import { useCallback, useRef } from 'react';

// Ses dosyalarını import et
import galibiyetSound from '../sounds/galibiyet.mp3';
import maglubiyetSound from '../sounds/maglubiyet.mp3';
import kelimeEklendiSound from '../sounds/kelime_eklendi.mp3';
import kelimeKabulEdildiSound from '../sounds/kelime_kabul_edildi.mp3';
import rakipOynadiSound from '../sounds/rakip_oynadı.mp3';
import toastKelimeAnlamiSound from '../sounds/toast_kelime_anlami.mp3';
import toastUyariSound from '../sounds/toast_uyarı.mp3';

const sounds = {
  galibiyet: galibiyetSound,
  maglubiyet: maglubiyetSound,
  kelimeEklendi: kelimeEklendiSound,
  kelimeKabulEdildi: kelimeKabulEdildiSound,
  rakipOynadi: rakipOynadiSound,
  toastKelimeAnlami: toastKelimeAnlamiSound,
  toastUyari: toastUyariSound,
};

export const useSound = () => {
  const audioRef = useRef({});

  const playSound = useCallback((soundName, volume = 0.5) => {
    if (!sounds[soundName]) {
      console.warn(`Ses bulunamadı: ${soundName}`);
      return;
    }

    // Eğer bu ses için Audio nesnesi yoksa oluştur
    if (!audioRef.current[soundName]) {
      audioRef.current[soundName] = new Audio(sounds[soundName]);
    }

    const audio = audioRef.current[soundName];
    audio.volume = volume;
    audio.currentTime = 0; // Başa sar
    
    audio.play().catch(error => {
      console.warn(`Ses çalınamadı: ${soundName}`, error);
    });
  }, []);

  return { playSound };
};

export default useSound;
