import dotenv from "dotenv";
import fs from "fs-extra";

if (fs.existsSync("config.env")) {
	dotenv.config({
		path: "./config.env"
	});
}

const config = {
	MONGODB_URI: process.env.MONGODB_URI || "mongodb+srv://nickmdbot2255:nickmdbot2255@nick.0rmggjg.mongodb.net/?appName=nick", // put your mongo db url
};

export default config;
