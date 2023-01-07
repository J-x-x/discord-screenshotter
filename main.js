const { default: axios } = require('axios');
const { MessageBuilder, Webhook } = require('discord-webhook-node');
const fs = require('fs');
const screenshot = require('screenshot-desktop');

const updateFrequency = process.env.FREQUENCYMINUTES*60*1000;

require('dotenv').config()

async function sendStats() {
    console.log("Capturing stats");
    const hook = new Webhook(process.env.WEBHOOKURL);

    const screenshotPath = await screenshot({ filename: `Screenshot${Date.now()}.jpg` });
    const image = fs.readFileSync(screenshotPath);


    await hook.sendFile(screenshotPath);
    console.log(`Sent screenshot ${screenshotPath}`);

    await fs.rmSync(screenshotPath);
}

console.log(`Monitor running!`);

setInterval(function() {sendStats();}, process.env.FREQUENCYMINUTES*60*1000);
sendStats();