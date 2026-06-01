const axios = require('axios');
const { create } = require('./session');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const path = require('path'); // പാത്ത് കൃത്യമാക്കാൻ ആവശ്യമാണ്
let router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
};

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    if (!num) {
        return res.status(400).send({ error: "Number parameter is required" });
    }

    // കൃത്യമായ ഒരു ഫോൾഡർ പാത്ത് സെറ്റ് ചെയ്യുന്നു
    const sessionDir = path.join(__dirname, 'temp', id);

    async function getPaire() {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        try {
            let session = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({level: "fatal"}).child({level: "fatal"})),
                },
                printQRInTerminal: false,
                logger: pino({level: "fatal"}).child({level: "fatal"}),
                // ഇവിടെ ബ്രൗസർ മാറ്റിയിട്ടുണ്ട് (പെയറിംഗ് കോഡിന് ഇത് നിർബന്ധമാണ്)
                browser: ["Ubuntu", "Chrome", "20.0.04"] 
             });

            if (!session.authState.creds.registered) {
                await delay(2000); // 2 സെക്കൻഡ് ഡിലേ നൽകുന്നത് നല്ലതാണ്
                num = num.replace(/[^0-9]/g, '');
                
                try {
                    const code = await session.requestPairingCode(num);
                    if (!res.headersSent) {
                        return res.send({ code });
                    }
                } catch (err) {
                    console.error("Pairing code error:", err);
                    if (!res.headersSent) {
                        return res.status(500).send({ code: "Failed to generate code" });
                    }
                }
            }

            session.ev.on('creds.update', saveCreds);

            session.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection == "open") {
                    await delay(5000);

                    try {
                        // ഫയൽ പാത്ത് ശരിയാക്കി
                        const credsFile = path.join(sessionDir, 'creds.json');
                        const jsonData = await fs.promises.readFile(credsFile, 'utf-8');     
                        const { id: data } = await create(jsonData);
                        
                        // ജിദ് ലിങ്ക് കൃത്യമാക്കി
                        const userJid = session.user.id.split(":")[0] + "@s.whatsapp.net";
                        await session.sendMessage(userJid, { text: 'bot~' + data });

                        await delay(2000);
                        await session.ws.close();
                        removeFile(sessionDir);
                    } catch (e) {
                        console.log("Error in open connection:", e);
                    }
                    
                } else if (connection === "close") {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    // 401 (Logged out) അല്ലെങ്കിൽ ബോട്ട് ഓപ്പൺ ആയിക്കഴിഞ്ഞാൽ വീണ്ടും റൺ ചെയ്യരുത്
                    if (statusCode !== 401 && connection !== "open") {
                        await delay(10000);
                        // പഴയ കണക്ഷൻ ക്ലോസ് ചെയ്ത് വീണ്ടും ട്രൈ ചെയ്യാം
                        getPaire();
                    } else {
                        removeFile(sessionDir);
                    }
                }
            });
        } catch (err) {
            console.log("Service error, restated:", err);
            removeFile(sessionDir);
            if (!res.headersSent) {
                res.send({ code: "Service Unavailable" });
            }
        }
    }

    await getPaire();
});

module.exports = router;
