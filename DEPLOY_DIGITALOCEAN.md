# Deploy Sabar Hub ke DigitalOcean

Panduan langkah demi langkah: Droplet Ubuntu + PostgreSQL + Caddy (TLS otomatis)
+ systemd. Ditulis untuk dijalankan berurutan dari atas.

**Perkiraan waktu:** 45–60 menit.
**Biaya:** Droplet 2 GB ≈ $12/bulan (1 GB $6 juga cukup untuk awal).

---

## 0. Sebelum mulai

Siapkan:
- Akun DigitalOcean
- **Domain** yang bisa kamu arahkan DNS-nya (wajib untuk HTTPS)
- SSH key di komputermu (`ssh-keygen -t ed25519` kalau belum punya)

Rencana subdomain:
| Subdomain | Untuk |
|---|---|
| `dash.domainmu.com` | Dashboard Next.js |
| `api.domainmu.com` | Backend FastAPI |

> Bot memanggil `api.domainmu.com`, jadi subdomain ini **harus** publik.
> Dashboard boleh dibatasi lagi (lihat §10).

---

## 1. Buat Droplet

DigitalOcean → **Create → Droplets**
- Image: **Ubuntu 24.04 LTS**
- Plan: Basic → Regular → **2 GB / 1 CPU** ($12/bln)
- Region: **Singapore** (paling dekat ke Indonesia)
- Authentication: **SSH Key** (jangan password)
- Hostname: `sabar-hub`

Catat IP-nya, lalu masuk:
```bash
ssh root@IP_DROPLET
```

---

## 2. Arahkan DNS

Di pengelola domainmu, buat 2 record A:
```
dash.domainmu.com   A   IP_DROPLET
api.domainmu.com    A   IP_DROPLET
```
Tunggu propagasi (biasanya 1–15 menit). Cek:
```bash
dig +short api.domainmu.com
```

---

## 3. Amankan server dasar

```bash
# user non-root
adduser --disabled-password --gecos "" sabar
usermod -aG sudo sabar
rsync --archive --chown=sabar:sabar ~/.ssh /home/sabar

# firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

# update
apt update && apt upgrade -y
```

Mulai sekarang pakai user `sabar`:
```bash
ssh sabar@IP_DROPLET
```

---

## 4. Pasang dependensi

```bash
sudo apt install -y python3-venv python3-pip postgresql postgresql-contrib git curl

# Node 20 (untuk Next.js)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node -v && python3 -V
```

---

## 5. Siapkan PostgreSQL

