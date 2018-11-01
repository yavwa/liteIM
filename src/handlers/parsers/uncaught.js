const Responder = require('../responder')
module.exports = (req, res) => {
    const responder = new Responder(res.locals.serviceOptions)
    let success, content
    if (!res.locals.user) {
        success = true
        content = responder.response('success', 'start', 'welcome')
        res.locals.command = '/start'
    } else {
        success = false
        content = responder.response('failure', 'unknownInput')
    }

    res.submit(success, content)
    return { success: true, continue: false }
}
