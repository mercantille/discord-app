import { getRPSChoices } from "../game.js";
import { capitalize, DiscordRequest } from "../utils.js";

export async function HasGuildCommands(appId, guildId, commands) {
  if (guildId === "" || appId === "") return;

  commands.forEach((c) => HasGuildCommand(appId, guildId, c));
}

// Checks for a command
async function HasGuildCommand(appId, guildId, command) {
  let endpoint;
  if (guildId) {
    endpoint = `applications/${appId}/guilds/${guildId}/commands`;
  } else {
    endpoint = `applications/${appId}/commands`;
  }

  try {
    const res = await DiscordRequest(endpoint, { method: "GET" });
    const data = await res.json();

    if (data) {
      const installedNames = data.map((c) => c["name"]);
      // This is just matching on the name, so it's not good for updates
      if (!installedNames.includes(command["name"])) {
        console.log(`Installing "${command["name"]}"`);
        InstallGuildCommand(appId, guildId, command);
      } else {
        console.log(`"${command["name"]}" command already installed`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// Installs a command
export async function InstallGuildCommand(appId, guildId, command) {
  let endpoint;
  if (guildId) {
    endpoint = `applications/${appId}/guilds/${guildId}/commands`;
  } else {
    endpoint = `applications/${appId}/commands`;
  }
  // install command
  try {
    await DiscordRequest(endpoint, { method: "POST", body: command });
  } catch (err) {
    console.error(err);
  }
}

export async function UpdateGuildCommand(appId, guildId, command) {
  let endpoint;
  if (guildId) {
    endpoint = `applications/${appId}/guilds/${guildId}/commands`;
  } else {
    endpoint = `applications/${appId}/commands`;
  }

  // Retrieve existing commands

  let commandId;
  try {
    console.log(`Checking if "${command["name"]}" is installed`);

    const res = await DiscordRequest(endpoint, { method: "GET" });
    const data = await res.json();

    if (data) {
      const installedCommands = data.map((c) => {
        return {
          name: c["name"],
          id: c["id"],
        };
      });
      // This is just matching on the name, so it's not good for updates
      installedCommands.forEach((c) => {
        if (c.name === command["name"]) {
          commandId = c["id"];
        }
      });
    }
  } catch (err) {
    console.error(err);
  }

  if (!commandId) {
    console.error(`command ${command["name"]} not found on the server`);
    return;
  }

  // update with command id
  let updateEndpoint;
  if (guildId) {
    updateEndpoint = `applications/${appId}/guilds/${guildId}/commands/${commandId}`;
  } else {
    updateEndpoint = `applications/${appId}/commands/${commandId}`;
  }

  try {
    console.log(`Updating "${command["name"]}"`);
    await DiscordRequest(updateEndpoint, { method: "PATCH", body: command });
  } catch (err) {
    console.error('Failed to update command %s: %s', command["name"], err.toString());
  }
}

// Get the game choices from game.js
function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

// Simple test command

export const GIVEREP_COMMAND = {
  name: "giverep",
  description: "Send some of your reputation to another user",
  options: [
    {
      type: 9,
      name: "touser",
      description: "User receiving the ᐩ",
      required: true,
    },
    {
      type: 10,
      name: "amount",
      description: "Amount of ᐩ",
      required: true,
    },
    {
      type: 3,
      name: "for",
      description: "Reason for boosting",
      required: false,
    },
  ],
  type: 1,
};

export const CHECKREP_COMMAND = {
  name: "checkrep",
  description:
    "check how much reputation you currently have and your reputation level on this server",
  type: 1,
};

export const CREATE_COMMAND = {
  name: "command",
  description: "Create custom command",
  options: [
    {
      type: 3, // string,
      name: "name",
      description: "Command name",
      required: true,
    },
    {
      type: 3, // string
      name: "description",
      description: "Command description",
      required: true,
    },

    // {
    //   type: 5, // boolean
    //   name: "uniqueevents",
    //   description: "Does it require unique event names?",
    //   required: true,
    // },
    {
      type: 3, // string
      name: "subjects",
      description: "Defines how many users can be command subjects",
      choices: [
        {
          name: "no_subjects",
          value: "no_subjects",
        },
        {
          name: "single",
          value: "single",
        },
        {
          name: "multiple",
          value: "multiple",
        },
      ],
      required: true,
    },
    {
      type: 3, // string
      name: "rewardoption",
      description: "Reward type for this command",
      choices: [
        // {
        //   name: "not_rewarded",
        //   value: "not_rewarded",
        // },
        {
          name: "fixed",
          value: "fixed",
        },
        {
          name: "dynamic",
          value: "dynamic",
        },
      ],
      required: true,
    },
    {
      type: 3, // string
      name: "rewardtype",
      description: "Is reward transacted (default) or generated",
      choices: [
        {
          name: "transactable",
          value: "transactable",
        },
        {
          name: "generated",
          value: "generated",
        },
      ],
      required: true,
    },
  ],
};

// Command containing options
// export const CHALLENGE_COMMAND = {
//   name: "challenge",
//   description: "Challenge to a match of rock paper scissors",
//   options: [
//     {
//       type: 3,
//       name: "object",
//       description: "Pick your object",
//       required: true,
//       choices: createCommandChoices(),
//     },
//   ],
//   type: 1,
// };
