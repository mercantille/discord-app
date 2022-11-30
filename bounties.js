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

export const getOrgId = async (guildID) => {
  const payload = {
    external_keys: [guildID],
  };
  const endpoint = "https://api.mercantille.xyz/api/v1/source/query";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent":
        "DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
      Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdfaWQiOiIxIiwidXNlcl9pZCI6MX0.2yoQYPPNTNHpS_b-cWHA0oK-GACkc7ovsGJZlVWfKcA`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error("Received error from server: %d", resp.status);
  }
  return data;
};

export const reportRepTransfer = async (fromUser, toUser, amount, reason) => {
  const payload = {
    action: "/giverep",
    fromUser: {
      id: fromUser.id,
      name: fromUser.username,
    },
    toUser: {
      id: toUser.id,
      name: toUser.username,
    },
    amount: {
      coin: "ᐩ",
      value: amount,
    },
    context: reason ?? "",
  };
  await storeActionInTheFeed(payload);
};

const storeActionInTheFeed = async (action) => {
  const endpoint = "https://api.mercantille.xyz/api/v1/event-history/create";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent":
        "DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
      Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdfaWQiOiIxIiwidXNlcl9pZCI6MX0.2yoQYPPNTNHpS_b-cWHA0oK-GACkc7ovsGJZlVWfKcA`,
    },
    body: JSON.stringify(action),
  });
  if (!response.ok) {
    console.error("Received error from server: %d", response.status);
    console.log(response);
  }
  // else console.log(resp);
};
