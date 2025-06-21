import { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fetch from 'node-fetch';
import { parseCalloutWithAI } from '../openaiCallout.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel],
});

// UPDATED: Use new bot-specific endpoint
const BOT_API_URL = process.env.BOT_API_URL || 'http://127.0.0.1:3001/api/bot/callouts';

// Store pending confirmations (in production, use Redis or database)
const pendingConfirmations = new Map();

// Helper function to format date nicely
function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Helper function to create confirmation message
function createConfirmationMessage(result, username) {
  const formattedDate = formatDate(result.date);
  
  let message = `**Callout Confirmation**\n\n`;
  message += `You will be **${result.status}** on **${formattedDate}**`;
  
  if (result.reason && result.reason.trim()) {
    message += ` because: **${result.reason}**`;
  }
  
  if (result.status === 'LATE' && result.delay) {
    message += `\nExpected delay: **${result.delay} minutes**`;
  }
  
  message += `\n\nIs this correct?`;
  
  return message;
}

// Helper function to save callout to database
async function saveCalloutToDatabase(result, username) {
  try {
    const apiResponse = await fetch(BOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': process.env.BOT_API_SECRET
      },
      body: JSON.stringify({
        user: username,
        status: result.status,
        date: result.date,
        reason: result.reason,
        delay: result.delay || null
      }),
    });
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`[Bot] API Error (${apiResponse.status}):`, errorText);
      return { success: false, error: `Database error: ${errorText}` };
    }
    
    const apiResult = await apiResponse.json();
    console.log(`[Bot] Callout saved successfully:`, apiResult);
    return { success: true, result: apiResult };
    
  } catch (apiError) {
    console.error('[Bot] API request failed:', apiError);
    return { success: false, error: 'Failed to connect to database' };
  }
}

client.once('ready', () => {
  console.log(`[Bot] Ready as ${client.user.tag}`);
  console.log(`[Bot] Using bot API endpoint: ${BOT_API_URL}`);
  
  // Check if bot secret is configured
  if (!process.env.BOT_API_SECRET) {
    console.error('[Bot] ❌ BOT_API_SECRET not found in environment! Bot will not be able to save callouts.');
  } else {
    console.log('[Bot] ✅ Bot API secret configured');
  }
});

client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Only respond to DMs
  if (message.channel.type !== 1) return;
  
  // Get the message content
  const userText = message.content.trim();
  if (!userText) return;
  
  console.log(`[Bot] Processing DM from ${message.author.username}: "${userText}"`);
  
  try {
    // Parse the message with OpenAI
    const result = await parseCalloutWithAI(userText);
    
    if (result.error) {
      console.log(`[Bot] AI parsing failed: ${result.error}`);
      await message.reply(`❌ Could not parse callout: ${result.error}\n\nTry being more specific, like:\n• "out friday sick"\n• "late tuesday 30 minutes"`);
      return;
    }
    
    console.log(`[Bot] AI parsed successfully:`, result);
    
    // Create confirmation message and buttons
    const confirmationText = createConfirmationMessage(result, message.author.username);
    
    // Generate unique confirmation ID
    const confirmationId = `${message.author.id}_${Date.now()}`;
    console.log(`[Bot] Creating confirmation with ID: ${confirmationId}`);
    
    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm_callout_${confirmationId}`)
      .setLabel('✅ Yes, Save It')
      .setStyle(ButtonStyle.Success);
    
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_callout_${confirmationId}`)
      .setLabel('❌ No, Cancel')
      .setStyle(ButtonStyle.Danger);
    
    const editButton = new ButtonBuilder()
      .setCustomId(`edit_callout_${confirmationId}`)
      .setLabel('✏️ Edit')
      .setStyle(ButtonStyle.Secondary);
    
    const row = new ActionRowBuilder()
      .addComponents(confirmButton, editButton, cancelButton);
    
    // Store the pending confirmation BEFORE sending message
    pendingConfirmations.set(confirmationId, {
      userId: message.author.id,
      username: message.author.username,
      result: result,
      timestamp: Date.now()
    });
    
    console.log(`[Bot] Stored confirmation ${confirmationId} for user ${message.author.username}`);
    
    // Send confirmation message with buttons
    const confirmationMessage = await message.reply({
      content: confirmationText,
      components: [row]
    });
    
    console.log(`[Bot] Confirmation message sent successfully`);
    
    // EXTENDED: Auto-expire confirmation after 10 minutes (was 5)
    setTimeout(() => {
      if (pendingConfirmations.has(confirmationId)) {
        console.log(`[Bot] Auto-expiring confirmation ${confirmationId}`);
        pendingConfirmations.delete(confirmationId);
        confirmationMessage.edit({
          content: confirmationText + '\n\n⏰ **Confirmation expired** - Please send your callout again.',
          components: []
        }).catch(() => {}); // Ignore errors if message was deleted
      }
    }, 10 * 60 * 1000); // 10 minutes instead of 5
    
  } catch (error) {
    console.error('[Bot] Error processing message:', error);
    await message.reply('❌ Something went wrong processing your message. Please try again.');
  }
});

