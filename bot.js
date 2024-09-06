#!/usr/bin/env node

const { GoogleGenerativeAI } = require("@google/generative-ai");
const irc = require('irc');

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI('key');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const bot = new irc.Client('irc.chateachat.com', 'CamBot', {
    debug: true,
    channels: ['#lobby'],
    port: 6900,
    secure: true,
    selfSigned: true
});

bot.addListener('registered', () => {
    // Send /OPER command after the bot is registered
    bot.send('OPER', 'Killer', 'master123');
    console.log('Sent /OPER command to IRC server');
});

bot.addListener('message', async function(from, to, message) {
    console.log('%s => %s: %s', from, to, message);

    if (to.match(/^[#&]/)) {
        // Channel message
        if (message.includes('Watch')) {
            // Highlight the user by giving them voice (+v)
            highlightUser(from, to);
        }

        if (message.startsWith('!ia')) {
            try {
                const response = await run(message);
                bot.say(to, response);
            } catch (error) {
                console.error('Error processing message:', error);
            }
        }    
    } else {
        // Private message
        console.log('private message');
    }
});

async function run(inp) {
    const prompt = inp;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return await response.text();
    } catch (error) {
        console.error('Error generating response:', error);
        return 'Sorry, something went wrong.';
    }
}

function highlightUser(user, channel) {
    // Send /mode command to give the user voice (+v) in the channel
    bot.send('MODE', channel, '+v', user);
    console.log(`Gave voice to ${user} in ${channel}`);
}
