module.exports = async (success, isUser, res) => {
    let keyboards = require('./keyboards')
    let keyboard = keyboards.getKeyboard(
        success,
        res.locals.command,
        res.locals.step,
        isUser,
        {},
        true,
        res
    )

    if (res.locals.command === '/help') {
        keyboard.pop()
        let more = keyboards.getKeyboard(
            success,
            '/more',
            res.locals.step,
            isUser,
            {},
            true,
            res
        )

        more.pop()

        keyboard.push(...more)
    }

    if (res.locals.command === '/clear') keyboard = null

    var content = ''
    if (keyboard && keyboard.length > 0) {
        content += '\n\n'
        for (var i = 0; i < keyboard.length; i++) {
            let item = keyboard[i]
            content += `${i}: ${item.text} ${i === keyboard.length - 1 ? '' : '\n'}`
        }
    }

    let Firestore = require('./firestore_handler')
    let firestore = new Firestore(res.locals.service, null)

    if (keyboard && keyboard.length > 0) {
        await firestore.setLastMenu(res.locals.serviceID, keyboard)
    }

    return content
}
