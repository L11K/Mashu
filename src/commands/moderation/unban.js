const Command = require("../../Command");

class Unban extends Command {
    constructor(category) {
        super({
            name: "unban",
            description: "Unban a user from the current guild",
            usage: "unban <member: string> [reason: string]",
            category: category,
            guildOnly: true,
            requiredArgs: 2,
            userPermissions: ["sendMessages", "banMembers"],
            botPermissions: ["readMessages", "sendMessages", "banMembers"]
        });
    }

    async run(msg, args, client, { settings, database }) {
        const userToUnban = args.shift();
        const reason = args.join(" ");

        const bans = await msg.channel.guild.getBans();
        const entry = bans.find((e) => e.user.username.toLowerCase().indexOf(userToUnban.toLowerCase()) > -1);

        if (!entry) return await msg.channel.createMessage("Couldn't find a user with that name on the ban list.");

        try {
            await msg.channel.guild.unbanMember(entry.user.id, reason);

            const guild = await database.guild.findOne({ "id": msg.channel.guild.id }).exec();
            if (guild) {
                const user = guild.users.find((o) => o.id === entry.user.id);
                let banCount = 1;
                if (user) {
                    user.isBanned = false;
                    banCount = user.bans.length;
                }

                if (guild.logChannel) {
                    await client.createMessage(guild.logChannel, {
                        embed: {
                            title: "UNBAN",
                            color: settings.colors.unban,
                            description: `**Unbanned:** ${entry.user.username}#${entry.user.discriminator}\n` +
                                `**By:** ${msg.author.mention}\n` +
                                `**Reason:** ${reason}\n` +
                                `User has been banned ${banCount} ${banCount === 1 ? "time" : "times"}`,
                            timestamp: (new Date()).toISOString(),
                            footer: { text: `ID: ${entry.user.id}` }
                        }
                    });
                }

                await database.guild.updateOne({ "id": msg.channel.guild.id }, guild).exec();
            }
        } catch (error) {
            return await msg.channel.createMessage({
                embed: {
                    color: settings.colors.error,
                    description: error.toString()
                }
            });
        }

        try {
            const channel = await entry.user.getDMChannel();
            await channel.createMessage(`You have been unbanned from: **${msg.channel.guild.name}**\nBy: **${msg.author.username}**\nWith reason: **${reason}**`);
        } catch (error) {
            await msg.channel.createMessage("Couldn't DM the unbanned user.");
        }
    }
}


module.exports = Unban;
