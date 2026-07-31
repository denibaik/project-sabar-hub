--[[
  RaynorHubBot.lua — bot fulfillment untuk backend ASLI project-sabar-hub (FastAPI).
  Alur penuh:
    baca BOT_TOKEN → heartbeat+inventory (Bearer) → claim order (routing stok
    di server) → verifikasi penerima → cek stok → Mailbox.SendBatch
    → verifikasi inventory turun → result.

  Endpoint yang dipakai (semua di CONFIG.BASE_URL, semua pakai Bearer token):
    POST /api/v1/bots/heartbeat   heartbeat + inventory
    POST /api/v1/bots/claim       ambil 1 order yg bot ini bisa penuhi
    POST /api/v1/bots/result      lapor hasil

  === EDIT KONFIG ===
]]

-- ============================================================
--  TOKEN BOT — WAJIB. Set SEBELUM memanggil loader:
--      getgenv().BOT_TOKEN = "sbr_bot_xxxxx"
--      loadstring(...)()
--  Token dibuat di dashboard: Bot Network → Register Bot.
--  Script ini TIDAK lagi memuat registration key, jadi aman dipublikasikan.
-- ============================================================

local CONFIG = {
    BASE_URL         = "http://127.0.0.1:8000",   -- diisi otomatis oleh backend (PUBLIC_API_URL)
                                                  -- saat script disajikan lewat /files/loader.lua
    BOT_NAME         = "",                          -- kosong = pakai username akun
    GAME             = "Grow a Garden",
    HEARTBEAT        = 15,     -- detik antar heartbeat
    POLL_INTERVAL    = 5,      -- detik antar claim saat idle
    ORDER_GAP        = 10,     -- detik jeda setelah tiap order (game batasi ~8s antar gift)
    BATCH_SIZE       = 20,     -- maks item distinct per SendBatch (batas game)
    GIFT_COOLDOWN    = 10,     -- detik jeda antar batch dalam 1 order (>~8s cooldown game)
    MAX_VERIFY_WAIT  = 3.0,    -- detik menunggu replica utk verifikasi kirim
    DRY_RUN          = false,  -- false = KIRIM SUNGGUHAN. true = simulasi.
    ANTI_AFK         = true,   -- cegah bot dipindah server / ditendang karena diam
    ANTI_AFK_EVERY   = 60,     -- detik antar penyegaran
}

--============================ SETUP ============================
local Players = game:GetService("Players")
local RS      = game:GetService("ReplicatedStorage")
local Http    = game:GetService("HttpService")
local player  = Players.LocalPlayer

local okNet, Networking = pcall(function() return require(RS.SharedModules.Networking) end)
local okPsc, PSC        = pcall(function() return require(RS.ClientModules.PlayerStateClient) end)
local okMc,  mc         = pcall(function() return require(player.PlayerScripts.Controllers.MailboxController.MailboxItemCatalog) end)
if not (okNet and okPsc and okMc) then warn("[RaynorHub] Gagal load modul game. Sudah di dalam GAG?"); return end
local mailSB = Networking.Mailbox.SendBatch

local httpRequest = (syn and syn.request) or (http and http.request) or http_request
    or (fluxus and fluxus.request) or request
if not httpRequest then warn("[RaynorHub] Executor tidak mendukung HTTP request()."); return end

local genv = (getgenv and getgenv()) or _G
local MY = tostring(os.clock()) .. math.random()
genv.__RHBOT = MY
local function stillMe() return genv.__RHBOT == MY end

local BOT_NAME  = (CONFIG.BOT_NAME ~= "" and CONFIG.BOT_NAME) or player.Name
local USERNAME  = player.Name
local TOKEN_FILE = "raynorhub_token_" .. USERNAME .. ".txt"
local function log(m) print(("[RaynorHub %s] %s"):format(USERNAME, m)) end

--============================ HTTP ============================
local function apiCall(method, path, bodyTbl, headers)
    local h = { ["Content-Type"] = "application/json" }
    if headers then for k, v in pairs(headers) do h[k] = v end end
    local bodyStr = nil
    if bodyTbl then
        bodyStr = Http:JSONEncode(bodyTbl)
        -- Roblox encode tabel kosong sbg [] (array); backend butuh objek {}
        bodyStr = bodyStr:gsub('"inventory":%[%]', '"inventory":{}')
        bodyStr = bodyStr:gsub('"names":%[%]', '"names":{}')
        if bodyStr == "[]" then bodyStr = "{}" end
    end
    local ok, res = pcall(function()
        return httpRequest({ Url = CONFIG.BASE_URL .. path, Method = method, Headers = h, Body = bodyStr })
    end)
    if not ok then return 0, nil, tostring(res) end
    local code = res.StatusCode or res.status_code or 0
    local body = res.Body or ""
    local dec; if body ~= "" then pcall(function() dec = Http:JSONDecode(body) end) end
    return code, dec, body
