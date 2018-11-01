const Responder = require('../responder')
const Firestore = require('../firestore_handler')
const ActionHandler = require('../action_handler')
const SendConvo = require('../conversations/send')
const SignupConvo = require('../conversations/signup')
const ExportConvo = require('../conversations/export')
const ReceiveConvo = require('../conversations/receive')
const Enable2FAConvo = require('../conversations/enable2FA')
const ChangeEmailConvo = require('../conversations/changeEmail')
const ChangePasswordConvo = require('../conversations/changePassword')

let success = false
module.exports = async (req, res) => {
    const service = res.locals.service
    const serviceID = res.locals.serviceID
    const serviceOptions = res.locals.serviceOptions
    const responder = new Responder(serviceOptions)
    const firebase = new Firestore(service, serviceOptions)

    let actionHandler = new ActionHandler(service, serviceOptions)
    const user = await actionHandler.getUserFromServiceID(serviceID)
    res.locals.user = user

    let message = res.locals.password ? res.locals.password : res.locals.message.toString()
    let parsedMessage = parseParams(message)
    let partial = await firebase.fetchCommandPartial(serviceID)

    if (message === '?') {
        parsedMessage = { command: '/help' }
        res.locals.command = '/help'
    } else {
        if (
            !isNaN(message) && Number(message) < 10 && !serviceOptions.keyboardSupport &&
            (!partial.exists || (partial.exists && partial.data().allowMenu))
        ) {
            let menu = await firebase.getLastMenu(serviceID)
            if (!menu) {
                res.locals.command = '/uncaught'
                parsedMessage = ''
            } else {
                res.locals.lastMenu = menu
                let index = Number(message)
                let command = menu[index].callback_data
                if (partial.exists) {
                    let data = partial.data()
                    res.locals.command = data.command
                    res.locals.step = Object.keys(data).length - 1
                } else {
                    res.locals.command = command
                }

                res.locals.message = message.replace(
                    index,
                    command + (message.length > 1 ? ' ' : '')
                )
                message = res.locals.message
                parsedMessage = parseParams(res.locals.message)
            }
        } else if (!parsedMessage && message.charAt(0) !== '/') {
            if (partial.exists) {
                let data = partial.data()
                res.locals.command = data.command
                res.locals.step = Object.keys(data).length - 1
            } else {
                parsedMessage = parseParams('/' + message)
                if (commands.includes(parsedMessage.command)) {
                    res.locals.command = parsedMessage.command
                } else {
                    parsedMessage = ''
                }
            }
        } else if (parsedMessage) {
            res.locals.command = parsedMessage.command
        }
    }

    if (!parsedMessage) return { success: false, continue: true }

    if (user) {
        if (
            (await actionHandler.isUserWithout2FA(user.id)) &&
            parsedMessage.command !== '/new'
        ) {
            parsedMessage.command = '/enable2fa'
            res.locals.command = '/enable2fa'
        }
    } else {
        if (
            parsedMessage.command !== '/start' &&
            parsedMessage.command !== '/signup' &&
            parsedMessage.command !== '/new' &&
            parsedMessage.command !== '/linkaccount'
        ) {
            parsedMessage.command = '/start'
            res.locals.command = '/start'
        }
    }

    let extraData = {}
    let content

    // start
    if (parsedMessage.command === '/start') {
        if (user) {
            success = true
            content = responder.response('success', 'start', 'welcomeBack')
        } else {
            success = true
            content = responder.response('success', 'start', 'welcome')
        }
    }
    // signup
    else if (parsedMessage.command === '/signup') {
        await firebase
            .createNewCommandPartial(serviceID, parsedMessage.command)
            .then(() => {
                let data = new SignupConvo(
                    null,
                    service,
                    serviceOptions
                ).initialMessage()
                success = data.success
                content = data.message
            })
            .catch(failure => {
                success = false
                content = failure.message || failure
            })
    }
    // help
    else if (parsedMessage.command === '/help') {
        success = true
        content = responder.response('request', 'help')
        await firebase.clearCommandPartial(res.locals.serviceID)
    }
    // receive
    else if (parsedMessage.command === '/receive') {
        await firebase
            .createNewCommandPartial(serviceID, parsedMessage.command)
            .then(() => {
                let data = new ReceiveConvo(
                    null,
                    user,
                    service,
                    serviceOptions
                ).initialMessage()
                success = data.success
                content = data.message
            })
            .catch(failure => {
                success = false
                content = failure.message || failure
            })
    }
    // send
    else if (parsedMessage.command === '/send') {
        await firebase
            .createNewCommandPartial(serviceID, parsedMessage.command)
            .then(async () => {
                let data = await new SendConvo(
                    null,
                    user,
                    service,
                    serviceOptions
                ).initialMessage(user.id)
                success = data.success
                content = data.message
            })
            .catch(failure => {
                success = false
                content = failure.message || failure
            })
    }
    // balance
    else if (parsedMessage.command === '/balance') {
        await actionHandler
            .balance(user.id)
            .then(async balance => {
                //TODO: extract this to an actionHandler method
                try {
                    let rate = await require('../../utils/getPrice')()
                    if (rate) {
                        let balanceUSD = (Number(balance) * rate).toFixed(2)
                        success = true
                        content = responder.response(
                            'success',
                            'balance',
                            'withoutUnconfirmedUSD',
                            { balance, balanceUSD }
                        )
                    } else {
                        success = true
                        content = responder.response(
                            'success',
                            'balance',
                            'withoutUnconfirmed',
                            { balance }
                        )
                    }
                } catch (err) {
                    console.log(err) //ignore error fetching the price, we just won't use it
                }
            })
            .catch(async failure => {
                success = false
                content = failure
            })
    }
    // changePassword
    else if (parsedMessage.command === '/changepassword') {
        await firebase
            .createNewCommandPartial(serviceID, parsedMessage.command)
            .then(async () => {
                let data = await new ChangePasswordConvo(
                    null,
                    user,
                    service,
                    serviceOptions
                ).initialMessage(user.id)
                success = data.success
                content = data.message
            })
            .catch(failure => {
                success = false
                content = failure.message || failure
            })
    }
    // changeEmail
    else if (parsedMessage.command === '/changeemail') {
        await firebase
            .createNewCommandPartial(serviceID, parsedMessage.command)
            .then(() => {
                let data = new ChangeEmailConvo(
                    null,
                    user,
                    service,
                    serviceOptions
                ).initialMessage()
                success = data.success
                content = data.message
            })
            .catch(failure => {
                success = false
                content = failure.message || failure
            })
    }
    // export
    else if (parsedMessage.command === '/export') {
        await firebase
            .createNewCommandPartial(serviceID, parsedMessage.command)
            .then(() => {
                let data = new ExportConvo(
                    null,
                    user,
                    service,
                    serviceOptions
                ).initialMessage()
                success = data.success
                content = data.message
            })
            .catch(failure => {
                success = false
                content = failure.message || failure
            })
    }
    // clear
    else if (parsedMessage.command === '/clear') {
        await actionHandler
            .clearCoversationCommand(serviceID)
            .then(async () => {
                success = true
                content = responder.response('success', 'clear')
            })
            .catch(async failure => {
                success = false
                content = failure
            })
    } else if (parsedMessage.command === '/cancel') {
        await actionHandler
            .clearCoversationCommand(serviceID)
            .then(async () => {
                success = true
                content = responder.response('success', 'cancel')
            })
            .catch(async failure => {
                success = false
                content = failure
            })
    }
    // transactions
    else if (parsedMessage.command === '/transactions') {
        let limit = serviceOptions.transactionLimit
            ? serviceOptions.transactionLimit
            : 3
        let more = parsedMessage.params[0] === 'more'
        await actionHandler
            .getTransactions(user.id, limit, more)
            .then(async data => {
                let { transactions } = data
                let moreThanOne = transactions.length > 1 ? transactions.length : ''
                success = true
                content = responder.response('success', 'transactions', null, {
                    moreThanOne
                })
                extraData = data //return extraData so service parsers can respond with transaction data
            })
            .catch(async failure => {
                success = false
                content = failure
            })
    }
    // enable2fa (only invoked by 2fa requirement check)
    else if (parsedMessage.command === '/enable2fa') {
        await firebase
            .createNewCommandPartial(serviceID, parsedMessage.command)
            .then(() => {
                let data = new Enable2FAConvo(
                    null,
                    user,
                    service,
                    serviceOptions
                ).initialMessage()
                success = data.success
                content = data.message
            })
            .catch(failure => {
                success = false
                content = failure.message || failure
            })
    }
    // request new two factor authentication code to be sent
    else if (parsedMessage.command === '/new') {
        let step = parsedMessage.params[0] ? parsedMessage.params[0] : null
        if (step) {
            let stepValue = partial.data()[step]
            await firebase.unsetCommandPartial(partial.id, step)

            res.locals.message = stepValue
            res.locals.step = Object.keys(partial.data()).length - 1
            res.locals.command = partial.data().command
        }

        //TODO: determine if this is needed. request a new 2fa would fall under convos only?
        /*else {
                        let command = partial.data().command

                        if (inputType === 'message') res.locals.webhookData.message.text = command
                        else res.locals.webhookData.callback_query.data = command

                        return parseCommand(res.locals.webhookData)
                    }*/

        return { success: false, continue: true }
    } else if (parsedMessage.command === '/more') {
        success = true
        content = responder.response('success', 'more')
    } else if (parsedMessage.command === '/main') {
        success = true
        content = responder.response('success', 'main')
    }
    // Go process conversation
    else {
        return { success: false, continue: true }
    }

    res.submit(success, content, extraData)
    return { success: true, continue: false }
}

// return an object { command: (String), params: (Array) }
function parseParams(str) {
    if (typeof str !== 'string') return
    let params = str.split(/\s+/)
    params = params.filter(param => param.length > 0)
    if (params.length === 0) return
    let command = params.shift().toLowerCase()
    if (!/^\/\S+/.test(command)) return
    return { command, params }
}

const commands = [
    '/signup',
    '/balance',
    '/receive',
    '/send',
    '/changepassword',
    '/changeemail',
    '/export',
    '/transactions',
    '/help',
    '/clear',
    '/cancel'
]
