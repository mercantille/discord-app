import fetch from "node-fetch";

export const reportPayment = async (fromUser, toUser, amount, reason) => {
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
    organization_id: 1,
    source_id: 1,
    user_id: fromUser,
    action_id: 2,
    context: "sent " + amount + " ETH to " + toUser + reason,
  };

  console.log("Sending payload:");
  console.log(payload);
  await storeActionInTheFeed(payload);
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

  const resp = await fetch(endpoint, {
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent":
        "DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
    },
    method: "POST",
    body: JSON.stringify(action),
  });
  if (!resp.ok) {
    console.error("Received error from server: %d", resp.status);
  }
};
