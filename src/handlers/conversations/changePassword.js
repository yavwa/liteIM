const Firestore = require('../firestore_handler')
const ActionHandler = require('../action_handler')
const Responder = require('../responder')

const steps = ['code']

class ChangePasswordConvo {
    constructor(commandConvo, user, service, serviceOptions) {
        this.user = user
        this.service = service
        this.commandConvo = commandConvo
        this.firestore = new Firestore(service, serviceOptions)
        this.responder = new Responder(serviceOptions)
        this.serviceOptions = serviceOptions
    }

    currentStep() {
        for (let i = 0; i < steps.length; i++) {
            let step = steps[i]
            if (!this.commandConvo.data()[step]) return step
        }
    }

    async initialMessage(userID) {
        try {
            await new ActionHandler(this.service, this.serviceOptions).request2FA(userID)
            return {
                success: true,
                message: this.responder.response('request', 'changePassword', 'code')
            }
        } catch (err) {
            return {
                success: false,
                message: err
            }
        }
    }

    async complete(value) {
        let serviceID = this.commandConvo.id
        try {
            let params = value.split(/\s+/)
            params = params.filter(param => param.length > 0)
            if (params.length < 2)
                return {
                    success: false,
                    message: this.responder.response('request', 'changePassword', 'password')
                }

            let currentPassword = params[0]
            let newPassword = params[1]

            await new ActionHandler(this.service, this.serviceOptions).changePassword(
                this.user,
                currentPassword,
                newPassword
            )
            await this.firestore.clearCommandPartial(serviceID)
            return {
                success: true,
                message: this.responder.response('success', 'changePassword', null, {newPassword})
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
            case steps[0]:
                try {
                    await new ActionHandler(this.service, this.serviceOptions).check2FA(serviceID, value, this.user.id)
                    return {
                        success: true,
                        message: this.responder.response('request', 'changePassword', 'password')
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
        if (!validated) throw this.responder.response('failure', 'conversation', 'invalidStep', { step })
        let params = {}
        params[step] = value
        try {
            await this.firestore.setCommandPartial(this.commandConvo.id, params)
            return this.afterMessageForStep(step, value)
        } catch (err) {
            throw err
        }
    }

    async validateStep(step, value) {
        switch (step) {
            case steps[0]:
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

module.exports = ChangePasswordConvo
