import { SlashCommandBuilder } from 'discord.js';
import { syncRoleUsers } from '../utils/db.js';

const ROLE_MAIN = 'Malfunctional';
const ROLE_OFFICER = 'Malfunctional Officer';

export const data = new SlashCommandBuilder()
  .setName('mfb_updateusers')
  .setDescription('Sync users with the Malfunctional role (Officers set as admin)');

export async function execute(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.roles.cache.some(r => r.name === ROLE_OFFICER)) {
    await interaction.reply({ content: 'You do not have admin privileges.', ephemeral: true });
    return;
  }
  await syncRoleUsers(interaction.client, ROLE_MAIN, ROLE_OFFICER, msg =>
    interaction.reply({ content: msg, ephemeral: true })
  );
}