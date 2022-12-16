import "dotenv/config";
import fetch from "node-fetch";
import express from "express";
import { InteractionType, InteractionResponseType } from "discord-interactions";
import { VerifyDiscordRequest } from "./utils.js";
import {
  CHALLENGE_COMMAND,
  TEST_COMMAND,
  HasGuildCommands,
  PAY_COMMAND,
  GIVEREP_COMMAND,
  UpdateGuildCommand,
  CREATE_COMMAND,
} from "./commands/commands-def.js";
import { handleApplicationCommand } from "./interactions.js";
import { getIdentityByID, storeActionInTheFeed } from "./bounties.js";

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post("/interactions", async function (req, res) {
  // Interaction type and data
  console.log(req.body);
  const { type, id, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    try {
      const responsePayload = await handleApplicationCommand(name, req.body);
      if (responsePayload) {
        return res.send(responsePayload);
      }
    } catch (error) {
      console.error(error);
      return res.status(500).send();
    }

    return res.status(400).send();
  }
});

app.listen(PORT, () => {
  console.log("Listening on port", PORT);

  // Check if guild commands from commands.json are installed (if not, install them)
  HasGuildCommands(process.env.APP_ID, undefined, [
    TEST_COMMAND,
    PAY_COMMAND,
    CHALLENGE_COMMAND,
    GIVEREP_COMMAND,
    CREATE_COMMAND,
  ]);
  UpdateGuildCommand(process.env.APP_ID, undefined, PAY_COMMAND);
  UpdateGuildCommand(process.env.APP_ID, undefined, CREATE_COMMAND);
});

async function getDiscordServers() {
  const endpoint = "https://api.mercantille.xyz/api/v1/source/query";
  const payload = {
    names: ["Discord"],
  };
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
    console.error("Received error from server: %d", response.status);
    console.log(response);
  }
  const data = await response.json();
  return data.sources;
}

async function getChannelsPerServer(server) {
  const endpoint = `https://discord.com/api/v10/guilds/${server}/channels`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    console.error("Received error from server: %d", response.status);
    console.log(response);
  }
  const data = await response.json();
  return data;
}
async function getMessagesPerChannel(channel, lastMessage) {
  let response = null;
  if (lastMessage && lastMessage !== undefined) {
    console.log(lastMessage);
    console.log("showing since last");
    response = await fetch(
      `https://discord.com/api/v10/channels/${channel}/messages?after=${lastMessage}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
          Accept: "application/json",
        },
      }
    );
  } else console.log("bypassing the variable");
  response = await fetch(
    `https://discord.com/api/v10/channels/${channel}/messages`,
    {
      method: "GET",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        Accept: "application/json",
      },
    }
  );

  // new URLSearchParams({ limit: 10 })

  const data = await response.json();
  // console.log(await data);
  return await data;
}

async function getLastStoredMessage(source, channel) {
  const endpoint = `https://api.mercantille.xyz/api/v1/last-handled/get-last-message-id`;
  const payload = {
    source_id: source,
    source_sublocation: {
      discord_channel_id: channel,
    },
  };
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
    console.error("Received error from server: %d", response.status);
    console.log(response);
  }
  const data = await response.json();
  return data.last_message_id;
}
async function setLastStoredMessage(sourceID, channelID, messageID) {
  const endpoint = `https://api.mercantille.xyz/api/v1/last-handled/upsert`;
  const payload = {
    source_id: sourceID,
    source_sublocation: {
      discord_channel_id: channelID.toString(),
    },
    last_message_id: messageID.toString(),
  };
  console.log(JSON.stringify(payload));
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
    console.error("Received error from server: %d", response.status);
    console.log(response);
  }
  const data = await response.json();
  return data.last_message_id;
}

export const reportMessage = async (
  orgID,
  actionID,
  sourceID,
  fromIdentity,
  message
) => {
  const payload = {
    event_histories: [
      {
        organization_id: orgID,
        source_id: sourceID,
        action_id: actionID,
        identity_id: fromIdentity,
        context: message,
      },
    ],
  };
  await storeActionInTheFeed(payload);
};

