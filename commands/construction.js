import fetch from "node-fetch";
import { getOrgId } from "../bounties.js";

export const constructCustomCommand = (
  commandName,
  description,
  // hasUniqueEvents,
  subjects,
  rewardOption,
  rewardType
) => {
  const options = [];
  // if (hasUniqueEvents) {
  //   options.push({
  //     type: 3, // string
  //     name: "uniquename",
  //     description: "Unique name for event",
  //     required: true,
  //   });
  // }

  if (
    rewardOption &&
    rewardOption === "dynamic" &&
    subjects !== "no_subjects"
  ) {
    options.push(
      {
        type: 3, // string
        name: "currency",
        description: "Reward currency",
        required: true,
        choices: [
          // TODO: this should be a dynamic list of currencies
          {
            name: "ᐩ",
            value: "rep",
          },
          // {
          //   name: "ETH",
          //   value: "eth",
          // },
          // {
          //   name: "BTC",
          //   value: "btc",
          // },
        ],
      },
      {
        type: 10, // number
        name: "amount",
        description: "Amount to be rewarded",
        required: true,
      }
    );
  }

  if (rewardType === "dynamic")
    options.push({
      type: 3, // string
      name: "for",
      description: "Reason for payment",
      required: true,
    });
  else
    options.push({
      type: 3, // string
      name: "context",
      description: "Context or the action or reason for rewarding",
      required: true,
    });

  if (subjects && subjects !== undefined) {
    if (subjects !== "no_subjects") {
      options.push({
        type: 6, // USER
        name: "target",
        description: "Target user",
        required: true,
      });
    }
    if (subjects === "multiple") {
      for (let i = 2; i < 7; i++) {
        options.push({
          type: 9, // MENTIONABLE
          name: `target${i}`,
          description: `Target member ${i}`,
          required: false,
        });
      }
    }
  }

  return {
    name: commandName,
    description: description,
    type: 1, // slash command
    options: options,
  };
};

export const storeCommand = async (
  guildId,
  commandName,
  description,
  // hasUniqueEvents,
  subjects,
  rewardOption,
  rewardType
) => {
  const sources = await getOrgId(guildId);
  console.log("Found sources for guild:");
  console.log(sources);

  if (!sources || !sources.sources || sources.sources.length === 0) {
    console.error(`Sources not found for guildId ${guildId}`);
    return;
  }
  const sourceId = sources.sources[0].id; // for now, it's only discord

  const payload = {
    source_id: sourceId,
    type: "Command",
    name: commandName,
    description: description,
    is_transfer: rewardType === "transactable",
    // specifics_required: hasUniqueEvents,
    users_targeted: subjects === "multiple" ? 2 : subjects === "single" ? 1 : 0, // weirdly, backend accepts int type for this
    custom_rewards: rewardOption === "dynamic",
  };

  console.log("Payload constructed");
  console.log(payload);

  const endpoint = "https://api.mercantille.xyz/api/v1/action/create";
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

  const data = await response.json();
  return data;
};

export const createReward = async (actionID, currencyID, rewardValue) => {
  const payload = {
    action_id: actionID,
    currency_id: currencyID,
    reward_value: rewardValue,
  };
  console.log(payload);
  const endpoint = "https://api.mercantille.xyz/api/v1/action-reward/create";
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

  const data = await response.json();
  return data;
};
