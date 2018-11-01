let request = require('request-promise-native')

module.exports = async () => {
    let quote = await request({
        uri: 'https://www.bitstamp.net/api/v2/ticker/ltcusd',
        json: true
    })
        .then(data => {
            let price = parseFloat(data.last)
            if (!price) return false
            return price
        })
        .catch(e => {
            throw `I had an issue trying to fetch the USD rate. Please try again later.`
        })
    if (!quote)
        throw `I had an issue trying to fetch the USD rate. Please try again later.`
    return quote
}
