const axios = require('axios')

let baseURL = process.env.DEV_URL
if (process.env.STAGE === 'production') {
    baseURL = process.env.PROD_URL
} else if (process.env.STAGE === 'staging') {
    baseURL = process.env.STAGING_URL
}

class LtcApi {
    constructor(token) {
        let headers = {}
        if (token) headers = { Authorization: 'Bearer ' + token }
        this.handler = axios.create({
            baseURL,
            headers
        })
        this.handler.interceptors.response.use(null, function(error) {
            if (error){
                console.log(error)
                return {
                    data: {
                        success: false,
                        error: 'AXIOS'
                    }
                }
            }
        })
    }

    // LTC
    transferLtc(to, amount, currentPassword, from, interfaceMockId, toEmail = null) {
        let params = { to, amount, currentPassword, from, interfaceMockId, toEmail }
        return this.handler.post('/transaction/send', params)
    }

    // User

    changePassword(currentPassword, newPassword) {
        return this.handler.post('/user/change-password', { currentPassword, newPassword })
    }

    changeEmail(newEmail, currentPassword) {
        return this.handler.post('/user/change-email', { newEmail, currentPassword })
    }

    // Wallet
    createWallet(currentPassword) {
        return this.handler.post('/user/wallet', { currentPassword })
    }

    exportPrivateKey(currentPassword, address) {
        return this.handler.post('/user/wallet/reveal-key', {
            currentPassword,
            address
        })
    }
    //TODO: setDefaultAddress
    //TODO: getAllBalances
}

module.exports = LtcApi