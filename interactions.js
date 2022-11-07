import {
    InteractionResponseType,
  } from "discord-interactions";  
import {
    getRandomEmoji,
    getUserById,
} from "./utils.js";
import { reportPayment, reportRepTransfer } from "./bounties.js";


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

const handleUnknownCommand = (payload) => {
    console.error(payload)
    throw new Error("Unknown command provided")
}
