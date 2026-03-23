# Crypto Case (Kasa Savaşı)

Modern, animasyonlu web sitesi ile kasa savaşı deneyimi!

## Özellikler

- 🎨 Modern, responsive tasarım
- 🔐 JWT tabanlı authentication
- 💰 Balance sistemi
- 🎲 Rastgele item kazanma (ağırlık tabanlı)
- ⭐ Item nadirlik sistemi (Common, Rare, Epic, Legendary, Mythic)
- 🎬 Animasyonlu kasa açma
- 👑 Admin paneli (item/kasa yönetimi)
- 📱 Mobil uyumlu

## Kurulum

1. `npm install`
2. `npm start`
3. Tarayıcıda http://localhost:3000 aç

## API Endpoint'leri

### Authentication
- `POST /register` - { email, password, adminKey? }
- `POST /login` - { email, password } -> token döner

### User
- `GET /me` - Kullanıcı bilgileri (auth gerekli)
- `GET /history` - Açılan kasa geçmişi (auth gerekli)

### Cases
- `GET /cases` - Tüm aktif kasalar
- `GET /cases/:id` - Kasa detayı
- `POST /cases/:id/open` - Kasa aç (auth gerekli)
- `GET /cases/:id/odds` - Kasa olasılıkları

### Admin (auth + admin gerekli)
- `GET /admin/items` - Tüm item'lar
- `POST /admin/items` - Item oluştur { name, base_price, weight, payout_percent, rarity }
- `GET /admin/cases` - Tüm kasalar
- `POST /admin/cases` - Kasa oluştur { name, price, items: [id1, id2...] }

## Demo Data

Otomatik yüklenen demo veriler:
- 5 farklı nadirlikte item
- 1 adet starter kasa

## .env

```
JWT_SECRET=degistir_sakla_uzun_gizli_token_buraya
ADMIN_KEY=supersecretadminkey
PORT=3000
```

## Güvenlik Notları

Bu demo amaçlıdır. Prod için:
- Güçlü JWT secret
- HTTPS zorunlu
- Rate limiting
- Input validation
- SQL injection koruması (prepared statements var)
- `POST /balance/withdraw`
