import {
  SlashCommandBuilder, ChannelType, ButtonBuilder, ActionRowBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle
} from 'discord.js';
import { setAttendanceChannel, getAttendanceConfig } from '../utils/db.js';

const ROLE_OFFICER = 'Malfunctional Officer';
export const SET_CHANNEL_BUTTON = 'mfbadmin_set_attendance_channel';
export const OUT_BUTTON = 'mfbadmin_out_button';
export const LATE_BUTTON = 'mfbadmin_late_button';
export const EDIT_BUTTON = 'mfbadmin_edit_button';
export const DELETE_BUTTON = 'mfbadmin_delete_button';

export const data = new SlashCommandBuilder()
  .setName('mfbadmin')
  .setDescription('Open admin control panel for attendance system');

// This function posts/edits the persistent message and updates DB
export async function ensureAttendancePanel(guild, channel, client) {
  // Button row
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(OUT_BUTTON).setLabel('Out').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(LATE_BUTTON).setLabel('Late').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(EDIT_BUTTON).setLabel('Edit').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(DELETE_BUTTON).setLabel('Delete').setStyle(ButtonStyle.Secondary)
  );
const panelContent = `Malfunctional Attendance Bot

Click a button to submit or edit your callout.`;


  // Check for existing panel
  const config = await getAttendanceConfig(guild.id);
  let message;
  if (config && config.message_id) {
    try {
      message = await channel.messages.fetch(config.message_id);
      await message.edit({ content: panelContent, components: [row] });
      return message;
    } catch {
      // message missing/deleted: post new below
    }
  }
  message = await channel.send({ content: panelContent, components: [row] });
  await setAttendanceChannel(guild.id, channel.id, message.id);
  return message;
}

export async function execute(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.roles.cache.some(r => r.name === ROLE_OFFICER)) {
    await interaction.reply({ content: 'You do not have admin privileges.', ephemeral: true });
    return;
  }
  // Post or repair the persistent attendance panel
  const channel = interaction.channel;
  if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
    await interaction.reply({ content: 'Please use this in a text channel.', ephemeral: true });
    return;
  }
  await ensureAttendancePanel(interaction.guild, channel, interaction.client);
  await interaction.reply({ content: 'Attendance panel is now set in this channel.', ephemeral: true });
}

export async function handleButton(interaction) {
  // Out
  if (interaction.customId === OUT_BUTTON) {
    const modal = new ModalBuilder()
      .setCustomId('modal_out')
      .setTitle('Out Callout')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('date')
            .setLabel('Date (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Reason')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(125)
        )
      );
    await interaction.showModal(modal);
    return;
  }
  // Late
  if (interaction.customId === LATE_BUTTON) {
    const modal = new ModalBuilder()
      .setCustomId('modal_late')
      .setTitle('Late Callout')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('date')
            .setLabel('Date (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('delay')
            .setLabel('Delay (minutes)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Reason')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(125)
        )
      );
    await interaction.showModal(modal);
    return;
  }
  // Edit/Delete: Placeholder logic (to be expanded)
  if (interaction.customId === EDIT_BUTTON) {
    await interaction.reply({ content: 'Edit logic coming soon.', ephemeral: true });
    return;
  }
  if (interaction.customId === DELETE_BUTTON) {
    await interaction.reply({ content: 'Delete logic coming soon.', ephemeral: true });
    return;
  }
}