end

--============================ INVENTORY ============================
-- mengembalikan: stock {cat={key=count}}, names {cat={key="Nama Tampilan"}}
-- names dipakai UI dashboard; ItemKey (mis. UUID pet) tetap yang dipakai SendBatch.
local function snapshotInventory()
    local rep = PSC:GetLocalReplica(); local out, names = {}, {}
    if not (rep and rep.Data and rep.Data.Inventory) then return out, names end
    for _, cat in ipairs(mc.Categories) do
        local t = rep.Data.Inventory[cat]
        if typeof(t) == "table" then
            local m, nm = {}, {}
            local n, hasName = 0, false
            for k, v in pairs(t) do
                local key = tostring(k)
                m[key] = (typeof(v) == "table") and 1 or (tonumber(v) or 0)
                n = n + 1
                -- nama tampilan hanya dikirim kalau beda dari key (mis. Pets pakai UUID)
                local ok, disp = pcall(function() return mc.Resolve(cat, k, v) end)
                if ok and type(disp) == "string" and disp ~= "" and disp ~= key then
                    nm[key] = disp; hasName = true
                end
            end
            if n > 0 then out[cat] = m end
            if hasName then names[cat] = nm end
        end
    end
    return out, names
end
local function looksLikeUuid(s)
    return type(s) == "string" and #s == 36 and select(2, s:gsub("%-", "")) == 4
end

-- Pet: tiap ekor punya UUID sendiri, jadi order menyebut NAMA (mis. "Raccoon").
-- Kembalikan daftar UUID pet yang namanya cocok.
local function petUuidsByName(name)
    local rep = PSC:GetLocalReplica()
    local found = {}
    if not (rep and rep.Data and rep.Data.Inventory) then return found end
    local pets = rep.Data.Inventory.Pets
    if typeof(pets) ~= "table" then return found end

    local wanted = tostring(name):lower():gsub("^%s+", ""):gsub("%s+$", "")
    for uuid, entry in pairs(pets) do
        local disp = entry and entry.Name
        local ok, resolved = pcall(function() return mc.Resolve("Pets", uuid, entry) end)
        if ok and type(resolved) == "string" and resolved ~= "" then disp = resolved end
        if disp and tostring(disp):lower() == wanted then
            table.insert(found, uuid)
        end
    end
    table.sort(found)  -- urutan tetap, agar perilaku bisa diprediksi
    return found
end

local function ownedCount(cat, key)
    local rep = PSC:GetLocalReplica()
    if not (rep and rep.Data and rep.Data.Inventory) then return nil end
    local t = rep.Data.Inventory[cat]
    if typeof(t) ~= "table" then return 0 end

    -- nama pet (bukan UUID) → hitung berapa ekor yang cocok
    if cat == "Pets" and not looksLikeUuid(key) then
        return #petUuidsByName(key)
    end

    local v = t[key]
    if v == nil then return 0 end
    if typeof(v) == "table" then return 1 end
    return tonumber(v) or 0
end
local function resolveRecipient(username)
    local ok, uid = pcall(function() return Players:GetUserIdFromNameAsync(username) end)
    if ok and uid then return uid end
    return nil
end

--============================ TOKEN ============================
-- Urutan pencarian token: getgenv().BOT_TOKEN → file tersimpan.
-- Tidak ada pendaftaran otomatis: token harus dibuat admin di dashboard.
local function saveToken(tok)
    genv["__RHTOKEN_" .. USERNAME] = tok
    if writefile then pcall(writefile, TOKEN_FILE, tok) end
end

local function readToken()
    local t = genv.BOT_TOKEN
    if type(t) == "string" and t ~= "" then
        saveToken(t)   -- ingat, agar run berikutnya tak perlu set ulang
        return t
    end
    if isfile and isfile(TOKEN_FILE) and readfile then
        local ok, saved = pcall(readfile, TOKEN_FILE)
        if ok and saved and saved ~= "" then return saved end
    end
    return genv["__RHTOKEN_" .. USERNAME]
