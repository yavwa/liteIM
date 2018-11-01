const client = require('twilio')(
    process.env.TWILIO_LITEIM_ACCOUNT_SID,
    process.env.TWILIO_LITEIM_AUTH_TOKEN
)

const serviceOptions = {
    keyboardSupport: false,
    htmlSupport: false,
    characterLimit: true,
    transactionLimit: 1
}

const sendMessage = (to, body) => {
    return client.messages.create({
        body,
        to,
        messagingServiceSid: process.env.TWILIO_LITEIM_SERVICE_ID
    })
}

const middleware = async (req, res) => {
    res.submit = async (success, content, extraData = {}, notifier = {}) => {
        let isUser = false
        if (res.locals.user) isUser = true

        let menu = await require('../../menu_handler')(success, isUser, res)

        if (Object.keys(extraData).length > 0 && extraData._type !== 'image') {
            for (let key in extraData) {
                if (!extraData.hasOwnProperty(key)) continue

                if (Array.isArray(extraData[key])) {
                    extraData[key].forEach(datum => {
                        if (datum.url) {
                            content += `\n\n${datum.url}`
                        }
                    })
                } else {
                    if (extraData[key].url) {
                        content += `\n\n${extraData[key].url}`
                    }
                }
            }
        }

        if (Object.keys(notifier).length > 0) {
            let { address, sender, txid, amount } = notifier
            const notifierHandler = require('../../notifier')
            await notifierHandler({ address, sender, txid, amount })
        }

        if (menu && menu.length > 0) content += menu
        await sendMessage(res.locals.serviceID, content)
        return true
    }

    if (!res.locals.message) {
        try {
            // Get information from Twilio webhook.
            const {Body, From} = req.body

            // Lookup the number and make sure it's a US, Canadian, or Swiss number.
            let information = await client.lookups
                .phoneNumbers(From)
                .fetch({type: 'carrier'})

            const {countryCode} = information
            let toCompare = countryCode
            if (toCompare !== 'US' && toCompare !== 'CA' && toCompare !== 'CH') {
                await sendMessage(
                    From,
                    'Lite.IM for SMS is currently only available in the US, Canada, and Switzerland. You can try out Lite.IM for telegram in the meantime. https://telegram.me/LiteIM_bot'
                )
                return res.send({success: false})
            }

            // "inject" the userId & body into the locals.
            res.locals.serviceOptions = serviceOptions
            res.locals.serviceID = From // User's phone number
            res.locals.message = Body // The message.
            return {success: true}
        } catch (e) {
            console.error('Error in twilio parsers:', e)
            return {success: false, error: e.message || e.toString()}
        }
    } else {
        return { success: true }
    }
}

const notifier = async (user, sender, txid, amount, url) => {
    let serviceID = user.services.twilio
    if (serviceID) {
        const Responder = require('../../responder')
        let responder = new Responder(serviceOptions)
        let message = responder.response('success', 'send', 'recipient', {
            amount,
            username: sender
        })
        message += '\n\n' + url

        await sendMessage(serviceID, message)
    }
}

module.exports = { serviceOptions, middleware, sendMessage, notifier }
