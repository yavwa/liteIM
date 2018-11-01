const Firestore = require('../../firestore_handler')
const TelegramMessenger = require('./telegramMessenger')

const serviceOptions = {
    keyboardSupport: true,
    htmlSupport: true,
    characterLimit: false
}

const firebase = new Firestore('telegram', serviceOptions)

const middleware = async (req, res) => {
    res.submit = async (success, content, extraData = {}, notifier = {}) => {
        let isUser = false
        if (res.locals.user) isUser = true

        if (
            Object.keys(extraData).length > 0 &&
            extraData._type &&
            extraData._type === 'image'
        ) {
            content = {
                type: 'photo',
                url: extraData.url,
                caption: extraData.caption
            }
            extraData = {}
        }

        let keyboards = require('../../keyboards')
        let keyboard = keyboards.getKeyboard(
            success,
            res.locals.command,
            res.locals.step,
            isUser,
            extraData,
            false,
            res
        )

        if (Object.keys(notifier).length > 0) {
            let { address, sender, txid, amount } = notifier
            const notifierHandler = require('../../notifier')
            await notifierHandler({ address, sender, txid, amount })
        }

        await sendMessage(
            res.locals.serviceID,
            content,
            keyboard,
            res.locals.callbackMessageID
        )

        return true
    }

    if (!res.locals.message) {
        const webhookData = req.body

        if (!isValidRequest(webhookData))
            return { success: false, error: 'Invalid webhook data.' }

        let userID, callbackMessageID, messageContent
        if (webhookData.message) {
            userID = webhookData.message.from.id
            messageContent = webhookData.message.text
        } else {
            userID = webhookData.callback_query.from.id
            callbackMessageID = webhookData.callback_query.message.message_id
            messageContent = webhookData.callback_query.data
        }

        res.locals.serviceOptions = serviceOptions
        res.locals.webhookData = webhookData
        res.locals.serviceID = userID
        res.locals.message = messageContent.trim()
        res.locals.callbackMessageID = callbackMessageID //messageToEdit
        res.locals.step = 0

        let parsedMessage = parseParams(res.locals.message)

        if (parsedMessage) {
            res.locals.command = res.locals.message
        } else {
            await firebase
                .fetchCommandPartial(res.locals.serviceID)
                .then(async convoPartial => {
                    res.locals.command = convoPartial.data().command
                    res.locals.step = Object.keys(convoPartial.data()).length
                })
                .catch(() => {})
        }

        if (!res.locals.command) res.locals.command = 'uncaught'
    }

    return { success: true }
}

function isValidRequest(req) {
    // TODO: change to use typeof
    return (
        req &&
        ((req.callback_query && req.callback_query.data) ||
            (req.message &&
                req.message.chat &&
                req.message.chat.id &&
                req.message.from &&
                req.message.from.id &&
                req.message.text))
    )
}

function parseParams(str) {
    if (typeof str !== 'string') return
    let params = str.split(/\s+/)
    params = params.filter(param => param.length > 0)
    if (params.length === 0) return
    let command = params.shift()
    if (!/^\/\S+/.test(command)) return
    return { command, params }
}

const sendMessage = async (userID, content, keyboard = [], callbackMessageID = null) => {
    let messenger = new TelegramMessenger(userID, callbackMessageID)

    if (content && typeof content === 'object') {
        if (content.type === 'photo') {
            let messageIdToDelete = await firebase.getBotMessageID(userID)
            if (messageIdToDelete.messageID)
                await messenger.deleteMessage(messageIdToDelete.messageID)

            await messenger.sendPhoto(
                content.url,
                content.caption,
                messenger.inlineKeyboard(keyboard)
            )
        }
    } else {
        if (callbackMessageID) {
            try {
                await messenger.editMessage(
                    content,
                    messenger.inlineKeyboard(keyboard)
                )
            } catch (err) {
                console.log(`Failed to edit message with error: ${err}`)
                let messageIdToDelete = await firebase.getBotMessageID(userID)
                if (messageIdToDelete.messageID)
                    await messenger.deleteMessage(messageIdToDelete.messageID)
                await messenger.sendMessage(
                    content,
                    messenger.inlineKeyboard(keyboard)
                )
            }
        } else {
            try {
                let messageIdToDelete = await firebase.getBotMessageID(userID)
                if (messageIdToDelete.messageID)
                    await messenger.deleteMessage(messageIdToDelete.messageID)
            } catch (err) {
                console.log(`Could not delete prior message. Error: ${err}`)
            }
            await messenger.sendMessage(content, messenger.inlineKeyboard(keyboard))
        }
    }
}

const notifier = async (user, sender, txid, amount, url) => {
    let serviceID = user.services.telegram
    if (serviceID) {
        const Responder = require('../../responder')
        let responder = new Responder(serviceOptions)
        let message = responder.response('success', 'send', 'recipient', {
            amount,
            username: sender
        })

        let keyboards = require('../../keyboards')
        let keyboard = keyboards.getKeyboard(true, '/send', '5', true, { txid, url }, '')
        await sendMessage(serviceID, message, keyboard)
    }
}

module.exports = { serviceOptions, middleware, sendMessage, notifier }