end

local function tokenHelp()
    log("❌ BOT_TOKEN belum diisi.")
    log("   1) Buka dashboard → Bot Network → Register Bot → salin token")
    log("   2) Jalankan seperti ini:")
    log('        getgenv().BOT_TOKEN = "sbr_bot_xxxxx"')
    log("        loadstring(...)()")
end

-- Sebutkan executor & kemampuannya. Kalau ada yang tak berjalan di executor
-- tertentu, baris ini yang memberi tahu penyebabnya tanpa perlu menebak.
--
-- Penyimpanan berkas bersifat opsional: tanpanya bot tetap jalan, hanya saja
-- token tidak diingat sehingga harus diset ulang setiap kali dijalankan. Ini
-- lazim pada executor mobile.
local function laporLingkungan()
    local nama = "tidak diketahui"
    if identifyexecutor then
        local ok, n = pcall(identifyexecutor)
        if ok and n then nama = tostring(n) end
    end
    local simpanBerkas = (writefile and readfile and isfile) and true or false
    log(("executor=%s · simpan token=%s"):format(nama, simpanBerkas and "ya" or "TIDAK"))
    if not simpanBerkas then
        log("   executor ini tak bisa menyimpan berkas — set getgenv().BOT_TOKEN tiap kali menjalankan.")
    end
end

