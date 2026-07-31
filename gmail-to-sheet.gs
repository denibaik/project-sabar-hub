/**
 * Gmail → Google Sheet : ambil order VCGamers dari email, tulis ke sheet.
 *
 * Kolom yang ditulis:
 *   recipient | category | item_key | count | order_ref | source
 *
 * Notifikasi Discord VCGamers tidak memuat username Roblox pembeli, tapi
 * EMAIL-nya memuat. Skrip ini membaca email tersebut, mengurai detail order,
 * lalu menambahkannya sebagai baris di sheet — yang kemudian ditarik otomatis
 * oleh Sabar Hub.
 *
 * ── CARA PASANG ─────────────────────────────────────────────────────────
 * 1. Buka Google Sheet yang dipakai Sabar Hub
 * 2. Extensions → Apps Script
 * 3. Hapus isi Code.gs, tempel seluruh file ini
 * 4. Jalankan `daftarProduk` → Logs menampilkan nama produk yang benar-benar
 *    muncul di emailmu, lengkap dengan tanda mana yang belum dipetakan.
 *    Lengkapi PRODUCT_MAP di bawah berdasarkan daftar itu.
 * 5. Jalankan `mulaiDariSekarang` SATU KALI  ← WAJIB, sebelum apa pun
 *    → menandai semua email lama sebagai sudah ditangani, dan mencatat waktu
 *      mulai. Tanpa ini, order lama yang sudah kamu kirim manual akan
 *      diproses ulang dan pembeli menerima barang dua kali.
 * 6. Jalankan `prosesEmailBaru` sekali secara manual untuk menguji
 *    → Google akan meminta izin akses Gmail & Sheet. Setujui.
 * 7. Triggers (ikon jam) → Add Trigger:
 *       Function        : prosesEmailBaru
 *       Event source    : Time-driven
 *       Type            : Minutes timer
 *       Interval        : Every 5 minutes
 *
 * ── CATATAN PENTING ─────────────────────────────────────────────────────
 * • HANYA email yang tiba SETELAH `mulaiDariSekarang` dijalankan yang diproses.
 *   Email lama diabaikan permanen — pengaman agar barang tidak terkirim dua kali.
 * • Email yang sudah diproses diberi label agar tidak dobel.
 * • Order dengan produk yang TIDAK ada di PRODUCT_MAP tidak ditulis ke sheet;
 *   sebagai gantinya email diberi label "SabarHub/Perlu-Cek" supaya kamu tahu
 *   ada order yang terlewat. Ini disengaja — menebak item berarti berisiko
 *   mengirim barang yang salah.
 */

// ══════════════════════════════════════════════════════════════════════
//  KONFIGURASI — sesuaikan bagian ini
// ══════════════════════════════════════════════════════════════════════

/**
 * Peta nama produk VCGamers → item di katalog game.
 *
 * KUNCI  : nama produk persis seperti di email (huruf besar/kecil diabaikan)
 * NILAI  : { category, item_key, perUnit }
 *
 * `category` dan `item_key` HARUS persis seperti katalog game. Cara termudah
 * mengetahuinya: buka dashboard Sabar Hub → Inventory, salin dari tabel di sana.
 *
 * `perUnit` = berapa buah item per 1 unit yang dibeli. Isi 1 kalau 1 unit = 1 item.
 * Contoh: kalau kamu menjual paket "Trowel x10", isi perUnit: 10.
 */
