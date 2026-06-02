// MONJAN NICK✅

import express from "express";
import pino from "pino";
import fs from "fs-extra";
import User from "./lib/user.js";
import generateid from "./lib/id.js";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";
import makeWASocket, {
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} from "@whiskeysockets/baileys";
import connectDatabase from "./lib/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.set("json spaces", 4)
connectDatabase();

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/lib/pair.html");
});

if (fs.existsSync("./session")) {
    fs.emptyDirSync(__dirname + "/session");
}
console.log("folder cleaned");

app.get("/session", async (req, res) => {
    const id = req.query.id;
    if(!id) return res.json({
        status: false,
        message: "session id required"
    });
    const user = await User.findOne({
        sessionId: id.split(':')[1]
    });

    if(!user) return res.json({
        status: false,
        message: "Session not found"
    });

    return res.json({
        status: true,
        creator: "MONJAN NICK",
        data: user.creds
    });
})

app.get("/pairing", async (req, res) => {
    let num = req.query.number;

    async function nickPair() {
        const { state, saveCreds } = await useMultiFileAuthState("./session");
        try {
            let sparky = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                version: [2, 3000, 1033893291],
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!nick.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, "");
                const code = await sparky.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            nick.ev.on("creds.update", saveCreds);

            nick.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(10000);
                    const sessionsparky = fs.readFileSync("./session/creds.json", "utf8");
                    let encoded = generateid();
                    const userJid = sparky.user?.id?.replace(/:.*@/, '@');
                    let session = await sparky.sendMessage(userJid, {
                        text: "M-O-N-J-A-N-N-I-C-K:" + encoded,
                    });
                    let text =
                        "*Thank You for Using NICK BOT MD*\n\n\nDeveloper Contact: +917907997537\n\nOfficial Channel: https://whatsapp.com/channel/0029Va9ZOf36rsR1Ym7O2x00\n\nIf you encounter any issues or wish to report a problem, please feel free to join our dedicated support group: https://chat.whatsapp.com/KDPF5X27DzZGEqj9sNlxQm?s=cl&p=a&mlu=1 appreciate your feedback and are here to assist you!";
                    await nick.sendMessage(
                        userJid,
                        { text },
                        { quoted: session }
                    );
                    const user = await User.create({
                        sessionId: encoded,
                        creds: sessionsparky
                    })
                    console.log(user);
                    await delay(3000);
                    fs.emptyDirSync(__dirname + "/session");
                    console.log("_Restarting..._");
                    process.exit(0);
                } else if (
                    connection === "close" &&
                    lastDisconnect?.error?.output?.statusCode !== 401
                ) {
                    await delay(10000);
                    sparkyPair();
                }
            });
        } catch (err) {
            console.log("service restarted");
            fs.emptyDirSync(__dirname + "/session");
            if (!res.headersSent) {
                await res.send({ code: "Service Unavailable" });
            }
            console.log(err);
        }
    }

    return await sparkyPair();
});

app.listen(PORT, () => console.log("App listened on port", PORT));