import { InteractionResponseType } from "discord-interactions";
import { getRandomEmoji, getUserById } from "./utils.js";
import {
  reportPayment,
  reportRepTransfer,
  getOrgId,
  topUp,
  getIdentityByID,
} from "./bounties.js";
import { HasGuildCommands } from "./commands/commands-def.js";

export const handleApplicationCommand = async (name, payload) => {
  if (name === "test") {
    // Send a message into the channel where command was triggered from
    return handleTestCommand(payload);
  }

  if (name === "pay") {
    return await handlePayCommand(payload);
  }

  if (name === "giverep") {
    return await handleGiverepCommand(payload);
  }

  if (name === "command") {
    return await handleCreateCommandCommand(payload);
  }

  return handleUnknownCommand(payload);
};

// TODO: add available commands to the command registry
const handleTestCommand = (_) => {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      // Fetches a random emoji to send from a helper function
      content: "hello world " + getRandomEmoji(),
    },
  };
};

const handlePayCommand = async (payload) => {
  const fromUser = payload.member.user;
  const fromUserId = payload.member.id;
  const toUserId = payload.data.options[0].value;
  const amount = payload.data.options[1].value;
  const guildID = payload.guild_id;
  let context;
  if (payload.data.options[2]) {
    context = payload.data.options[2].value;
  }
  const reason = context ? context : "no reason";

  console.log("Retrieving recipient data");
  const toUser = await getUserById(toUserId);
  console.log("To user: %s", JSON.stringify(toUser));
  console.log("UserID: %s", JSON.stringify(toUserId));

  await reportPayment(fromUser, toUser, amount, reason, guildID);

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `💸 <@${fromUser.id}> paid ETH ${amount} to <@${toUserId}> for ${reason} 💸`,
    },
  };
};

const handleGiverepCommand = async (payload) => {
  const fromUser = payload.member.user;

  const guildID = payload.guild_id;
  const toUserId = payload.data.options[0].value;
  const amount = payload.data.options[1].value;
  const toUserName = payload.data.resolved.users[toUserId].username;
  let context;
  if (payload.data.options[2]) {
    context = payload.data.options[2].value;
  }
  const reason = context ? context : "no reason";

  console.log("Retrieving recipient data");
  const toUser = await getUserById(toUserId);
  const response = await getOrgId(guildID);
  const orgID = response.sources[0].organization_id;

  if (fromUser.id === toUserId)
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `You can't send reputation you yourself, <@${fromUser.id}>!`,
      },
    };
  const negativeTopUpResp = await topUp(orgID, fromUser.id, -amount, 1);
  console.log(negativeTopUpResp.status);
  console.log(negativeTopUpResp.wallets);
  console.log(negativeTopUpResp.error);
  // const positiveTopUpResp = await topUp(orgID, toUserId, amount, 1);

  if (!negativeTopUpResp.error) {
    const positiveTopUpResp = await topUp(orgID, toUserId, amount, 1);
    if (!negativeTopUpResp.error) {
      console.log("fromUser.id");
      console.log("fromUser.id");
      console.log("fromUser.id");
      console.log("fromUser.id");

      console.log(fromUser.id);
      const fromIdentity = await getIdentityByID(1, fromUser.id);
      await reportRepTransfer(
        orgID,
        1,
        1,
        fromIdentity,
        toUserName,
        amount,
        reason
      );
      if (!reportRepTransfer.error) {
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `🚀 <@${fromUser.id}> sent ${amount}ᐩ to <@${toUserId}> for ${reason}`,
          },
        };
      } else
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Something's up with storing this transaction in Feed, but it did go through to <@${toUserId}>'s wallet. Ping Mercantille team to let them know what's up`,
          },
        };
    } else
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Something's up with the <@${toUserId}>'s wallet!`,
        },
      };
  } else
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Not enough ᐩ in the <@${fromUser.id}>'s wallet!`,
      },
    };
};

// await reportRepTransfer(fromUser, toUser, amount, reason);

const handleCreateCommandCommand = async (payload) => {
  // TODO: update params according to https://3.basecamp.com/5433923/buckets/29084181/documents/5295606577#__recording_5567561462
  // TODO: validate params
  const commandName = payload.data.options[0].value;
  const bio = payload.data.options[1].value;
  let isUniqueName;
  if (payload.data.options[2]) {
    isUniqueName = payload.data.options[2].value;
  }

  let isBioRequired;
  if (payload.data.options[3]) {
    isBioRequired = payload.data.options[3].value;
  }

  let sublects;
  if (payload.data.options[4]) {
    sublects = payload.data.options[4].value;
  }

  let rewardOption;
  if (payload.data.options[5]) {
    rewardOption = payload.data.options[5].value;
  }

  const guildId = payload["guild_id"];
  //TODO:  call backend to persist command

  // register command
  const command = {
    name: commandName,
    description: bio,
    type: 1,
    options: [
      {
        type: 3, // string
        name: "uniquename",
        description: "Unique name for sub event",
        required: false,
      },
      {
        type: 10, // number
        name: "reward",
        description: "Reward!",
        required: false,
      },
    ],
  };
  await HasGuildCommands(process.env.APP_ID, guildId, [command]);

  // return response for the creation
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `🤖 command ${commandName} is created for this server`,
    },
  };
};

const handleUnknownCommand = (payload) => {
  // TODO: check if present in DB for this guild_id
  console.error(payload);
  throw new Error("Unknown command provided");
};