const PRODUCT_MAP = {
  // ── Seed ────────────────────────────────────────────────────────────
  // Semua nama di bawah dicocokkan dengan SeedData di dalam game.
  "venom spitter":      { category: "Seeds", item_key: "Venom Spitter",   perUnit: 1 },
  "bamboo":             { category: "Seeds", item_key: "Bamboo",          perUnit: 1 },
  "mushroom":           { category: "Seeds", item_key: "Mushroom",        perUnit: 1 },
  "venus fly trap":     { category: "Seeds", item_key: "Venus Fly Trap",  perUnit: 1 },
  "pomegranate":        { category: "Seeds", item_key: "Pomegranate",     perUnit: 1 },
  "moon bloom":         { category: "Seeds", item_key: "Moon Bloom",      perUnit: 1 },
  "hypno bloom":        { category: "Seeds", item_key: "Hypno Bloom",     perUnit: 1 },
  "sun bloom":          { category: "Seeds", item_key: "Sun Bloom",       perUnit: 1 },
  "ghost pepper":       { category: "Seeds", item_key: "Ghost Pepper",    perUnit: 1 },
  "star fruit":         { category: "Seeds", item_key: "Star Fruit",      perUnit: 1 },
  // di game namanya pakai apostrof; listing VCGamers menulisnya tanpa apostrof
  "dragon breath":      { category: "Seeds", item_key: "Dragon's Breath", perUnit: 1 },

  // ── Gears ───────────────────────────────────────────────────────────
  // Rarity dalam kurung pada judul listing diabaikan otomatis oleh cariProduk_.
  "common sprinkler":    { category: "Sprinklers",   item_key: "Common Sprinkler",    perUnit: 1 },
  "uncommon sprinkler":  { category: "Sprinklers",   item_key: "Uncommon Sprinkler",  perUnit: 1 },
  "rare sprinkler":      { category: "Sprinklers",   item_key: "Rare Sprinkler",      perUnit: 1 },
  "legendary sprinkler": { category: "Sprinklers",   item_key: "Legendary Sprinkler", perUnit: 1 },
  "super sprinkler":     { category: "Sprinklers",   item_key: "Super Sprinkler",     perUnit: 1 },
  "super watering can":  { category: "WateringCans", item_key: "Super Watering Can",  perUnit: 1 },
  "trowel":              { category: "Trowels",      item_key: "Trowel",              perUnit: 1 },

  // ── Pets ────────────────────────────────────────────────────────────
  // Dipesan lewat NAMA; backend yang mencocokkannya ke UUID tiap ekor.
  "golden dragonfly":   { category: "Pets", item_key: "Golden Dragonfly", perUnit: 1 },
  "firefly":            { category: "Pets", item_key: "Firefly",          perUnit: 1 },
  "robin":              { category: "Pets", item_key: "Robin",            perUnit: 1 },
  "unicorn":            { category: "Pets", item_key: "Unicorn",          perUnit: 1 },
  "bear":               { category: "Pets", item_key: "Bear",             perUnit: 1 },
  "bald eagle":         { category: "Pets", item_key: "Bald Eagle",       perUnit: 1 },
  // Raccoon BUKAN "Pets" — game menyimpannya di kategori sendiri.
  "raccoon":            { category: "Raccoons", item_key: "Raccoon",      perUnit: 1 },

  // ── Belum dipetakan ─────────────────────────────────────────────────
  // Order ini masuk label "Perlu-Cek" sampai kamu isi sendiri — menebak
  // berarti berisiko mengirim barang yang salah.
  //
  // "Mega Mood": tidak ada di katalog. Yang ada namanya persis "Mega".
  //   Kalau memang itu maksudnya, buang tanda komentar baris berikut:
  // "mega mood": { category: "Seeds", item_key: "Mega", perUnit: 1 },
  //
  // "Lucky Block Secret": tidak ada item bernama "lucky" di katalog.
  // "lucky block secret": { category: "?", item_key: "?", perUnit: 1 },
};

const SHEET_NAME = "Sheet1";        // nama tab di spreadsheet
const SOURCE = "vcgamers";          // asal order — tampil sebagai badge di dashboard
const GMAIL_QUERY_DASAR = 'from:vcgamers.com';   // dipakai mulaiDariSekarang
const GMAIL_QUERY = 'from:vcgamers.com newer_than:7d';
const LABEL_DONE = "SabarHub/Diproses";
const LABEL_CHECK = "SabarHub/Perlu-Cek";

// ══════════════════════════════════════════════════════════════════════
//  Tidak perlu diubah di bawah sini
// ══════════════════════════════════════════════════════════════════════

const HEADER = ["recipient", "category", "item_key", "count", "order_ref", "source"];
const PROP_MULAI = "SABARHUB_MULAI_MS";   // batas waktu: email sebelum ini diabaikan


/**
 * JALANKAN SATU KALI sebelum memakai skrip ini.
 *
 * Menandai semua email order yang ADA SEKARANG sebagai sudah ditangani, lalu
 * mencatat waktu mulai. Setelah ini, hanya email yang tiba SESUDAHNYA yang
 * diproses.
 *
 * Tanpa langkah ini, jalan pertama akan memproses seluruh riwayat email —
 * termasuk order yang sudah kamu kirim manual — dan pembeli menerimanya lagi.
 */
function mulaiDariSekarang() {
  const props = PropertiesService.getScriptProperties();
  const sudahPernah = props.getProperty(PROP_MULAI);

  const labelDone = ambilLabel_(LABEL_DONE);
  let ditandai = 0;
  // beri label pada seluruh email order lama, tanpa menulis apa pun ke sheet
  for (let mulai = 0; ; mulai += 50) {
    const threads = GmailApp.search(GMAIL_QUERY_DASAR, mulai, 50);
    if (!threads.length) break;
    threads.forEach(function (t) { t.addLabel(labelDone); ditandai++; });
    if (threads.length < 50) break;
  }

  const sekarang = Date.now();
  props.setProperty(PROP_MULAI, String(sekarang));

  Logger.log(
    (sudahPernah ? "Batas waktu DIPERBARUI. " : "Batas waktu disetel. ") +
    ditandai + " email lama ditandai sudah ditangani. " +
    "Mulai sekarang hanya email yang tiba setelah " + new Date(sekarang) + " yang diproses."
  );
}


