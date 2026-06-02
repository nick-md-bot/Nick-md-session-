const axios = require('axios');
const { create } = require('./session');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const path = require('path'); // 1. ഇത് ഇവിടെ ഉണ്ടെന്ന് ഉറപ്പാക്കി
let router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
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
        return res.status(400).send({ error: "Number is required" });
    }

    num = num.replace(/[^0-9]/g, '');

    // 2. temp ഫോൾഡർ ഇല്ലെങ്കിൽ അത് നിർമ്മിക്കുന്നു
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const sessionPath = path.join(tempDir, id);

    async function getPaire() {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        
        try {
            let session = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({level: "fatal"}).child({level: "fatal"})),
                },
                printQRInTerminal: false,
                logger: pino({level: "fatal"}).child({level: "fatal"}),
                browser: ["Ubuntu", "Chrome", "20.0.04"] 
             });

            if (!session.authState.creds.registered) {
                await delay(3000); 
                const code = await session.requestPairingCode(num);
                if (!res.headersSent) {
                    return res.send({ code }); // return ചേർത്തത് കൊണ്ട് ഡബിൾ റെസ്പോൺസ് ഒഴിവാകും
                }
            }

            session.ev.on('creds.update', saveCreds);

            session.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection == "open") {
                    await delay(5000);

                    const credsFile = path.join(sessionPath, 'creds.json');
                    const jsonData = await fs.promises.readFile(credsFile, 'utf-8');     
                    const { id: data } = await create(jsonData);
                    
                    await session.sendMessage(session.user.id, { text: 'bot~' + data });

                    await delay(2000);
                    await session.ws.close();
                    return removeFile(sessionPath);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    getPaire();
                }
            });
        } catch (err) {
            // യഥാർത്ഥ എറർ എന്താണെന്ന് ടെർമിനലിൽ കാണാൻ ഇത് സഹായിക്കും
            console.error("🔴 Actual Error Details:", err); 
            
            removeFile(sessionPath);
            if (!res.headersSent) {
                return res.status(500).send({ code: "Service Unavailable", details: err.message });
            }
        }
    }

    return await getPaire();
});

module.exports = router;
