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

// Add listener for the 'registered' event to send the /OPER command
bot.addListener('registered', function(message) {
    const username = 'Killer';
    const password = 'master123';

    if (typeof username === 'string' && typeof password === 'string') {
        console.log('Sending /OPER command with:', username, password);
        bot.send('OPER', username, password, function(err) {
            if (err) {
                console.error('Failed to send /OPER command:', err.message);
            } else {
                console.log('Successfully sent /OPER command');
            }
        });
    } else {
        console.error('Invalid username or password type.');
    }
});

bot.addListener('message', function(from, to, message) {
    console.log('%s => %s: %s', from, to, message);

    if (to === '#lobby' && /irc\.chateachat\.com/.test(message)) {
        // Grant voice status to the user who mentioned "irc.chateachat.com"
        console.log(`Granting voice to ${from} in channel ${to}`);

        // Ensure correct argument types
        console.log('Sending mode command with:', '#lobby', '+v', from);
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
            run(message).then(res => bot.say(to, res)).catch(err => {
                console.error('Failed to generate content:', err.message);
                bot.say(to, 'Sorry, I encountered an error.');
            });
        }
    } else {
        // Private message
        console.log('Private message');
    }
});

async function run(inp) {
    try {
        const prompt = inp;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();
        return text;
    } catch (err) {
        console.error('Error generating content:', err.message);
        return 'Sorry, I encountered an error while generating the content.';
    }
}
