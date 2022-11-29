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

async function messages() {
  const response = await fetch(
    "https://discord.com/api/v10/channels/971768024325570570/messages?limit=3",
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
  // console.log(await data);
  return await data;
}
// console.log(messages());
const intervalMs = 10 * 1000; // every 1 minute
const timeoutObj = setInterval(() => {
  // @mikethepurple - here you can trigger any logic for occasional polling for new messages, reactions, whatever
  const msg = messages();
  // console.log(msg);
}, intervalMs);

app.once("close", () => {
  console.log("Closing!");
  clearInterval(timeoutObj);
});
