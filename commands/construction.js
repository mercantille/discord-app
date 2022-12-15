

export const constructCustomCommand = (
  commandName,
  description,
  hasUniqueEvents,
  sublects,
  rewardOption,
  rewardType
) => {
  const options = []
  if (hasUniqueEvents) {
    options.push({
      type: 3, // string
      name: "uniquename",
      description: "Unique name for event",
      required: true,
    })
  }

  if (rewardOption && rewardOption === 'dynamic') {
    options.push({
      type: 3, // string
      name: "currency",
      description: "Reward currency",
      required: true,
      choices: [ // TODO: this should be a dynamic list of currencies
        {
          name: "rep",
          value: "ᐩ"
        },
        {
          name: "eth",
          value: "ETH"
        },
        {
          name: "btc",
          value: "BTC"
        },
      ]
    },{
      type: 10, // number
      name: "amount",
      description: "Amount to be rewarded",
      required: true,
    })
  }

  if (sublects && sublects !== undefined) {
    if (sublects !== 'no_sublects') {
      options.push({
        type: 6, // USER
        name: "target",
        description: "Target user",
        required: true,
      })
    } else if (sublects === 'multiple') {
      for (const i = 2; i < 7; i++) {
        options.push({
          type: 9, // MENTIONABLE
          name: `target${i}`,
          description: `Target member ${i}`,
          required: false,
        })  
      }
    }
  }

  return {
    name: commandName,
    description: description,
    type: 1, // slash command
    options: options,
  };
}
