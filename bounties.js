import fetch from "node-fetch";

export const reportPayment = async (
  fromUser,
  toUser,
  amount,
  reason,
  guildID
) => {
  const sources = await getOrgId(guildID);
  const orgID = sources.sources[0].organization_id;
  console.log("orgID");
  console.log("orgID");
  console.log("orgID");
  console.log("orgID");
  console.log("orgID");
  console.log(orgID);

  const payload = {
    // action: "/pay",
    // fromUser: {
    //   id: fromUser.id,
    //   name: fromUser.username,
    // },
    // toUser: {
    //   id: toUser.id,
    //   name: toUser.username,
    // },
    // amount: {
    //   coin: "ETH",
    //   value: amount,
    // },
    organization_id: orgID,
    source_id: 1,
    user_id: 1,
    action_id: 2,
    context: String("→ " + toUser.username + " for " + reason),
  };

  console.log("Sending payload:");
  console.log(payload);
  await storeActionInTheFeed(payload);
};

export async function getWalletsByID(orgID, identityID) {
  const payload = {
    organization_ids: [orgID],
    identity_ids: [identityID],
  };
  const endpoint = "https://api.mercantille.xyz/api/v1/wallets/query";
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
  const data = await response.json();
  if (!response.ok) {
    console.error("Received error from server: %d", resp.status);
  } else return data.wallets;
}

export const getOrgId = async (guildID) => {
  // console.log(guildID);
  const payload = {
    external_keys: [guildID.toString()],
  };
  const endpoint = "https://api.mercantille.xyz/api/v1/source/query";
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
  const data = await response.json();
  if (!response.ok) {
    console.error("Received error from server: %d", resp.status);
  }
  return data;
};

export const getIdentityByID = async (sourceID, userID, username) => {
  // console.log(username)
  const payload = {
    source_id: sourceID,
    external_id: userID,
    external_name: username.toString(),
  };
  // console.log(payload);
  // const stringified = JSON.stringify(payload);
  // console.log(stringified);
  const endpoint =
    "https://api.mercantille.xyz/api/v1/user-identity/upsert";
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
  const data = await response.json();
  // console.log(response.status);
  if (!response.ok) {
    console.error("Received error from server: %d", response.status);
  }
  // console.log(data.identities)
  return data.id;
};

export const topUp = async (orgID, toUserID, amount, currencyID) => {
  const payload = {
    identity_info: {
      origin_id: 1,
      external_id: toUserID,
    },
    organization_id: orgID,
    currency_id: currencyID,
    amount: amount,
  };
  const endpoint = "https://api.mercantille.xyz/api/v1/wallets/top-up";
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
  const data = await response.json();
  if (!response.ok) {
    console.error("Received error from server: %d", response.status);
  }
  return data;
};

export const reportRepTransfer = async (
  orgID,
  actionID,
  sourceID,
  fromIdentity,
  toUserName,
  amount,
  reason
) => {
  const payload = {
    event_histories: [
      {
        organization_id: orgID,
        source_id: sourceID,
        action_id: actionID,
        identity_id: fromIdentity,
        context: String("→ " + toUserName + " for " + reason),
        custom_reward_value: amount,
        custom_reward_currency_id: 1,
      },
    ],
  };
  await storeActionInTheFeed(payload);
};

export const getActionRewards = async (actionIDs) => {
  // var bearer = "Bearer " +  LOCALSTORAGE_VALUES.accessToken;

  const payload = {
    action_ids: actionIDs,
  };
  console.log(payload);
  const endpoint = "https://api.mercantille.xyz/api/v1/action-reward/get";
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
    return "undefined";
  } else {
    const data = await response.json();
    let rewards = [];
    if (data.actions_rewards.length > 0) {
      rewards = data.actions_rewards;
      return rewards;
    } else return "undefined";
  }
};

export const reportFixedCommand = async (
  orgID,
  actionID,
  sourceID,
  fromIdentity,
  toUserName,
  toUserID,
  context
) => {
  const payload = {
    event_histories: [
      {
        organization_id: orgID,
        source_id: sourceID,
        action_id: actionID,
        identity_id: fromIdentity,
        context: String("→ " + toUserName + ", with context: " + context),
      },
    ],
  };
  console.log(payload);
  await storeActionInTheFeed(payload);
};

export const reportTriggerCommand = async (
  orgID,
  actionID,
  sourceID,
  fromIdentity,
  context
) => {
  const payload = {
    events: [
      {
        organization_id: orgID,
        source_id: sourceID,
        action_id: actionID,
        identity_id: fromIdentity,
        context: context,
      },
    ],
  };
  await storeActionWithTransactionInTheFeed(payload);
};

export const storeActionWithTransactionInTheFeed = async (action) => {
  const endpoint = "https://api.mercantille.xyz/api/v1/event-history/trigger";
  console.log(action);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent":
        "DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
      Authorization: `Bearer ${process.env.BACKEND_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(action),
  });
  if (!response.ok) {
    console.error("Received error from server: %d", response.status);
    console.log(response);
  } else console.log(response);
};

export const storeActionInTheFeed = async (action) => {
  const endpoint = "https://api.mercantille.xyz/api/v1/event-history/create";
  // console.log(action);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent":
        "DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
      Authorization: `Bearer ${process.env.BACKEND_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(action),
  });
  if (!response.ok) {
    console.error("Received error from server: %d", response.status);
    console.log(response);
  }
  // else console.log(resp);
};
