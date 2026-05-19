const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { GoogleGenAI } = require('@google/genai');

// الـ API Key الرسمي والمجاني تبعك من Google AI Studio
const aiKey = "AIzaSyCBky2pWCgnD7r_6e5aSxgJwouIy9aag3s"; 
const ai = new GoogleGenAI({ apiKey: aiKey });

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) qrcode.generate(qr, { small: true });

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('\n==================================================');
            console.log('الواتساب متصل ومخ Gemini الرسمي شغال بأعلى ذكاء واستقرار! 🚀');
            console.log('==================================================\n');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        if (from.endsWith('@g.us')) return; // تجاهل المجموعات

        const text = msg.message.conversation || 
                     msg.message.extendedTextMessage?.text || 
                     msg.message.imageMessage?.caption || 
                     msg.message.videoMessage?.caption;
                     
        if (!text) return;

        try {
            console.log(`💬 سؤال جديد: ${text}`);

            // استدعاء موديل جوجل الرسمي السريع جداً والمستقر
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: text,
                config: {
                    systemInstruction: "أنت مساعد رقمي عبقري وذكي جداً، تفهم في كل العلوم والمجالات البرمجية والتقنية وتجيب على أي سؤال بالعالم باختصار مفيد ومقنع، وبأسلوب عفوي ولطيف بالعامية السورية الشامية المحبوبة كأنك صديق حقيقي."
                }
            });

            const aiReply = response.text;

            await sock.sendMessage(from, { text: aiReply });
            console.log(`🤖 رد Gemini الرسمي: ${aiReply}`);

        } catch (error) {
            console.error("❌ خطأ بالاتصال بالسيرفر الرسمي:", error.message);
            try {
                await sock.sendMessage(from, { text: "على عيني يا غالي، واصلتني رسالتك بس شكلها الشبكة عم تقطع نتفة عندي، ثواني وبكون معك!" });
            } catch (err) {
                console.error(err);
            }
        }
    });
}

startBot();
