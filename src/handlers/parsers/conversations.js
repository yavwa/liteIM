const SendConvo = require('../conversations/send')
const SignupConvo = require('../conversations/signup')
const ExportConvo = require('../conversations/export')
const ReceiveConvo = require('../conversations/receive')
const Enable2FAConvo = require('../conversations/enable2FA')
const LinkAccountConvo = require('../conversations/linkAccount')
const ChangeEmailConvo = require('../conversations/changeEmail')
const ChangePasswordConvo = require('../conversations/changePassword')
const Firestore = require('../firestore_handler')

module.exports = async (req, res) => {
    const service = res.locals.service
    const user = res.locals.user
    const serviceID = res.locals.serviceID
    const serviceOptions = res.locals.serviceOptions
    const firebase = new Firestore(service, serviceOptions)

    let content
    let success = false
    let extraData,
        notifier = {}

    return firebase
        .fetchCommandPartial(serviceID)
        .then(async convoPartial => {
            let convo

            switch (convoPartial.data().command.toLowerCase()) {
                case '/signup':
                    convo = new SignupConvo(
                        convoPartial,
                        service,
                        serviceOptions,
                        res
                    )
                    break
                case '/linkaccount':
                    convo = new LinkAccountConvo(
                        convoPartial,
                        service,
                        serviceOptions,
                        res
                    )
                    break
                case '/send':
                    convo = new SendConvo(
                        convoPartial,
                        user,
                        service,
                        serviceOptions
                    )
                    break
                case '/receive':
                    convo = new ReceiveConvo(
                        convoPartial,
                        user,
                        service,
                        serviceOptions
                    )
                    break
                case '/changepassword':
                    convo = new ChangePasswordConvo(
                        convoPartial,
                        user,
                        service,
                        serviceOptions
                    )
                    break
                case '/changeemail':
                    convo = new ChangeEmailConvo(
                        convoPartial,
                        user,
                        service,
                        serviceOptions
                    )
                    break
                case '/export':
                    convo = new ExportConvo(
                        convoPartial,
                        user,
                        service,
                        serviceOptions
                    )
                    break
                case '/enable2fa':
                    convo = new Enable2FAConvo(
                        convoPartial,
                        user,
                        service,
                        serviceOptions
                    )
                    break
                default:
                    // Go process unknown command
                    return { success: false, continue: true }
            }

            return convo
                .setCurrentStep(res.locals.message)
                .then(async data => {
                    success = data.success
                    content = data.message
                    if (data.extraData) extraData = data.extraData
                    if (data.notifier) notifier = data.notifier

                    res.submit(success, content, extraData, notifier)
                    return { success: true, continue: false }
                })
                .catch(async failure => {
                    content = failure

                    res.submit(success, content, extraData, notifier)
                    return { success: true, continue: false }
                })
        })
        .catch(() => {
            // Go process unknown command
            return { success: false, continue: true }
        })
}
