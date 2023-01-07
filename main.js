const { default: axios } = require('axios');
const { MessageBuilder, Webhook } = require('discord-webhook-node');
const fs = require('fs');
const screenshot = require('screenshot-desktop');

require('dotenv').config()

async function sendScreenshot() {
    console.log("Capturing screenshot");
    const hook = new Webhook(process.env.WEBHOOKURL);
    const embed = new MessageBuilder()
        .setTitle(`Screenshot`);
    let screenshotPath = await screenshot({ filename: `Screenshot${Date.now()}.jpg` });
    await hook.sendFile(screenshotPath);
    console.log(`Sent screenshot ${screenshotPath}`);
    await fs.rmSync(screenshotPath);
}

setTimeout(() => {
    sendScreenshot();
}, 60*60*1000);

console.log("Monitor running");
sendScreenshot();