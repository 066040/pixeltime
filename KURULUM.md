# PixelTime Kurulumu

Site iki şekilde çalışır:

- **Yerel mod (sunucusuz):** `js/config.js` boşsa. Profil, pomodoro, kronometre, kişisel tuval, sezon kartı çalışır. Her şey o cihazda tutulur. Ekipler ve sıralama kapalıdır.
- **Sunuculu mod:** Supabase bağlanınca ekipler, sıralamalar ve cihazlar arası kayıt açılır.

## 1. Siteyi yayına alma (GitHub Pages)

1. Dosyaları `pixeltime` reposunun ana klasörüne koy.
2. Repo → **Settings → Pages** → Source: **Deploy from a branch**, Branch: **main**, klasör **/(root)** → Save.
3. Birkaç dakika sonra site `https://066040.github.io/pixeltime/` adresinde açılır.

## 2. Sunucuyu bağlama (Supabase, ücretsiz)

1. https://supabase.com adresinde GitHub hesabınla giriş yap, **New project** de. Bölge olarak **Frankfurt (eu-central-1)** seç.
2. Sol menüden **SQL Editor** → **New query**. `supabase/schema.sql` dosyasının tamamını yapıştır, **Run** de.
3. **Authentication → Sign In / Providers** (ya da Settings) → **Allow anonymous sign-ins** seçeneğini aç, kaydet.
4. **Project Settings → API** sayfasından **Project URL** ve **anon public** anahtarını kopyala.
5. `js/config.js` dosyasını aç, ikisini yapıştır:

```js
window.PT_CONFIG = {
  supabaseUrl: 'https://xxxxx.supabase.co',
  supabaseKey: 'eyJhbGciOi...'
};
```

6. **Authentication → URL Configuration** sayfasında **Site URL** kutusuna `https://066040.github.io/pixeltime/` yaz, **Redirect URLs** listesine de aynısını ekle. (E-postayla giriş linkleri buraya döner.)
7. Dosyayı GitHub'a yükle. Sağ üstteki durum "Her şey kayıtlı" olunca sunucu bağlanmış demektir.

`anon public` anahtarı sitede görünmek için tasarlanmıştır; veritabanını tablolardaki güvenlik kuralları (RLS) ve doğrulamalı fonksiyonlar korur. `service_role` anahtarını asla siteye koyma.

## Test modu

- Adresin sonuna `?test` ekle ya da sol üstteki **PixelTime logosuna** art arda 5 kez dokun.
- Test modunda 1 saniye = 25 dakika sayılır, tuval 16 karedir, sunucuya hiçbir şey gönderilmez ve veriler gerçek verilerden ayrı tutulur.
- Kapatmak için logoya tekrar 5 kez dokun.

## Kurallar (sunucu da kontrol eder)

- 1 kare = kesintisiz 25 dakika (pomodoro ya da kronometre).
- Çalışırken uygulamadan 2 saniyeden uzun çıkılırsa o kare açılmaz.
- Günde en fazla 28 kare (~12 saat).
- Aynı anda iki çalışma, gelecekten ya da 14 günden eski kayıt kabul edilmez.
- Ekipler 2-10 kişidir; ekip tuvali kişi sayısına göre büyür (4 kişi → 1024 kare).
