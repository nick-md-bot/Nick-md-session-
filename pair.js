const axios = require('axios');
const { create } = require('./session');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const path = require('path'); // path മോഡ്യൂൾ ചേർത്തു
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

    // 1. നമ്പറിലെ സ്പേസും ചിഹ്നങ്ങളും ആദ്യമേ തന്നെ കളയുന്നു
    num = num.replace(/[^0-9]/g, '');

    async function getPaire() {
        // കൃത്യമായ പാത്ത് ലഭിക്കാൻ path.join ഉപയോഗിക്കുന്നു
        const sessionPath = path.join(__dirname, 'temp', id);
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        
        try {
            let session = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({level: "fatal"}).child({level: "fatal"})),
                },
                printQRInTerminal: false,
                logger: pino({level: "fatal"}).child({level: "fatal"}),
                // ❌ പഴയ 'Browsers.macOS' മാറ്റി കൃത്യമായ അറേ നൽകി (ഇതാണ് 'Couldn't link' മാറ്റുന്നത്)
                browser: ["Ubuntu", "Chrome", "20.0.04"] 
             });

            if (!session.authState.creds.registered) {
                await delay(3000); // കണക്ഷൻ റെഡിയാകാൻ 3 സെക്കന്റ് സമയം നൽകുന്നു
                const code = await session.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            session.ev.on('creds.update', saveCreds);

            session.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection == "open") {
                    await delay(5000);

                    // സെഷൻ ഫയൽ കൃത്യമായ പാത്തിൽ നിന്ന് റീഡ് ചെയ്യുന്നു
                    const credsFile = path.join(sessionPath, 'creds.json');
                    const jsonData = await fs.promises.readFile(credsFile, 'utf-8');     
                    const { id: data } = await create(jsonData);
                    
                    // സെഷൻ കോഡ് വാട്സാപ്പിലേക്ക് അയക്കുന്നു
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
            console.log("service restated", err);
            removeFile(sessionPath);
            if (!res.headersSent) {
                await res.send({ code: "Service Unavailable" });
            }
        }
    }

    return await getPaire();
});

module.exports = router;
