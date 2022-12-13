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

async function getMessagesPerChannel(channel, lastMessage) {
  const response = await fetch(
    `https://discord.com/api/v10/channels/730806402351628301/messages?limit=3`,
    {
      method: "GET",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        after: lastMessage,
        Accept: "application/json",
      },
    }
    // new URLSearchParams({ limit: 10 })
  );
  const data = await response.json();
  // console.log(await data);
  return await data;
}

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
const timeoutObj = setInterval(async () => {
  // @mikethepurple - here you can trigger any logic for occasional polling for new messages, reactions, whatever
  // const glds = await getGuilds();
  const messages = await getMessagesPerChannel(
    730806402351628301n,
    1047445288702451723n
  );
  // console.log(messages);
  // const channel = 730806402351628301n;
  // console.log(
  //   `https://discord.com/api/v10/channels/730806402351628301/messages?limit=3`
  // );
  // console.log(
  //   `https://discord.com/api/v10/channels/${channel}/messages?limit=3`
  // );
}, intervalMs);

app.once("close", () => {
  console.log("Closing!");
  clearInterval(timeoutObj);
});
