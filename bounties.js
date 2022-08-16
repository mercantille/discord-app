import fetch from 'node-fetch';

export const reportPayment = async (fromUser, toUser, amount) => {
    const payload = {
        action: '/pay',
        fromUser: {
          id: fromUser.id,
          name: fromUser.username
        },
        toUser: {
          id: toUser.id,
          name: toUser.username
        },
        amount: {
          coin: 'ETH',
          value: amount
        },
        context: 'for being a good person!'
      }
    
    await storeActionInTheFeed(payload)
}

const storeActionInTheFeed = async (action) => {
    const endpoint = 'https://api.mercantille.xyz/api/v1/feed'
    
    await fetch(endpoint, {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
        },
        method: 'POST',
        body: action
      })
}