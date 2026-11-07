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

## 3. E-posta (giriş, doğrulama, şifremi unuttum)

Supabase'in hazır e-posta servisi sadece proje ekibine ve saatte 2 mail atar; gerçek kullanıcılar için kendi e-posta servisimizi bağlıyoruz.

1. **Alan adı al** (ör. `pixeltime.app` ya da `pixeltime.com.tr`). Mailler `bildirim@pixeltime...` adresinden gider, spama düşmez.
2. **Resend** (resend.com, ücretsiz plan) hesabı aç → **Domains → Add domain** → alan adını yaz. Verdiği DNS kayıtlarını (TXT/MX) alan adını aldığın yerin DNS sayfasına ekle, "Verified" olana kadar bekle.
3. Resend → **API Keys → Create** → anahtarı kopyala.
4. Supabase → **Authentication → Emails → SMTP Settings → Enable Custom SMTP**:
   - Sender email: `bildirim@alanadin` · Sender name: `PixelTime`
   - Host: `smtp.resend.com` · Port: `465` · Username: `resend` · Password: Resend API anahtarı
5. Supabase → **Authentication → Rate Limits** → "Emails sent" saatlik sınırını 100 yap.
6. Supabase → **Authentication → Sign In / Providers → Email**: "Confirm email" açık, "Minimum password length" **8**.
7. Supabase → **Authentication → Emails → Templates**: aşağıdaki dört şablonu Türkçe yap. **`{{ .Token }}` mutlaka kalsın**: site kodla doğrular (iPhone'da ana ekrana eklenmiş uygulamada link Safari'de açıldığı için kod şart).

**Change Email Address** (hesabını kaydet) — Konu: `PixelTime doğrulama kodun: {{ .Token }}`
```html
<h2>PixelTime hesabını kaydet</h2>
<p>Doğrulama kodun:</p>
<p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p>
<p>Ya da bu linke tıkla: <a href="{{ .ConfirmationURL }}">E-postamı doğrula</a></p>
<p>Bu isteği sen yapmadıysan bu maili görmezden gel.</p>
```

**Reset Password** (şifremi unuttum) — Konu: `PixelTime şifre sıfırlama kodun: {{ .Token }}`
```html
<h2>Şifreni sıfırla</h2>
<p>Kodun: <b style="font-size:28px;letter-spacing:6px">{{ .Token }}</b></p>
<p>Ya da: <a href="{{ .ConfirmationURL }}">Yeni şifre belirle</a></p>
```

**Magic Link** (şifresiz, kodla giriş) — Konu: `PixelTime giriş kodun: {{ .Token }}`
```html
<h2>PixelTime'a giriş</h2>
<p>Kodun: <b style="font-size:28px;letter-spacing:6px">{{ .Token }}</b></p>
<p>Ya da: <a href="{{ .ConfirmationURL }}">Giriş yap</a></p>
```

**Confirm signup** — Konu: `PixelTime doğrulama kodun: {{ .Token }}` (gövde "Change Email Address" ile aynı olabilir)

### Giriş akışı nasıl çalışır
- Kullanıcı profilini kurup hemen çalışmaya başlar (hesap bu cihazda, anonim).
- Çalış sayfasındaki sarı kutudan ya da **Ayarlar → Hesabını kaydet**'ten e-posta + şifre girer, maile gelen kodu yazar. Kareleri kaybolmaz, aynı hesaba bağlanır.
- Başka cihazda: **Giriş yap** → e-posta + şifre. Şifreyi unutursa **Şifremi unuttum** → kod + yeni şifre. İsterse **Şifresiz, kodla gir**.

## 4. PixelTime Saat bağlantısı

Saat, biten her 25 dakikayı hafızasında biriktirir; Wi-Fi bulunca imzalı olarak sunucuya gönderir. Sitede kareler kendiliğinden görünür ("Saatinden 3 kare geldi").

1. `supabase/schema.sql` dosyasını SQL Editor'de tekrar çalıştır (saat tabloları ve fonksiyonları eklenir).
2. Her saat için bilgisayarda: `python3 tools/yeni_saat.py PT-0001`
   - Çıkan `insert into public.devices ...` satırını SQL Editor'de çalıştır.
   - `firmware/pixeltime_sync/cihaz_kimligi.h` oluşur. **Gizlidir, GitHub'a yüklenmez.**
   - Çıkan 6 haneli kod saatin kutusundaki karta basılır (saatin ekranında da gösterilecek).
3. `firmware/pixeltime_sync/ayarlar.h` içine Supabase URL ve anon anahtarı yaz, saate yükle.
4. Sitede **Profil → Saatini bağla** → kodu gir. Saat hesaba bağlanır, Pixel açılır.

Kurallar sitedekiyle aynıdır (25 dk, günde en fazla 28 kare, 14 günden eski kayıt yok, aynı anda iki çalışma yok). Saatin saati 10 dakikadan fazla kaymışsa kayıt reddedilir; saat Wi-Fi'de internetten ayarlanır, kapalıyken RTC (RV-3028) tutar.


`anon public` anahtarı sitede görünmek için tasarlanmıştır; veritabanını tablolardaki güvenlik kuralları (RLS) ve doğrulamalı fonksiyonlar korur. `service_role` anahtarını asla siteye koyma.

## Test modu

- Adresin sonuna `?test` ekle ya da sol üstteki **PixelTime logosuna** art arda 5 kez dokun.
- Test modunda 1 saniye = 1 kare, tuval 16 karedir. Sunucuya hiçbir şey gönderilmez, kayıtlar gerçek hesaptan ayrı tutulur.
- Üstteki mavi şeritte **Kapat**'a basınca test modu kapanır.
- Pixel'i (PixelTime Saat özelliği) denemek için test modunda Profil → **Saat kodunu gir** → `PIXEL`.

## Kuş ekleme

1. Fotoğrafı `img/kuslar/<kuş-adı>.jpg` olarak koy (örneğin `img/kuslar/sakakusu.jpg`). Kare ya da dikey, en az 800 piksel olsun.
2. `js/birds.js` içindeki listeye bir satır ekle, sonuna `true` yaz:
   `['sakakusu', 'Saka kuşu', 'Carduelis carduelis', 'otucu', '', true],`
3. Kategori: `papagan`, `otucu`, `yirtici`, `su` ya da `diger`.

Listede `true` olmayan kuşların fotoğrafı Wikipedia'dan gelir.

## Sunucu güncellemesi

Supabase'i daha önce kurduysan `supabase/schema.sql` dosyasını SQL Editor'de bir kez daha çalıştır. Gradyan kenarlık, sınava göre sıralama, profil gizliliği ve başka kullanıcıların profiline bakma için gerekli.

## Kurallar (sunucu da kontrol eder)

- 1 kare = kesintisiz 25 dakika (pomodoro ya da kronometre).
- Çalışırken uygulamadan 2 saniyeden uzun çıkılırsa oturum bozulur, o kare açılmaz.
- Günde en fazla 28 kare (~12 saat).
- Aynı anda iki çalışma, gelecekten ya da 14 günden eski kayıt kabul edilmez.
- Ekipler 2-10 kişidir; ekip portresi kişi sayısına göre büyür (4 kişi → 1024 kare).
