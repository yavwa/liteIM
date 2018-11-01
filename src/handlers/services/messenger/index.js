const request = require('request')

const serviceOptions = {
    keyboardSupport: true,
    htmlSupport: false,
    characterLimit: true,
    transactionLimit: 1
}

const sendMessage = (to, body, buttons = [], extraData = {}) => {
    let messageData = { text: body }
    if (buttons && Array.isArray(buttons) && buttons.length > 3) messageData.quick_replies = buttons
    else {
        messageData = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "button",
                    "text": body,
                    "buttons": buttons
                }
            }
        }
    }

    if (Object.keys(extraData).length > 0 &&
        extraData._type &&
        extraData._type === 'image') {

        messageData = {
            "attachment":{
                "type":"template",
                "payload":{
                    "template_type":"generic",
                    "elements":[
                        {
                            "title":"Receive Address",
                            "image_url": extraData.url,
                            "subtitle": extraData.caption,
                            "default_action": {
                                "type": "web_url",
                                "url": extraData.url,
                                "webview_height_ratio": "full",
                            },
                            "buttons": [{
                                "type":"postback",
                                "title":"Back",
                                "payload":"/main"
                            }]
                        }
                    ]
                }
            }
        }
    }

    return request(
        {
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {
                access_token:
                    process.env.FACEBOOK_MESSENGER_TOKEN
            },
            method: 'POST',
            json: {
                recipient: { id: to },
                message: messageData
            }
        },
        (error, response, body) => {
            if (error) {
                console.log('Sending error:', error)
            }
        }
    )
}

const generateTextSuggestions = (success, isUser, extraData, res) => {
    let keyboards = require('../../keyboards')
    let keyboard = keyboards.getKeyboard(
        success,
        res.locals.command,
        res.locals.step,
        isUser,
        extraData,
        true,
        res
    )

    let buttons = []
    if (keyboard.length > 3){
        keyboard.forEach(button => {
            buttons.push({
                content_type: 'text',
                title: button.text,
                payload: button.callback_data
            })
        })
    } else {
        keyboard.forEach(button => {
            if (button.type === 'securePassword') {
                buttons.push({
                    type: 'web_url',
                    url: button.url,
                    title: button.text,
                    webview_height_ratio: 'full'
                })
            }
            else if (button.url) {
                buttons.push({
                    type: 'web_url',
                    url: button.url,
                    title: button.text,
                    webview_height_ratio: 'full'
                })
            }
            else {
                buttons.push({
                    type: 'postback',
                    title: button.text,
                    payload: button.callback_data
                })
            }
        })
    }

    return buttons
}

const middleware = async (req, res) => {
    res.submit = async (success, content, extraData = {}, notifier = {}) => {
        let isUser = false
        if (res.locals.user) isUser = true

        // let menu = await require('../../menu_handler')(success, isUser, res)
        let menu = generateTextSuggestions(success, isUser, extraData, res)

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

        // if (menu && menu.length > 0) content += menu
        await sendMessage(res.locals.serviceID, content, menu, extraData)

        return true
    }

    if (!res.locals.message) {
        try {
            let messaging_events = req.body.entry[0].messaging
            let event = messaging_events[0]

            if (!event) return { success: false, error: 'no message available' }
            if (!event.postback && (!event.message || !event.message.text))
                return { success: false, error: 'Invalid message' }

            let sender = event.sender.id

            // "inject" the userId & body into the locals.
            res.locals.serviceOptions = serviceOptions
            res.locals.serviceID = sender // User's facebook id

            if (event.postback) {
                res.locals.message = event.postback.payload
            }
            else if (event.message.quick_reply) {
                res.locals.message = event.message.quick_reply.payload
            }
            else {
                res.locals.message = event.message.text
            }

            return { success: true }
        } catch (e) {
            console.error('Error in messenger parsers:', e)
            return { success: false, error: e.message || e.toString() }
        }
    } else {
        return { success: true }
    }
}

const notifier = async (user, sender, txid, amount, url) => {
    let serviceID = user.services.messenger
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
