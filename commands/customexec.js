import { InteractionResponseType } from "discord-interactions";
import e from "express";
import fetch from "node-fetch";
import {
  getIdentityByID,
  getOrgId,
  reportRepTransfer,
  storeActionInTheFeed,
  reportTriggerCommand,
  topUp,
  reportFixedCommand,
  getActionRewards,
} from "../bounties.js";

export const executeCustomCommand = async (name, payload) => {
  console.debug(`Searching for command definition ${name}`);
  const commandDef = await findCustomCommand(name, payload.guild_id);

  if (commandDef) {
    const commandResp = await doExecuteCommand(commandDef, payload);

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

  return {
    id: commandSettings.id,
    name: commandSettings.name,
    description: commandSettings.description,
    // uniqueEvents: commandSettings.specifics_required,
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

export const queryCommandByGuild = async (name, guildId) => {
  const sources = await getOrgId(guildId);

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

  if (commands.actions.length === 0) {
    console.error(`No commands found for name ${name} and guild ${guildId}`);
    return;
  }

  return commands.actions[0];
};

const doExecuteCommand = async (commandDef, payload) => {
  const fromUser = payload.member.user;
  const fromUserId = payload.member.user.id;
  const sources = await getOrgId(payload.guild_id);
  const sourceID = sources.sources[0].id;
  const orgID = sources.sources[0].organization_id;
  const fromUserIdentity = await getIdentityByID(
    sourceID,
    fromUserId,
    fromUser.username
  );

  const options = payload.data.options;

  let monetaryAmount;
  if (
    commandDef.rewardOption === "dynamic" &&
    commandDef.subjects !== "no_subjects"
  ) {
    let currency = options.shift().value;
    let amount = options.shift().value;
    monetaryAmount = {
      currency,
      amount,
    };
  }

  let context = options.shift().value;

  const subjects = [];
  if (commandDef.subjects === "single") {
    subjects.push(options.shift());
  } else if (commandDef.subjects === "multiple") {
    while (options.length > 0) {
      subjects.push(options.shift());
    }
  }
  if (
    commandDef.subjects !== "no_subjects" &&
    commandDef.rewardOption !== "fixed"
  ) {
    if (commandDef.rewardType === "transactable") {
      if (monetaryAmount.amount < 0)
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Stealing is not nice, <@${fromUser.id}>! 👀`,
          },
        };
      
      for (const subject of subjects) {
        const negativeTopUpResp = await topUp(
          orgID,
          fromUserId,
          -monetaryAmount.amount,
          1
        );

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
        const toUserName = payload.data.resolved.users[subject.value].username;

        await reportRepTransfer(
          orgID,
          commandDef.id,
          sourceID,
          fromUserIdentity,
          toUserName,
          monetaryAmount.amount,
          context
        );
      }
      if (subjects.length === 1) {
        return {
          data: {
            content: `<@${fromUserId}> invoked the /${commandDef.name} command and transfered ${monetaryAmount.amount}ᐩ to <@${subjects[0].value}>`,
          },
        };
      } else {
        return {
          data: {
            content: `<@${fromUserId}> invoked the /${commandDef.name} command and transfered ${monetaryAmount.amount}ᐩ to multiple people!`,
          },
        };
      }
    } else {
      const permissions = payload.member.permissions;

      const isAdmin = !((permissions & (1 << 3)) === 0);

      if (isAdmin === true) {
        for (const subject of subjects) {
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
                content: `Something went wrong with the transaction, reach out to the Mercantille team!`,
              },
            };
          }
          const toUserName =
            payload.data.resolved.users[subject.value].username;
          await reportRepTransfer(
            orgID,
            commandDef.id,
            sourceID,
            fromUserIdentity,
            toUserName,
            monetaryAmount.amount,
            context
          );
        }
        if (subjects.length === 1) {
          return {
            data: {
              content: `<@${fromUserId}> invoked the /${commandDef.name} command and rewarded ${monetaryAmount.amount}ᐩ to <@${subjects[0].value}>`,
            },
          };
        } else
          return {
            data: {
              content: `<@${fromUserId}> invoked the /${commandDef.name} command and rewarded ${monetaryAmount.amount}ᐩ to multiple people!`,
            },
          };
      } else
        return {
          data: {
            content: `Only admins can invoke commands with generated rewards`,
          },
        };
    }
  } else if (commandDef.subjects === "no_subjects") {
    let rewards = await getActionRewards([commandDef.id]);
    let reward = rewards[0].reward_value;
    await reportTriggerCommand(
      orgID,
      commandDef.id,
      sourceID,
      fromUserIdentity,
      context
    );
    return {
      data: {
        content: `<@${fromUserId}> invoked the /${commandDef.name} command! 🥑 They have been rewarded ${reward}ᐩ`,
      },
    };
  } else {
    let rewards = await getActionRewards([commandDef.id]);
    let reward = rewards[0].reward_value;
    for (const subject of subjects) {
      const toUserName = payload.data.resolved.users[subject.value].username;
      await reportFixedCommand(
        orgID,
        commandDef.id,
        sourceID,
        fromUserIdentity,
        toUserName,
        subject.value,
        context
      );
      await topUp(orgID, subject.value, reward, 1);
    }
    if (subjects.length === 1)
      return {
        data: {
          content: `<@${fromUserId}> invoked the /${commandDef.name} command and mentioned <@${subjects[0].value}>! 🥳 <@${subjects[0].value}> received ${reward}ᐩ`,
        },
      };
    else
      return {
        data: {
          content: `<@${fromUserId}> invoked the /${commandDef.name} command and mentioned multiple people! 🤌 All of them received ${reward}ᐩ`,
        },
      };
  }

  // TODO: Generate rep

  // TODO: construct response to discord
};
