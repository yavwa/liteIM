const Firestore = require('../firestore_handler')
const ActionHandler = require('../action_handler')
const Responder = require('../responder')

const steps = ['email', 'code']

class LinkAccountConvo {
    constructor(commandConvo, service, serviceOptions, res) {
        this.service = service
        this.commandConvo = commandConvo
        this.firestore = new Firestore(service, serviceOptions)
        this.responder = new Responder(serviceOptions)
        this.serviceOptions = serviceOptions
        this.res = res
    }

    currentStep() {
        for (let i = 0; i < steps.length; i++) {
            let step = steps[i]
            if (!this.commandConvo.data()[step]) return step
        }
    }

    async initialMessage(serviceID, email) {
        try {
            let user = await this.firestore.getUserByEmail(email)
            await new ActionHandler(this.service, this.serviceOptions).request2FA(user.uid)
            return {
                success: true,
                message: this.responder.response('request', 'linkAccount', 'code')
            }
        }  catch (err) {
            return {
                success: false,
                message: this.responder.response('failure', 'generic')
            }
        }

    }

    async complete(value) {
        let serviceID = this.commandConvo.id
        let { email } = this.commandConvo.data()
        try {
            await this.firestore.getToken(email, value)
            let user = await this.firestore.getUserByEmail(email)
            await this.firestore.addLiteIMUser(user.uid, serviceID, email)
            await this.firestore.clearCommandPartial(serviceID)
            return {
                success: true,
                message: this.responder.response('success', 'linkAccount')
            }
        } catch (err) {
            return {
                success: false,
                message: err
            }
        }
    }

    async afterMessageForStep(step, value) {
        let serviceID = this.commandConvo.id
        switch (step) {
            case steps[1]:
                try {
                    let user = await this.firestore.getUserByEmail(this.commandConvo.data().email)
                    await new ActionHandler(this.service, this.serviceOptions).check2FA(serviceID, value, user.uid)
                    this.res.locals.email = this.commandConvo.data().email
                    return {
                        success: true,
                        message: this.responder.response('request', 'linkAccount', 'password')
                    }
                } catch (err) {
                    await this.clearStep(step)
                    return {
                        success: false,
                        message: err
                    }
                }

            default:
                return {
                    success: false,
                    message: this.responder.response('failure', 'conversation', 'unexpectedInput')
                }
        }
    }

    async setCurrentStep(value) {
        let currentStep = this.currentStep()
        if (currentStep) {
            return await this.setStep(currentStep, value)
        } else {
            return await this.complete(value)
        }
    }

    async setStep(step, value) {
        let validated = await this.validateStep(step, value)
        if (!validated) throw this.responder.response('failure', 'conversation', 'invalidStep', {step})
        let params = {}
        params[step] = value
        try {
            await this.firestore.setCommandPartial(this.commandConvo.id, params, true, false)
            return await this.afterMessageForStep(step, value)
        } catch (err) {
            throw {
                success: false,
                message: err
            }
        }
    }

    async validateStep(step, value) {
        switch (step) {
            case steps[0]:
                return true
            case steps[1]:
                return true
            default:
                return false
        }
    }

    async clearStep(step) {
        await this.firestore.unsetCommandPartial(
            this.commandConvo.id,
            step
        )
    }
}

module.exports = LinkAccountConvo
