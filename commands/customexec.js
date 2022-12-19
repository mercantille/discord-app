import { InteractionResponseType } from "discord-interactions";
import e from "express";
import fetch from "node-fetch";
import {
  getIdentityByID,
  getOrgId,
  reportRepTransfer,
  storeActionInTheFeed,
  topUp,
} from "../bounties.js";

export const executeCustomCommand = async (name, payload) => {
  console.log(`Searching for command definition ${name}`);
  const commandDef = await findCustomCommand(name, payload.guild_id);

  console.log(commandDef);

  if (commandDef) {
    const commandResp = await doExecuteCommand(commandDef, payload);
    console.log(commandResp);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: commandResp.data.content,
      },
    };
  }
  return;
};

const findCustomCommand = async (name, guildId) => {
  if (!name) {
    return;
  }

  const commandSettings = await queryCommandByGuild(name, guildId);
  if (!commandSettings) {
    return;
  }

  console.log("Command settings");
  console.log(commandSettings);
  console.log("Finished settings");
  return {
    id: commandSettings.id,
    name: commandSettings.name,
    description: commandSettings.description,
    uniqueEvents: commandSettings.specifics_required,
    subjects:
      commandSettings.users_targeted === 1
        ? "single"
        : commandSettings.users_targeted === 2
        ? "multiple"
        : "no_subjects",
    rewardOption: commandSettings.custom_rewards ? "dynamic" : "fixed",
    rewardType: commandSettings.is_transfer ? "transactable" : "generated",
  };
};

const queryCommandByGuild = async (name, guildId) => {
  const sources = await getOrgId(guildId);
  console.log("Found sources for guild:");
  console.log(sources);

  if (!sources || !sources.sources || sources.sources.length === 0) {
    console.error(`Sources not found for guildId ${guildId}`);
    return;
  }
  const sourceId = sources.sources[0].id; // for now, it's only discord

  const payload = {
    source_ids: [sourceId],
    types: ["Command"],
    names: [name],
  };

  console.log("Prepared payload:");
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
  }

  const commands = await response.json();
  console.log("Received response:");
  console.log(commands);

  if (commands.actions.length === 0) {
    console.error(`No commands found for name ${name} and guild ${guildId}`);
    return;
  }

  console.log(commands.actions[0]);

  return commands.actions[0];
};

const doExecuteCommand = async (commandDef, payload) => {
  const fromUser = payload.member.user;
  const fromUserId = payload.member.user.id;
  const sources = await getOrgId(payload.guild_id);
  const sourceID = sources.sources[0].id;
  const orgID = sources.sources[0].organization_id;

  const fromUserIdentity = await getIdentityByID(
    1,
    fromUserId,
    fromUser.username
  );

  const options = payload.data.options;

  let uniqueName;
  if (commandDef.uniqueEvents) {
    uniqueName = options.shift().value;
  }

  let monetaryAmount;
  if (commandDef.rewardOption === "dynamic") {
    let currency = options.shift().value;
    let amount = options.shift().value;
    monetaryAmount = {
      currency,
      amount,
    };
  }

  // TODO: handle fixed reward

  const subjects = [];
  if (commandDef.subjects === "single") {
    subjects.push(options.shift());
  } else if (commandDef.subjects === "multiple") {
    while (options.length > 0) {
      subjects.push(options.shift());
    }
  }

  if (commandDef.rewardType === "transactable") {
    if (monetaryAmount.currency === "rep") {
      console.log(subjects);
      for (const subject of subjects) {
        const negativeTopUpResp = await topUp(
          orgID,
          fromUserId,
          -monetaryAmount.amount,
          1
        );
        console.log(negativeTopUpResp);
        if (!negativeTopUpResp.error) {
          const positiveTopUpResp = await topUp(
            orgID,
            subject.value,
            monetaryAmount.amount,
            1
          );
          if (positiveTopUpResp.error) {
            await topUp(orgID, fromUserId, monetaryAmount.amount, 1);
            return {
              data: {
                content: `Something went wrong with the transfer, reverting the transaction!`,
              },
            };
          }
        } else if (
          negativeTopUpResp.error ===
          "Balance of the user should never be a negative number"
        ) {
          return {
            // type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Not enough ᐩ in the <@${fromUserId}>'s wallet!`,
            },
          };
        }
        // console.log(commandDef);
        // console.log("PAYLOAD");
        const toUserName = payload.data.resolved.users[subject.value].username;
        await reportRepTransfer(
          orgID,
          commandDef.id,
          sourceID,
          fromUserIdentity,
          toUserName,
          monetaryAmount.amount
        );
      }
      if (subjects.length === 1) {
        return {
          data: {
            content: `<@${fromUserId}> invoked the /${commandDef.name} command and transfered ${monetaryAmount.amount}ᐩ to <@${subject.value}>`,
          },
        };
      } else
        return {
          data: {
            content: `<@${fromUserId}> invoked the /${commandDef.name} command and transfered ${monetaryAmount.amount}ᐩ to multiple people!`,
          },
        };
    }
  } else {
    // TODO: transfer currency
  }

  // TODO: Generate rep

  // TODO: construct response to discord
};
