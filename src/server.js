require('dotenv').config()
const Express = require('express')
const express = Express()
const helmet = require('helmet')
const bodyParser = require('body-parser')
const cors = require('cors')

express.use(cors())
express.use(helmet())
express.use(bodyParser.json())
express.use(bodyParser.urlencoded({ extended: false }))


express.get(process.env.BASE_PATH + '/:service/webhook/', function(req, res) {
    if (req.query['hub.verify_token'] === process.env.FACEBOOK_MESSENGER_VERIFY) {
        return res.send(req.query['hub.challenge'])
    }
    res.send('wrong token')
})

express.post(process.env.BASE_PATH + '/:service/webhook', async (req, res, next) => {
    res.locals.service = req.params.service

    const handleService = require(`./handlers/services/${req.params.service}`)
        .middleware
    const handler = await handleService(req, res)

    res.status(200)
    if (handler.error) return res.send(handler.error)
    if (!handler.success) return res.send('unknown error')

    let handleCommands = await require('./handlers/parsers/commands')(req, res)
    if (!handleCommands.continue) return res.send({ success: true })

    let handleConversations = await require('./handlers/parsers/conversations')(
        req,
        res
    )
    if (!handleConversations.continue) return res.send({ success: true })

    await require('./handlers/parsers/uncaught')(req, res)
    return res.send({ success: true })

})


express.post('/liteIM/password', async (req, res, next) => {

    const ActionHandler = require('./handlers/action_handler')
    const { service, serviceID, email, isUser, password, newPassword } = req.body
    const { serviceOptions, middleware } = require(`./handlers/services/${service}`)

    res.locals.service = service
    res.locals.serviceOptions = serviceOptions
    res.locals.serviceID = serviceID
    res.locals.message = newPassword ? `${password} ${newPassword}` : password

    res.status(200)

    if (isUser === 'true') {
        try {
            await new ActionHandler(service, serviceOptions).getToken(email, password)
        } catch (err) {
            //invalid password
            return res.send({ success: false, error: 'You have entered an incorrect password. Please try again.' })
        }
    }

    let redirect
    if (service === 'messenger') {
        redirect = 'https://www.messenger.com/closeWindow/?image_url=https%3A%2F%2Fwww.lite.im%2Fstatic%2Ficons%2FIcon-1024.png&display_text=Redirecting%20you%20to%20Messenger'
    }
    else if (service === 'telegram') {
        redirect = 'https://t.me/liteIM_bot'
    }

    let response = redirect ? { success: true, redirect } : { success: true}

    const handler = await middleware(req, res)

    if (handler.error) return res.send(handler.error)
    if (!handler.success) return res.send('unknown error')

    let handleCommands = await require('./handlers/parsers/commands')(req, res)
    if (!handleCommands.continue) return res.send(response)

    let handleConversations = await require('./handlers/parsers/conversations')(
        req,
        res
    )
    if (!handleConversations.continue) return res.send(response)

    await require('./handlers/parsers/uncaught')(req, res)
    return res.send(response)

})

express.post(process.env.BASE_PATH + '/notifier', async (req, res) => {
    const notifier = require('./handlers/notifier')

    let notifierResult = false
    try {
        notifierResult = await notifier(req.body)
    } catch (e) {
        console.log(e)
    }

    res.send(notifierResult)
})

express.post(process.env.BASE_PATH + '/broadcast', async (req, res) => {
    const broadcast = require('./handlers/broadcast')

    let broadcastResult = false
    try {
        broadcastResult = await broadcast(req.body)
    } catch (e) {
        console.log(e)
    }

    res.send(broadcastResult)
})

let port = process.env.port || 3001
express.listen(port, err => {
    if (err) return console.error('ERROR:', err)
    console.log('Server is listening on port ', port)
})
