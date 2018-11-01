const Firestore = require('./firestore_handler')

module.exports = async (data) => {
    let success
    try {
        let firestore = new Firestore()
        let { address, sender, txid, amount } = data

        let user = await firestore.fetchLiteIMUserByAddress(address)
        if (user) {
            let services = user.services
            for (let service in services) {
                if (services.hasOwnProperty(service)) {
                    let subdomain =
                        process.env.STAGE === 'production' ||
                        process.env.STAGE === 'staging'
                            ? 'insight'
                            : 'testnet'

                    let url = `https://${subdomain}.litecore.io/tx/${txid}/`
                    await require(`./services/${service}`).notifier(user, sender, txid, amount, url)
                }
            }
        }
        success = true
    } catch (e) {
        console.log(e)
        success = false
    }

    return success
}
