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
import {
  executeCustomCommand,
  queryCommandByGuild,
} from "./commands/customexec.js";
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

  if (name === "checkrep") {
    return await handleCheckrepCommand(payload);
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
  const actionID = await queryCommandByGuild("/giverep ⁺ transfer", guildID);
  const response = await getOrgId(guildID);
  const orgID = response.sources[0].organization_id;
  const sourceID = response.sources[0].id;

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
      const fromIdentity = await getIdentityByID(
        1,
        fromUser.id,
        fromUser.username
      );
      await reportRepTransfer(
        orgID,
        actionID,
        sourceID,
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

const handleCheckrepCommand = async (payload) => {
  const fromUser = payload.member.user;

  const guildID = payload.guild_id;

  console.log("Retrieving recipient data");

  const orgIDResponse = await getOrgId(guildID);
  const orgID = orgIDResponse.sources[0].organization_id;
};

// await reportRepTransfer(fromUser, toUser, amount, reason);

const handleCreateCommandCommand = async (payload) => {
  // TODO: validate params
  const fromUser = payload.member;
  const permissions = payload.member.permissions;
  console.log(permissions);
  const bigPermissions = BigInt(permissions);

  const perm = permissions & (1 << 3);
  const isAdmin = !((permissions & (1 << 3)) === 0);

  console.log("fromUser");
  console.log("fromUser");
  console.log("fromUser");
  console.log("fromUser");

  console.log(isAdmin);
  console.log(" END OF fromUser");

  if (isAdmin === true) {
    const commandName = payload.data.options[0].value;
    console.log("commandName");
    console.log(commandName);
    const description = payload.data.options[1].value;
    console.log("description");
    console.log(description);

    let subjects;
    if (payload.data.options[2]) {
      subjects = payload.data.options[2].value;
      console.log("subjects");
      console.log(subjects);
    }

    let rewardOption;
    if (payload.data.options[3]) {
      rewardOption = payload.data.options[3].value;
      console.log("rewardOption");
      console.log(rewardOption);
    }

    let rewardType;
    if (payload.data.options[4]) {
      rewardType = payload.data.options[4].value;
      console.log("rewardType");
      console.log(rewardType);
    }

    const guildId = payload["guild_id"];

    const storeCmdResp = await storeCommand(
      guildId,
      commandName,
      description,
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
      console.log("checking for reward option");
      console.log(rewardOption);
      console.log(rewardType);
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
  } else
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Only admins can create commands!`,
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