SQLite tidak cocok untuk banyak bot menulis bersamaan (lihat PRE_DEPLOY_AUDIT.md #9).

```bash
sudo -u postgres psql
```
Di dalam psql (**ganti passwordnya**):
```sql
CREATE DATABASE sabar_hub;
CREATE USER sabar WITH PASSWORD 'PASSWORD_DB_YANG_KUAT';
GRANT ALL PRIVILEGES ON DATABASE sabar_hub TO sabar;
\c sabar_hub
GRANT ALL ON SCHEMA public TO sabar;
\q
```

---

## 6. Ambil kode & pasang

```bash
cd ~
git clone https://github.com/denibaik/project-sabar-hub.git
cd project-sabar-hub

# --- Backend ---
cd raynor-hub-backend
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install ".[postgres]"
mkdir -p data/sqlite   # tetap dibuat; dipakai kalau suatu saat balik ke SQLite
```

### Buat kunci acak
```bash
.venv/bin/python -c "import secrets; print('ADMIN_API_KEY=sbr_admin_'+secrets.token_urlsafe(32))"
.venv/bin/python -c "import secrets; print('BOT_REGISTRATION_KEY=sbr_reg_'+secrets.token_urlsafe(32))"
.venv/bin/python -c "import secrets; print('SESSION_SECRET='+secrets.token_urlsafe(48))"
.venv/bin/python -c "import secrets; print('DASHBOARD_PASSWORD='+secrets.token_urlsafe(12))"
```
Simpan keempatnya — dipakai di dua file berikut.

### `raynor-hub-backend/.env`
```bash
nano ~/project-sabar-hub/raynor-hub-backend/.env
```
```ini
DATABASE_URL=postgresql+psycopg://sabar:PASSWORD_DB_YANG_KUAT@localhost:5432/sabar_hub
ADMIN_API_KEY=<hasil generate>
BOT_REGISTRATION_KEY=<hasil generate>
CORS_ORIGINS=https://dash.domainmu.com
HEARTBEAT_TIMEOUT_SECONDS=60
ORDER_RETRY_DELAY_SECONDS=15
ORDER_MAX_RELEASE=8
```

### Frontend
```bash
cd ~/project-sabar-hub/raynor-hub-frontend
npm ci
nano .env.local
```
```ini
BACKEND_URL=http://127.0.0.1:8000
ADMIN_API_KEY=<SAMA PERSIS dengan backend>
BOT_REGISTRATION_KEY=<SAMA PERSIS dengan backend>
DASHBOARD_PASSWORD=<hasil generate>
SESSION_SECRET=<hasil generate>
NEXT_PUBLIC_LOADER_URL=https://api.domainmu.com/files/loader.lua
```
```bash
npm run build
```

> `ADMIN_API_KEY` & `BOT_REGISTRATION_KEY` **harus identik** di kedua file,
> kalau tidak dashboard akan dapat 401 dari backend.

---

## 7. Jalankan sebagai service (systemd)

### Backend
```bash
sudo nano /etc/systemd/system/sabar-api.service
```
```ini
[Unit]
Description=Sabar Hub API
After=network.target postgresql.service

[Service]
User=sabar
WorkingDirectory=/home/sabar/project-sabar-hub/raynor-hub-backend
ExecStart=/home/sabar/project-sabar-hub/raynor-hub-backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

> **Jangan tambahkan `--workers`.** Claim order belum aman dari balapan
> (PRE_DEPLOY_AUDIT.md #7); lebih dari satu worker bisa membuat dua bot
> mengklaim order yang sama → **barang terkirim dobel**.

### Frontend
```bash
sudo nano /etc/systemd/system/sabar-dash.service
```
```ini
[Unit]
Description=Sabar Hub Dashboard
After=network.target

[Service]
User=sabar
WorkingDirectory=/home/sabar/project-sabar-hub/raynor-hub-frontend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### Nyalakan
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sabar-api sabar-dash
sudo systemctl status sabar-api --no-pager
curl -s localhost:8000/health
```

---

## 8. Caddy — reverse proxy + HTTPS otomatis

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

sudo nano /etc/caddy/Caddyfile
```
```caddy
api.domainmu.com {
    reverse_proxy 127.0.0.1:8000
}

dash.domainmu.com {
    reverse_proxy 127.0.0.1:3000
}
```
```bash
sudo systemctl reload caddy
```

Caddy mengurus sertifikat Let's Encrypt sendiri. Cek:
```bash
curl -s https://api.domainmu.com/health
```
Harus keluar `{"status":"ok",...}`.

---

## 9. Hubungkan bot

1. Buka `https://dash.domainmu.com` → login dengan `DASHBOARD_PASSWORD`
2. **Bot Network → Register Bot** → salin perintah yang muncul
3. Di executor akun bot:
```lua
getgenv().BOT_TOKEN = "sbr_bot_xxxxx"
local u="https://api.domainmu.com/files/loader.lua";local ok,s=pcall(function() return game:HttpGet(u) end);loadstring(ok and s or (request or http_request)({Url=u,Method="GET"}).Body)()
```

> **Penting:** ubah `CONFIG.BASE_URL` di `raynor-hub-frontend/public/RaynorHubBot.lua`
> dari `http://127.0.0.1:8000` menjadi `https://api.domainmu.com`, commit, lalu
> `git pull` di server. Kalau tidak, bot tak bisa menghubungi backend.

---

## 10. Pengerasan tambahan (disarankan)

**Batasi dashboard ke IP-mu** — dashboard tak perlu diakses publik:
```caddy
dash.domainmu.com {
    @allowed remote_ip 203.0.113.10   # ganti IP rumah/kantormu
    handle @allowed {
        reverse_proxy 127.0.0.1:3000
    }
    respond 403
}
```

**Backup database** (cron harian):
```bash
mkdir -p ~/backups
crontab -e
```
```cron
0 3 * * * pg_dump -U sabar sabar_hub | gzip > ~/backups/sabar_$(date +\%F).sql.gz
0 4 * * * find ~/backups -name '*.sql.gz' -mtime +14 -delete
```

**Fail2ban untuk SSH:**
```bash
sudo apt install -y fail2ban && sudo systemctl enable --now fail2ban
```

---

## 11. Operasional harian

```bash
# lihat log
sudo journalctl -u sabar-api -f
sudo journalctl -u sabar-dash -f

# restart
sudo systemctl restart sabar-api

# deploy versi baru
cd ~/project-sabar-hub && git pull
cd raynor-hub-backend && .venv/bin/pip install ".[postgres]" && cd ..
cd raynor-hub-frontend && npm ci && npm run build && cd ..
sudo systemctl restart sabar-api sabar-dash
```

---

## 12. Yang MASIH menjadi risiko setelah deploy

Ini belum diperbaiki — sadari sebelum menerima pembeli sungguhan.
Rinciannya di **PRE_DEPLOY_AUDIT.md**.

| Hal | Dampak | Penanganan sementara |
|---|---|---|
| **Claim rawan balapan** (#7) | Dua bot bisa klaim order sama → kirim dobel | **Jalankan 1 worker saja** (sudah diatur di §7) |
| **Order menggantung** (#8) | Order tanpa bot ber-stok `pending` selamanya | Pantau manual di dashboard |
| **Laporan bot dipercaya** (#4) | Token bocor → bisa lapor `fulfilled` palsu | Cabut token lewat dashboard |
| **Belum ada rate limit** (#15) | Endpoint bisa dibanjiri | Batasi dashboard per-IP (§10) |
| **Belum ada Alembic** (#10) | Perubahan skema manual | `ensure_columns()` menangani penambahan kolom sederhana |

---

## 13. Checklist sebelum menerima order sungguhan

- [ ] `https://api.domainmu.com/health` mengembalikan ok
- [ ] Login dashboard berhasil dengan password baru
- [ ] Kunci lama (`dev-*`) tidak dipakai di mana pun
- [ ] `CORS_ORIGINS` = domain dashboard, bukan localhost
- [ ] `BASE_URL` di script bot = `https://api.domainmu.com`
- [ ] Akun bot sudah **selesai tutorial** & punya stok sah
- [ ] Uji 1 order kecil ke akun sendiri, pastikan `done` dan barang sampai
- [ ] Backup DB berjalan (`ls ~/backups`)
- [ ] `sudo systemctl is-enabled sabar-api sabar-dash` → enabled (hidup lagi setelah reboot)