async function getGuilds() {
  const response = await fetch(
    "https://discord.com/api/v10//users/@me/guilds",
    {
      method: "GET",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        limit: 3,
        Accept: "application/json",
      },
    }
    // new URLSearchParams({ limit: 10 })
  );
  const data = await response.json();
  // console.log(data);
  return data;
}

// async function handleMessageHistory() {
//   const guilds =
// }

// console.log(messages());
const intervalMs = 10 * 1000; // every 1 minute
let isRunning = false;
const timeoutObj = setInterval(async () => {
  // @mikethepurple - here you can trigger any logic for occasional polling for new messages, reactions, whatever
  // const glds = await getGuilds();

  if (isRunning) {
    return;
  }

  const sources = await getDiscordServers();
  // console.log("lastmessage in channel")

  // const lastmessage = await getLastStoredMessage(1, "918873143911809074")
  // console.log(lastmessage);
  // // console.log(await getChannelsPerServer(sources[0].external_key.toString()));
  // console.log("all the rest")
  // 1022195500088315994
  // const alltherest = await getMessagesPerChannel("1016756052148109453", "1041977739864981534");
  // // // const setmessage = await setLastStoredMessage(1, "918873143911809074", alltherest[0].id)
  // // console.log(alltherest.length)
  // console.log("booom")
  let lastmessage = await getLastStoredMessage(1, "1016756052148109453");

  console.log(lastmessage);
  const fundMessages = await getMessagesPerChannel(
    "1016756052148109453",
    "1053371675212783678"
  );
  console.log(fundMessages);
  // let reversedMessages = fundMessages.reverse();
  // console.log(reversedMessages);
  // for (const message of reversedMessages) {
  //   console.log(message.id);
  //   await setLastStoredMessage(1, "1016756052148109453", message.id);
  //   const senderIdentityId = await getIdentityByID(
  //     1,
  //     message.author.id,
  //     message.author.username
  //   );
  //   reportMessage(1, 3, 1, senderIdentityId, message.content);
  // }
  // console.log(alltherest);
  // isRunning = true;
  // for (const source of sources) {
  //   isRunning = true;
  //   const serverChannels = await getChannelsPerServer(
  //     source.external_key.toString()
  //   );
  //   for (const channel of serverChannels) {
  //     // console.log(channel.id);
  //     if (channel.last_message_id) {
  //       const lastStoredMessage = await getLastStoredMessage(
  //         source.id,
  //         channel.id.toString()
  //       );
  //       const messages = await getMessagesPerChannel(
  //         channel.id.toString(),
  //         lastStoredMessage.toString()
  //       );
  //       if (
  //         messages != [] &&
  //         messages != undefined &&
  //         messages &&
  //         messages.length > 1 &&
  //         messages.code != 0
  //       ) {
  //         for (const message of messages) {
  //           const senderIdentityId = await getIdentityByID(
  //             1,
  //             message.author.id,
  //             message.author.username
  //           );
  //           reportMessage(
  //             source.organization_id,
  //             3,
  //             source.id,
  //             senderIdentityId,
  //             message.content
  //           );
  //           console.log(message.id);
  //           await setLastStoredMessage(
  //             source.id,
  //             channel.id.toString(),
  //             message.id
  //           );
  //         }
  //       }
  //     }
  //   }
  // }

  // console.log(messages);
  // const channel = 730806402351628301n;
  // console.log(
  //   `https://discord.com/api/v10/channels/730806402351628301/messages?limit=3`
  // );
  // console.log(
  //   `https://discord.com/api/v10/channels/${channel}/messages?limit=3`
  // );
  isRunning = true;
}, intervalMs);

app.once("close", () => {
  console.log("Closing!");
  clearInterval(timeoutObj);
});
