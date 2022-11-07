import {
    InteractionResponseType,
} from "discord-interactions";
import {
    getRandomEmoji,
    getUserById,
} from "./utils.js";
import { reportPayment, reportRepTransfer } from "./bounties.js";
import { HasGuildCommands } from "./commands/commands-def.js";


export const handleApplicationCommand = async (name, payload) => {
    if (name === "test") {
        // Send a message into the channel where command was triggered from
        return handleTestCommand(payload)
    }

    if (name === "pay") {
        return await handlePayCommand(payload)
    }

    if (name === "giverep") {
        return await handleGiverepCommand(payload)
    }

    if (name === "command") {
        return await handleCreateCommandCommand(payload)
    }

    return handleUnknownCommand(payload)
}

// TODO: add available commands to the command registry
const handleTestCommand = (_) => {
    return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            // Fetches a random emoji to send from a helper function
            content: "hello world " + getRandomEmoji(),
        },
    };
}

const handlePayCommand = async (payload) => {
    const fromUser = payload.member.user;
    const toUserId = payload.data.options[0].value;
    const amount = payload.data.options[1].value;
    let context;
    if (payload.data.options[2]) {
        context = payload.data.options[2].value;
    }
    const reason = context ? context : "no reason";

    console.log("Retrieving recipient data");
    const toUser = await getUserById(toUserId);
    console.log("To user: %s", JSON.stringify(toUser));

    await reportPayment(fromUser, toUser, amount, reason);

    return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: `💸 <@${fromUser.id}> paid ETH ${amount} to <@${toUserId}> for ${reason} 💸`,
        },
    };
}

const handleGiverepCommand = async (payload) => {
    const fromUser = payload.member.user;
    const toUserId = payload.data.options[0].value;
    const amount = payload.data.options[1].value;
    let context;
    if (payload.data.options[2]) {
        context = payload.data.options[2].value;
    }
    const reason = context ? context : "no reason";

    console.log("Retrieving recipient data");
    const toUser = await getUserById(toUserId);
    console.log("To user: %s", JSON.stringify(toUser));

    await reportRepTransfer(fromUser, toUser, amount, reason);

    return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: `🚀 <@${fromUser.id}> sent ${amount}ᐩ to <@${toUserId}> for ${reason}`,
        },
    };
}

const handleCreateCommandCommand = async (payload) => {
    // TODO: validate params
    const commandName = payload.data.options[0].value;
    const bio = payload.data.options[1].value;
    let isUniqueName;
    if (payload.data.options[2]) {
        isUniqueName = payload.data.options[2].value;
    }

    let isBioRequired
    if (payload.data.options[3]) {
        isBioRequired = payload.data.options[3].value;
    }

    let sublects
    if (payload.data.options[4]) {
        sublects = payload.data.options[4].value;
    }

    let rewardOption
    if (payload.data.options[5]) {
        rewardOption = payload.data.options[5].value;
    }

    const guildId = payload['guild_id'];
    //TODO:  call backend to persist command

    // register command
    const command = {
        name: commandName,
        description: bio,
        type: 1,
        options: [
            {
                type: 3, // string
                name: "uniqueName",
                description: "Unique name for sub event",
                required: false
            },
            {
                type: 10, // number
                name: "Reward",
                required: true
            }
        ]
    };
    await HasGuildCommands(process.env.APP_ID, guildId, [command]);

    // return response for the creation
    return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: `🤖 command ${commandName} is created for this server`,
        },
    };
}

const handleUnknownCommand = (payload) => {
    console.error(payload);
    throw new Error("Unknown command provided");
}
