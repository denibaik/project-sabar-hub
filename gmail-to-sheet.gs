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
 * 4. Isi PRODUCT_MAP di bawah (lihat penjelasannya)
 * 5. Simpan, lalu jalankan `prosesEmailBaru` sekali secara manual
 *    → Google akan meminta izin akses Gmail & Sheet. Setujui.
 * 6. Triggers (ikon jam) → Add Trigger:
 *       Function        : prosesEmailBaru
 *       Event source    : Time-driven
 *       Type            : Minutes timer
 *       Interval        : Every 5 minutes
 *
 * ── CATATAN PENTING ─────────────────────────────────────────────────────
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
  // "raccoon (super)": { category: "Raccoons", item_key: "Super Raccoon", perUnit: 1 },
  // "ghost pepper seed": { category: "Seeds", item_key: "Ghost Pepper", perUnit: 1 },
  // "super sprinkler":  { category: "Sprinklers", item_key: "Super Sprinkler", perUnit: 1 },
};

const SHEET_NAME = "Sheet1";        // nama tab di spreadsheet
const SOURCE = "vcgamers";          // asal order — tampil sebagai badge di dashboard
const GMAIL_QUERY = 'from:vcgamers.com newer_than:7d';
const LABEL_DONE = "SabarHub/Diproses";
const LABEL_CHECK = "SabarHub/Perlu-Cek";

// ══════════════════════════════════════════════════════════════════════
//  Tidak perlu diubah di bawah sini
// ══════════════════════════════════════════════════════════════════════

const HEADER = ["recipient", "category", "item_key", "count", "order_ref", "source"];

function prosesEmailBaru() {
  const sheet = ambilSheet_();
  const sudahAda = refYangSudahAda_(sheet);
  const labelDone = ambilLabel_(LABEL_DONE);
  const labelCheck = ambilLabel_(LABEL_CHECK);

  // Kecualikan yang sudah berlabel agar tidak diproses ulang
  const query = `${GMAIL_QUERY} -label:${LABEL_DONE.replace(/\//g, "-")} -label:${LABEL_CHECK.replace(/\//g, "-")}`;
  const threads = GmailApp.search(query, 0, 50);

  let ditulis = 0, dilewati = 0, perluCek = 0;

  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (msg) {
      const teks = keTeks_(msg.getBody());
      const order = urai_(teks);

      if (!order) return; // bukan email order — biarkan tanpa label

      if (sudahAda[order.ref]) {
        dilewati++;
        thread.addLabel(labelDone);
        return;
      }

      const map = PRODUCT_MAP[order.produk.toLowerCase()];
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

  Logger.log("Ditulis: " + ditulis + " | Sudah ada: " + dilewati + " | Perlu dicek: " + perluCek);
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