/** Hapus batas waktu — hanya untuk menguji ulang dari nol. */
function resetBatasWaktu() {
  PropertiesService.getScriptProperties().deleteProperty(PROP_MULAI);
  Logger.log("Batas waktu dihapus. Jalankan mulaiDariSekarang lagi sebelum memproses.");
}

function prosesEmailBaru() {
  // Pengaman: tanpa batas waktu, skrip akan memproses SELURUH riwayat email —
  // termasuk order yang sudah dikirim manual. Lebih baik menolak jalan.
  const mulaiMs = Number(PropertiesService.getScriptProperties().getProperty(PROP_MULAI));
  if (!mulaiMs) {
    Logger.log("BERHENTI: jalankan `mulaiDariSekarang` dulu satu kali. " +
               "Itu menandai email lama sebagai sudah ditangani, supaya order lama " +
               "tidak dikirim ulang ke pembeli.");
    return;
  }

  const sheet = ambilSheet_();
  const sudahAda = refYangSudahAda_(sheet);
  const labelDone = ambilLabel_(LABEL_DONE);
  const labelCheck = ambilLabel_(LABEL_CHECK);

  // Kecualikan yang sudah berlabel agar tidak diproses ulang
  const query = `${GMAIL_QUERY} -label:${LABEL_DONE.replace(/\//g, "-")} -label:${LABEL_CHECK.replace(/\//g, "-")}`;
  const threads = GmailApp.search(query, 0, 50);

  let ditulis = 0, dilewati = 0, perluCek = 0, terlaluLama = 0;

  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (msg) {
      // Lapis kedua: abaikan email yang tiba sebelum batas waktu, walau labelnya
      // terlanjur hilang atau pencarian melewatkan sesuatu.
      if (msg.getDate().getTime() <= mulaiMs) {
        terlaluLama++;
        thread.addLabel(labelDone);
        return;
      }

      const teks = keTeks_(msg.getBody());
      const order = urai_(teks);

      if (!order) return; // bukan email order — biarkan tanpa label

      if (sudahAda[order.ref]) {
        dilewati++;
        thread.addLabel(labelDone);
        return;
      }

      const map = cariProduk_(order.produk);
      if (!map) {
        Logger.log('Produk belum dipetakan: "' + order.produk + '" (order ' + order.ref + ")");
        thread.addLabel(labelCheck);
        perluCek++;
        return;
      }

      sheet.appendRow([
        order.username,
        map.category,
        map.item_key,
        order.jumlah * (map.perUnit || 1),
        order.ref,
        SOURCE,           // agar order tampil sebagai "VCGamers", bukan "Google Sheet"
      ]);
      sudahAda[order.ref] = true;
      ditulis++;
      thread.addLabel(labelDone);
    });
  });

  Logger.log("Ditulis: " + ditulis + " | Sudah ada: " + dilewati +
             " | Perlu dicek: " + perluCek + " | Email lama diabaikan: " + terlaluLama);
}

/**
 * Bentuk baku nama produk. Aturannya sama persis dengan backend, supaya nama
 * yang cocok di sini juga cocok saat bot mencari stok.
 *
 * Huruf kecil, tanda baca dibuang, dan akhiran "s" tiap kata dilepas — jadi
 * "Dragon's Breath" dan "Dragon Breath" sama-sama menjadi "dragonbreath".
 */
function baku_(teks) {
  return String(teks || "").toLowerCase().split(/[^a-z0-9]+/)
    .filter(function (k) { return k; })
    .map(function (k) { return k.replace(/s$/, ""); })
    .join("");
}

/**
 * Cari produk di PRODUCT_MAP dengan toleransi ejaan.
 *
 * Nama produk di VCGamers tidak konsisten — spasi, tanda hubung, dan rarity
 * dalam kurung berubah-ubah ("Raccoon (Super)", "Raccoon - Super", "raccoon").
 * Rarity tidak memengaruhi item yang dikirim, jadi kalau nama lengkapnya tidak
 * ketemu, kurungnya dibuang lalu dicoba lagi.
 *
 * Null kalau tetap tak ketemu — email diberi label "Perlu-Cek", tidak ditebak.
 */
