// === Imports ===
// Load environment variables (DISCORD_TOKEN, N8N_WEBHOOK_URL) from the .env file
require('dotenv').config();
// Import the discord.js library components we need
const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
// Import axios for making HTTP requests (to n8n)
const axios = require('axios');

// === Configuration ===
// Get the values from the .env file
const token = process.env.DISCORD_TOKEN;
const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL; // Will be undefined for now, that's okay

// --- Basic Checks ---
if (!token) {
    console.error("FATAL ERROR: DISCORD_TOKEN is missing from your .env file. The bot cannot start.");
    process.exit(1); // Exit the script
}
if (!n8nWebhookUrl) {
    // We will add the N8N URL later. This warning is expected initially.
    console.warn("Warning: N8N_WEBHOOK_URL is not yet defined in the .env file. Mention-to-n8n functionality will be disabled until it's added.");
}
// --- End Basic Checks ---


// === Discord Client Setup ===
// Create a new Discord client instance
const client = new Client({
    // Specify the 'Intents' (permissions) the bot needs to function
    intents: [
        GatewayIntentBits.Guilds,           // Need this for server-related events
        GatewayIntentBits.GuildMessages,    // Need this to receive messages in servers
        GatewayIntentBits.MessageContent,   // Need this to READ the actual content of messages (REQUIRED FOR MENTIONS & COMMANDS!)
        // GatewayIntentBits.GuildMembers   // Add if you need member information (like roles, join dates) - Requires enabling in Dev Portal too
    ],
    // Partials are needed for certain events involving uncached data (e.g., DMs if you add that later)
    partials: [Partials.Channel]
});


// === Event Listener: Bot Ready ===
// This event fires once after the bot successfully logs in
client.once(Events.ClientReady, readyClient => {
    console.log(`--------------------------------------------------------`);
    console.log(`✅ SUCCESS! Logged in as ${readyClient.user.tag}`);
    console.log(`   Bot ID: ${readyClient.user.id}`);
    // Check if the N8N URL is present when the bot starts
    console.log(`   n8n Webhook URL configured: ${n8nWebhookUrl ? 'Yes' : 'No'}`);
    console.log(`--------------------------------------------------------`);
    // You can set the bot's status (activity) here
    readyClient.user.setActivity('Listening for @mentions');
});


// === Event Listener: Message Created ===
// This event fires every time a message is sent in a channel the bot can see
client.on(Events.MessageCreate, async message => {

    // Ignore messages from other bots to prevent loops
    if (message.author.bot) {
        return;
    }

    // --- Mention Handling ---
    // Check if the bot itself was mentioned in the message
    if (message.mentions.has(client.user)) {

        const logTimestamp = `[${new Date().toISOString()}]`; // For consistent log timestamps
        console.log(`${logTimestamp} Mention detected from ${message.author.tag} in channel #${message.channel.name || 'DM'}`);
        console.log(`${logTimestamp}   Original Message: "${message.content}"`);

        // Check if n8n URL is actually configured before trying to use it
        if (!n8nWebhookUrl) {
            console.warn(`${logTimestamp}   Cannot process mention: N8N_WEBHOOK_URL is not set.`);
            // Optionally reply to the user
            // await message.reply("Sorry, my connection to the AI brain isn't configured yet. Please tell an admin.");
            return; // Stop processing this mention if the URL isn't set
        }

        // Let the user know the bot is "thinking"
        await message.channel.sendTyping();

        // Extract the actual question/text, removing the bot mention part
        const userQuestion = message.content.replace(/<@!?\d+>/g, '').trim();
        console.log(`${logTimestamp}   Extracted Question: "${userQuestion}"`);

        // Prepare the data payload to send to n8n
        const payload = {
            question: userQuestion,
            userId: message.author.id,
            userName: message.author.tag,
            channelId: message.channel.id,
            messageId: message.id,
            timestamp: message.createdAt.toISOString() // Send timestamp too
        };

        // --- Call n8n Webhook ---
        try {
            console.log(`${logTimestamp}   Sending payload to n8n: ${JSON.stringify(payload)}`);

            // Make the POST request using axios
            const n8nResponse = await axios.post(n8nWebhookUrl, payload, {
                 headers: { 'Content-Type': 'application/json' },
                 timeout: 20000 // Optional: Set a timeout (e.g., 20 seconds) for the n8n call
                });

            console.log(`${logTimestamp}   Received response from n8n (Status: ${n8nResponse.status})`);
            console.log(`${logTimestamp}   n8n Response Data: ${JSON.stringify(n8nResponse.data)}`);

            // --- Process n8n Response ---
            // IMPORTANT: This assumes your n8n workflow sends back JSON like: { "reply": "This is the answer" }
            if (n8nResponse.data && typeof n8nResponse.data.reply === 'string' && n8nResponse.data.reply.trim() !== '') {
                // Send the reply from n8n back to Discord
                await message.reply(n8nResponse.data.reply);
            } else {
                console.warn(`${logTimestamp}   n8n response received, but it didn't contain a valid 'reply' field.`);
                await message.reply("I got a response from the AI, but couldn't format it properly. Maybe try again?");
            }

        } catch (error) {
            console.error(`${logTimestamp} --- ERROR Calling n8n Webhook ---`);
            if (error.response) {
                // The request was made and the server responded with a status code outside 2xx
                console.error(`${logTimestamp}   Status: ${error.response.status}`);
                console.error(`${logTimestamp}   Data: ${JSON.stringify(error.response.data)}`);
                await message.reply(`Sorry, there was an error communicating with the AI brain (Status: ${error.response.status}). Please check the logs or try again later.`);
            } else if (error.request) {
                // The request was made but no response was received (e.g., timeout, network issue)
                console.error(`${logTimestamp}   No response received from n8n:`, error.message);
                 await message.reply("Sorry, I couldn't reach the AI brain right now (it might be busy, offline, or timed out). Please try again later.");
            } else {
                // Something happened in setting up the request
                console.error(`${logTimestamp}   Error setting up n8n request:`, error.message);
                 await message.reply("Sorry, something went wrong on my end before I could talk to the AI brain. Please tell an admin.");
            }
            console.error(`${logTimestamp} --- End Error Log ---`);
        }
        // --- End n8n Webhook Call ---

    } // End of mention handling block
}); // End of messageCreate event listener


// === Login ===
// Start the bot by logging in with the token
// This MUST be the last line related to client setup
console.log("Attempting to log in to Discord...");
client.login(token);


// === Optional Global Error Handlers ===
// Catch unhandled promise rejections (good practice)
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});
// Catch general client errors
client.on('error', error => {
    console.error('Discord client error:', error);
});

// Catch process termination signals (like Ctrl+C) for graceful shutdown (optional)
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
signals.forEach(signal => {
  process.on(signal, () => {
    console.log(`\n${signal} received. Shutting down bot...`);
    client.destroy(); // Close the Discord connection gracefully
    process.exit(0);
  });
}); 