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
    
    console.log('Sending payload:')
    console.log(payload)
    await storeActionInTheFeed(payload)
}

const storeActionInTheFeed = async (action) => {
    const endpoint = 'https://api.mercantille.xyz/api/v1/feed'
    
    const resp = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
        },
        method: 'POST',
        body: JSON.stringify(action)
      })
    if (!resp.ok) {
        console.error('Received error from server: %d', resp.status)
    }
}