function cariProduk_(nama) {
  const teks = String(nama || "");
  const kandidat = [
    teks,                            // nama utuh
    teks.replace(/\([^)]*\)/g, " "), // tanpa "(Super)"
    teks.split(/\s[-–|]\s/)[0],      // tanpa "- Divine" di belakang
  ];
  for (let i = 0; i < kandidat.length; i++) {
    const cari = baku_(kandidat[i]);
    if (!cari) continue;
    for (const kunci in PRODUCT_MAP) {
      if (baku_(kunci) === cari) return PRODUCT_MAP[kunci];
    }
  }
  return null;
}

/**
 * Daftar nama produk yang benar-benar muncul di emailmu — jalankan ini untuk
 * tahu kunci PRODUCT_MAP yang harus ditulis, tanpa menebak.
 *
 * Tidak menulis apa pun ke sheet dan tidak memberi label, jadi aman dijalankan
 * kapan saja. Hasilnya ada di View → Logs.
 */
function daftarProduk() {
  const hitung = {};
  for (let mulai = 0; ; mulai += 50) {
    const threads = GmailApp.search(GMAIL_QUERY_DASAR, mulai, 50);
    if (!threads.length) break;
    threads.forEach(function (t) {
      t.getMessages().forEach(function (m) {
        const order = urai_(keTeks_(m.getBody()));
        if (order) hitung[order.produk] = (hitung[order.produk] || 0) + 1;
      });
    });
    if (threads.length < 50) break;
  }

  const baris = Object.keys(hitung)
    .sort(function (a, b) { return hitung[b] - hitung[a]; })
    .map(function (p) {
      const status = cariProduk_(p) ? "sudah dipetakan" : "BELUM  ← tambahkan ke PRODUCT_MAP";
      return hitung[p] + "x  \"" + p.toLowerCase() + "\"  — " + status;
    });

  Logger.log(baris.length ? baris.join("\n") : "Tidak ada email order yang terbaca.");
}


/** Ambil detail order dari teks email. Null kalau bukan email order. */
function urai_(teks) {
  const ref = cocok_(teks, /No\.?\s*Transaksi\s*Order\s*:?\s*(TRX-[A-Za-z0-9-]+)/i)
           || cocok_(teks, /(TRX-\d+-[A-Z0-9]+)/i);
  const username = cocok_(teks, /Username\s*Roblox\s*:?\s*([A-Za-z0-9_]+)/i);
  if (!ref || !username) return null;

  const jumlahTeks = cocok_(teks, /Jumlah\s*:?\s*(\d+)\s*unit/i);
  const jumlah = jumlahTeks ? parseInt(jumlahTeks, 10) : 1;

  // Nama produk = baris tepat sebelum harga "Rp ..."
  let produk = cocok_(teks, /\n\s*([^\n]{3,80}?)\s*\n\s*Rp\s?[\d.,]+\s*\n\s*Jumlah/i);
  if (!produk) produk = cocok_(teks, /\n\s*([^\n]{3,80}?)\s*\n\s*Rp\s?[\d.,]+/i);

  if (!produk) return null;

  return {
    ref: ref.trim(),
    username: username.trim(),
    jumlah: jumlah > 0 ? jumlah : 1,
    produk: produk.trim(),
  };
}

function cocok_(teks, re) {
  const m = teks.match(re);
  return m ? m[1] : null;
}

/** HTML email → teks polos dengan baris yang terjaga. */
function keTeks_(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|td|th|h\d|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function ambilSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADER);
  return sheet;
}

/** order_ref yang sudah ada di sheet — supaya tidak ditulis dua kali. */
function refYangSudahAda_(sheet) {
  const ada = {};
  const baris = sheet.getLastRow();
  if (baris < 2) return ada;

  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
  const kolom = header.indexOf("order_ref");
  if (kolom < 0) return ada;

  sheet.getRange(2, kolom + 1, baris - 1, 1).getValues().forEach(function (r) {
    const v = String(r[0]).trim();
    if (v) ada[v] = true;
  });
  return ada;
}

function ambilLabel_(nama) {
  return GmailApp.getUserLabelByName(nama) || GmailApp.createLabel(nama);
}

/** Jalankan ini untuk menguji penguraian tanpa menulis apa pun ke sheet. */
function ujiUraiSaja() {
  const threads = GmailApp.search(GMAIL_QUERY, 0, 5);
  if (!threads.length) { Logger.log("Tidak ada email yang cocok dengan: " + GMAIL_QUERY); return; }

  threads.forEach(function (t) {
    t.getMessages().forEach(function (m) {
      const hasil = urai_(keTeks_(m.getBody()));
      Logger.log(hasil ? JSON.stringify(hasil) : "(bukan email order) " + m.getSubject());
    });
  });
}