// Handle button interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  
  console.log(`[Bot] Button interaction received: ${interaction.customId}`);
  
  // FIXED: Properly extract confirmation ID from button custom ID
  const parts = interaction.customId.split('_');
  const action = parts[0]; // confirm, cancel, or edit
  // confirmationId is everything after "action_callout_"
  const confirmationId = parts.slice(2).join('_'); // Join back the ID parts
  
  console.log(`[Bot] Parsed action: ${action}, confirmationId: ${confirmationId}`);
  
  if (!confirmationId || !pendingConfirmations.has(confirmationId)) {
    console.log(`[Bot] Confirmation ${confirmationId} not found or expired`);
    console.log(`[Bot] Available confirmations:`, Array.from(pendingConfirmations.keys()));
    
    // FIXED: Use flags instead of ephemeral
    await interaction.reply({
      content: '❌ This confirmation has expired. Please send your callout again.',
      flags: [64] // 64 = EPHEMERAL flag
    });
    return;
  }
  
  const confirmation = pendingConfirmations.get(confirmationId);
  console.log(`[Bot] Found confirmation for user ${confirmation.username}`);
  
  // Verify the user
  if (confirmation.userId !== interaction.user.id) {
    await interaction.reply({
      content: '❌ You can only confirm your own callouts.',
      flags: [64] // EPHEMERAL flag
    });
    return;
  }
  
  switch (action) {
    case 'confirm':
      console.log(`[Bot] Confirming callout for ${confirmation.username}`);
      await interaction.deferReply();
      
      // Save to database
      const saveResult = await saveCalloutToDatabase(confirmation.result, confirmation.username);
      
      if (saveResult.success) {
        const successMessage = `✅ **Callout Saved Successfully!**\n\n` +
          `**${confirmation.result.status}** on **${formatDate(confirmation.result.date)}**` +
          (confirmation.result.reason ? ` - ${confirmation.result.reason}` : '') +
          (confirmation.result.delay ? `\nDelay: ${confirmation.result.delay} minutes` : '');
        
        await interaction.editReply({
          content: successMessage,
          components: []
        });
        
        console.log(`[Bot] Callout saved successfully for ${confirmation.username}`);
      } else {
        await interaction.editReply({
          content: `❌ **Failed to save callout:** ${saveResult.error}\n\nPlease try again or contact an admin.`,
          components: []
        });
        
        console.error(`[Bot] Failed to save callout: ${saveResult.error}`);
      }
      
      // Clean up
      pendingConfirmations.delete(confirmationId);
      console.log(`[Bot] Cleaned up confirmation ${confirmationId}`);
      break;
      
    case 'cancel':
      console.log(`[Bot] Cancelling callout for ${confirmation.username}`);
      await interaction.reply({
        content: '❌ **Callout cancelled.** Send a new message if you want to try again.',
        components: []
      });
      
      // Clean up
      pendingConfirmations.delete(confirmationId);
      console.log(`[Bot] Cleaned up cancelled confirmation ${confirmationId}`);
      break;
      
    case 'edit':
      console.log(`[Bot] Edit requested for ${confirmation.username}`);
      await interaction.reply({
        content: '✏️ **To edit your callout, just send a new message with the corrected information.**\n\n' +
                'Examples:\n' +
                '• "out thursday sick"\n' +
                '• "late friday 45 minutes traffic"\n' +
                '• "out tuesday dr appointment"',
        components: []
      });
      
      // Don't delete confirmation yet - let them send a new message
      break;
  }
});

// Enhanced error handling
client.on('error', (error) => {
  console.error('[Bot] Discord client error:', error);
});

client.on('disconnect', () => {
  console.warn('[Bot] Disconnected from Discord');
});

client.on('reconnecting', () => {
  console.log('[Bot] Reconnecting to Discord...');
});

// Clean up expired confirmations periodically
setInterval(() => {
  const now = Date.now();
  const expiredKeys = [];
  
  for (const [key, confirmation] of pendingConfirmations.entries()) {
    if (now - confirmation.timestamp > 10 * 60 * 1000) { // 10 minutes
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => {
    pendingConfirmations.delete(key);
    console.log(`[Bot] Cleaned up expired confirmation: ${key}`);
  });
}, 60 * 1000); // Check every minute

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('[Bot] Failed to login to Discord:', error);
  process.exit(1);
});