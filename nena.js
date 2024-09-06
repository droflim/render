#!/usr/bin/env node

const { GoogleGenerativeAI } = require("@google/generative-ai");
const irc = require('irc');

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI('key');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const bot = new irc.Client('irc.chateachat.com', 'uniqueNodebot', {
    debug: true,
    channels: ['#Amistad', '#lobby'],
    port: 6900,
    secure: true,
    selfSigned: true
});

bot.addListener('message', function(from, to, message) {
    console.log('%s => %s: %s', from, to, message);

    if (to === '#lobby' && /irc\.chateachat\.com/.test(message)) {
        // Grant voice status to the user who mentioned "irc.chateachat.com"
        console.log(`Granting voice to ${from} in channel ${to}`);

        // Ensure correct argument types
        bot.send('mode', '#lobby', '+v', from, (err) => {
            if (err) {
                console.error(`Failed to give voice to ${from}: ${err.message}`);
            } else {
                console.log(`Successfully granted voice to ${from}`);
            }
        });
    } else if (to.match(/^[#&]/)) {
        // Handle channel messages other than #lobby
        if (message.startsWith('!ia')) {
            run(message).then(res => bot.say(to, res));
        }
    } else {
        // Private message
        console.log('Private message');
    }
});

async function run(inp) {
    const prompt = inp;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
}
