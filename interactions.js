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
import {
  constructCustomCommand,
  storeCommand,
  createReward,
} from "./commands/construction.js";
import { executeCustomCommand } from "./commands/customexec.js";
import fetch from "node-fetch";

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

  return await handleUnknownCommand(name, payload);
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
        content: `You can't send reputation to yourself, <@${fromUser.id}>!`,
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
      console.log(fromUser.username);
      const fromIdentity = await getIdentityByID(
        1,
        fromUser.id,
        fromUser.username
      );
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
  // TODO: validate params
  const commandName = payload.data.options[0].value;
  const description = payload.data.options[1].value;
  let hasUniqueEvents;
  if (payload.data.options[2]) {
    hasUniqueEvents = payload.data.options[2].value;
  }

  let subjects;
  if (payload.data.options[3]) {
    subjects = payload.data.options[3].value;
  }

  let rewardOption;
  if (payload.data.options[4]) {
    rewardOption = payload.data.options[4].value;
  }

  let rewardType;
  if (payload.data.options[5]) {
    rewardType = payload.data.options[5].value;
  }

  const guildId = payload["guild_id"];

  const storeCmdResp = await storeCommand(
    guildId,
    commandName,
    description,
    hasUniqueEvents,
    subjects,
    rewardOption,
    rewardType
  );

  if (!storeCmdResp) {
    console.error("Failed to store command action, aborting");
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `💀❌ command ${commandName} failed to be created for this server`,
      },
    };
  } else {
    // console.log(storeCmdResp.id);
    if (rewardOption === "fixed") {
      const createRewardResp = await createReward(storeCmdResp.id, 1, 10);
      if (!createRewardResp) {
        console.error("Failed to store command action, aborting");
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `💀❌ Failed to create reward for  ${commandName}!`,
          },
        };
      }
    }
  }

  // register command
  const command = constructCustomCommand(
    commandName,
    description,
    hasUniqueEvents,
    subjects,
    rewardOption,
    rewardType
  );

  await HasGuildCommands(process.env.APP_ID, guildId, [command]);

  // return response for the creation
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `🤖 command ${commandName} is created for this server`,
    },
  };
};

export const getActionIDForNewMessage = async (sourceID) => {
  const payload = {
    source_ids: [sourceID],
    types: ["NewMessage"],
    name: "New message",
  };
  console.log(payload);
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
    console.error(await response.text());
    return;
  } else {
    const data = await response.json();
    return data.actions[0].id;
  }
};

const handleUnknownCommand = async (name, payload) => {
  const executionResult = await executeCustomCommand(name, payload);

  if (executionResult) {
    return executionResult;
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `❌ command ${name} was not found`,
    },
  };
};