--============================ FULFILL ============================
-- order dari backend: {id, recipient, items:[{category,item_key,count}], note}
local function processOrder(order)
    local r = { order_id = order.id, status = "failed", sent_total = 0, requested_total = 0, error = nil }
    local uid = resolveRecipient(order.recipient)
    if not uid then r.error = "invalid_recipient"; return r end
    local batch, want = {}, 0
    for _, it in ipairs(order.items or {}) do
        local cat, key = it.category, it.item_key
        local cnt = math.max(1, math.floor(tonumber(it.count) or 1))
        local have = ownedCount(cat, key) or 0
        if have < cnt then r.status = "released"; r.error = ("insufficient_stock:%s/%s (have %d need %d)"):format(cat, key, have, cnt); return r end

        if cat == "Pets" and not looksLikeUuid(key) then
            -- Order menyebut nama pet; SendBatch butuh UUID. Pilih sebanyak `cnt`
            -- ekor yang namanya cocok, masing-masing sebagai entri tersendiri.
            local uuids = petUuidsByName(key)
            for i = 1, cnt do
                table.insert(batch, { Category = cat, ItemKey = uuids[i], Count = 1 })
                want = want + 1
            end
            log(("  %s ×%d → %d ekor dipilih"):format(key, cnt, cnt))
        else
            table.insert(batch, { Category = cat, ItemKey = key, Count = cnt })
            want = want + cnt
        end
    end
    r.requested_total = want
    if #batch == 0 then r.error = "empty_order"; return r end
    if CONFIG.DRY_RUN then r.status = "fulfilled"; r.sent_total = want; r.error = "DRY_RUN"; return r end

    -- kirim per chunk ≤ BATCH_SIZE item (batas SendBatch game = 20), cooldown antar chunk
    local BATCH = CONFIG.BATCH_SIZE
    local nChunks = math.ceil(#batch / BATCH)
    local totalSent = 0
    for ci = 1, nChunks do
        local chunk, chunkWant = {}, 0
        for i = (ci - 1) * BATCH + 1, math.min(ci * BATCH, #batch) do
            table.insert(chunk, batch[i]); chunkWant = chunkWant + batch[i].Count
        end
        local before = {}
        for _, b in ipairs(chunk) do before[b.Category .. ":" .. b.ItemKey] = ownedCount(b.Category, b.ItemKey) or 0 end
        pcall(function() return mailSB:Fire(uid, chunk, order.note or "") end)
        local sent = 0; local deadline = os.clock() + CONFIG.MAX_VERIFY_WAIT
        while os.clock() < deadline do
            task.wait(0.25); sent = 0
            for _, b in ipairs(chunk) do
                sent = sent + math.max(0, (before[b.Category .. ":" .. b.ItemKey] or 0) - (ownedCount(b.Category, b.ItemKey) or 0))
            end
            if sent >= chunkWant then break end
        end
        totalSent = totalSent + sent
        if nChunks > 1 then log(("  batch %d/%d: %d/%d item"):format(ci, nChunks, sent, chunkWant)) end
        if ci < nChunks then task.wait(CONFIG.GIFT_COOLDOWN) end  -- hormati cooldown antar batch
    end
    r.sent_total = totalSent
    if totalSent >= want then r.status = "fulfilled"
    elseif totalSent > 0 then r.status = "partial"; r.error = ("partial %d/%d"):format(totalSent, want)
    else r.status = "failed"; r.error = "rejected_by_game (0 sent)" end
    return r
end

--============================ RUN ============================
laporLingkungan()
local token = readToken()
if not token then tokenHelp(); return end
local function authH() return { ["Authorization"] = "Bearer " .. token } end

-- anti-AFK
--
-- Game ini punya AntiAfkController sendiri: setelah `Game.AntiAfk.IdleSeconds`
-- (bawaan 1140 dtk / 19 menit) tanpa aktivitas, ia memanggil RequestHop dan
-- akun dipindah server — yang mematikan script ini.
--
-- Yang dianggap "aktivitas" oleh controller itu HANYA input sungguhan:
-- InputBegan (keyboard/klik/gamepad), gerak mouse sambil klik kanan, thumbstick,
-- dan sentuhan. Melompat atau berjalan TIDAK mereset apa pun — begitu juga
-- VirtualUser, yang sudah diuji dan ternyata tidak memicu UserInputService.
--
-- Yang bekerja adalah atribut yang dibaca controller-nya sendiri saat menghitung
-- ambang batas. Nilainya disetel lokal, tidak direplikasi ke server.
--
-- VirtualUser tetap dipasang sebagai lapis kedua, untuk penendang idle bawaan
-- Roblox (20 menit) yang terpisah dari sistem game.
if CONFIG.ANTI_AFK then
    local okVU, VU = pcall(function() return game:GetService("VirtualUser") end)
    if okVU and VU then
        pcall(function()
            player.Idled:Connect(function()
                pcall(function()
                    VU:CaptureController()
                    VU:ClickButton2(Vector3.new())
                end)
            end)
        end)
    end

    task.spawn(function()
        while stillMe() do
            -- disegarkan berkala, bukan sekali saja: kalau server menimpa
            -- atributnya, nilainya kembali dalam waktu paling lama semenit.
            pcall(function() player:SetAttribute("AntiAfkIdleOverride", 31536000) end)
            task.wait(CONFIG.ANTI_AFK_EVERY)
        end
        pcall(function() player:SetAttribute("AntiAfkIdleOverride", nil) end)
    end)
    log("anti-AFK aktif")
end

-- heartbeat loop (dengan inventory utk routing)
task.spawn(function()
    while stillMe() do
        local inv, nm = snapshotInventory()
        local code = apiCall("POST", "/api/v1/bots/heartbeat",
            { server = tostring(game.JobId), ping_ms = 0, inventory = inv, names = nm }, authH())
        if code == 401 then saveToken(""); log("❌ Token ditolak/dicabut. Ambil token baru di dashboard."); break end
        task.wait(CONFIG.HEARTBEAT)
    end
end)

log(("Online. BASE=%s DRY_RUN=%s"):format(CONFIG.BASE_URL, tostring(CONFIG.DRY_RUN)))
while stillMe() do
    local cInv, cNames = snapshotInventory()
    local code, order = apiCall("POST", "/api/v1/bots/claim", { inventory = cInv, names = cNames }, authH())
    if code == 200 and order and order.id then
        log(("Order %s → %s (%d item)"):format(tostring(order.id):sub(1, 8), tostring(order.recipient), #(order.items or {})))
        local ok, res = pcall(processOrder, order)
        if not ok then res = { order_id = order.id, status = "failed", error = "bot_exception: " .. tostring(res), sent_total = 0, requested_total = 0 } end
        local rc = apiCall("POST", "/api/v1/bots/result", res, authH())
        log(("  → %s (%s/%s) [report http %s]"):format(res.status, tostring(res.sent_total), tostring(res.requested_total), tostring(rc)))
        task.wait(CONFIG.ORDER_GAP)
    elseif code == 401 then
        saveToken(""); log("❌ Token ditolak/dicabut. Ambil token baru di dashboard."); break
    else
        task.wait(CONFIG.POLL_INTERVAL)  -- 204/none atau error → tunggu
    end
end
log("instance lama berhenti (digantikan run baru).")
