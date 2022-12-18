import { InteractionResponseType } from "discord-interactions";
import fetch from "node-fetch";
import { getOrgId } from "../bounties.js"


export const executeCustomCommand = async (name, guildId) => {
    const commandDef = await findCustomCommand(name, guildId)

    console.log(commandDef)

    if (commandDef) {
        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: `✅ command ${name} was found!`,
            },
        };
    }
    return
}

const findCustomCommand = async (name, guildId) => {
    if (!name) {
        return
    }

    const commandSettings = await queryCommandByGuild(name, guildId)
    if (!commandSettings) {
        return
    }

    return {
        name: commandSettings.name,
        description: commandSettings.description,
        uniqueEvents: commandSettings.specifics_required,
        sublects: commandSettings.users_targeted === 1 ? 'single' : commandSettings.users_targeted === 2 ? 'multiple' : 'no_sublects',
        rewardOption: commandSettings.custom_rewards ? 'dynamic' : 'fixed',
        rewardType: commandSettings.is_transfer ? 'transactable' : 'generated'
    }
}

const queryCommandByGuild = async (name, guildId) => {
    const sources = await getOrgId(guildId)
    console.log("Found sources for guild:")
    console.log(sources)

    if (!sources || !sources.sources || sources.sources.length === 0) {
        console.error(`Sources not found for guildId ${guildId}`)
        return
    }
    const sourceId = sources.sources[0].id // for now, it's only discord

    const payload = {
        source_ids: [sourceId],
        types: ['Command'],
        names: [name]
    }

    const endpoint = "https://api.mercantille.xyz/api/v1/action/query";
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "User-Agent":
                "DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
            Authorization: `Bearer ${process.env.BACKEND_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        console.error("Received error from server: HTTP %d", response.status);
        console.error((await response.text()))
        return
    }

    const commands = await response.json()

    if (commands.length === 0) {
        console.error(`No commands found for name ${name} and guild ${guildId}`)
        return
    }

    console.log(commands[0])

    return commands[0]
}