const firebase = require('firebase-admin')
const Responder = require('./responder')

let credential, databaseURL
if (process.env.STAGE === 'production') {
    credential = require('../instances/firebase_prod_credentials.json')
    databaseURL = process.env.FIREBASE_PROD_URL
} else if (process.env.STAGE === 'staging') {
    credential = require('../instances/firebase_staging_credentials.json')
    databaseURL = process.env.FIREBASE_STAGING_URL
} else {
    credential = require('../instances/firebase_dev_credentials.json')
    databaseURL = process.env.FIREBASE_DEV_URL
}

firebase.initializeApp({
    credential: firebase.credential.cert(credential),
    databaseURL
})

firebase.firestore().settings({ timestampsInSnapshots: true })

class FirestoreHandler {
    constructor(service, serviceOptions) {
        this.service = service
        this.responder = new Responder(serviceOptions)
    }

    // Convenience methods

    collection(name) {
        return firebase.firestore().collection(name)
    }

    doc(name, id) {
        return this.collection(name).doc(id)
    }

    auth() {
        return firebase.auth()
    }

    // Authentication

    async signUp(email, password) {
        try {
            return await this.auth().createUser({ email, password })
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async getToken(email, password) {
        try {
            const request = require('request')

            const data = {
                email: email,
                password: password,
                returnSecureToken: true
            }

            let key
            if (process.env.STAGE === 'production')
                key = process.env.FIREBASE_PROD_API_KEY
            else if (process.env.STAGE === 'staging')
                key = process.env.FIREBASE_STAGING_API_KEY
            else key = process.env.FIREBASE_DEV_API_KEY

            let self = this
            let tokenPromise = new Promise((resolve, reject) => {
                request(
                    {
                        url: `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${key}`,
                        method: 'POST',
                        json: true,
                        body: data
                    },
                    function(error, response, body) {
                        if (!error && response.statusCode === 200) {
                            if (!body.idToken)
                                reject(
                                    self.responder.response('failure', 'password')
                                )
                            else resolve(body.idToken)
                        } else {
                            reject(self.responder.response('failure', 'password'))
                        }
                    }
                )
            })

            const token = await tokenPromise.catch(err => {
                throw err
            })
            return token
        } catch (err) {
            console.log(err)
            throw err
        }
    }

    async createPublicUserData(userId, email) {
        try {
            return this.collection('public_user_data')
                .doc(userId)
                .set(
                    {
                        email,
                        createdAt: Date.now()
                    },
                    { merge: true }
                )
        } catch (err) {
            console.log(err)
        }
    }

    async getUserByEmail(email) {
        try {
            return await this.auth().getUserByEmail(email)
        } catch (err) {
            throw this.responder.response('failure', 'generic')
        }
    }

    async getUserIdByPhone(phone) {
        try {
            let number = phone.toString()
            number = number.replace(/\D+/g, '')

            let result = await this.collection('two_factor')
                .where('phoneNumber', '==', number)
                .get()
            if (result.size > 0 && result.docs[0].exists) return result.docs[0].id
            throw result
        } catch (err) {
            throw this.responder.response('failure', 'generic')
        }
    }

    // Actions

    async fetchWallet(id) {
        try {
            let doc = await this.doc('wallets', id).get()
            if (doc.exists) return doc
            throw doc
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async fetchWalletByUserId(id) {
        try {
            let result = await this.collection('wallets')
                .where('belongsTo', '==', id)
                .get()
            if (result.size > 0 && result.docs[0].exists) return result.docs[0]
            throw result
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async fetchWalletByEmail(email) {
        try {
            let user = await this.getUserByEmail(email)
            return await this.fetchWalletByUserId(user.uid)
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async fetchWalletByPhone(phone) {
        try {
            let userID = await this.getUserIdByPhone(phone)
            return await this.fetchWalletByUserId(userID)
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async fetchWalletByServiceID(serviceID) {
        try {
            let user = await this.fetchLiteIMUser(serviceID)
            return await this.fetchWalletByUserId(user.id)
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async fetchLiteIMUser(serviceID) {
        try {
            let service = this.service
            let result = await this.collection('liteIM')
                .where(`services.${service}`, '==', serviceID.toString())
                .get()
            if (result.size > 0 && result.docs[0].exists) return result.docs[0]
            throw 'ServiceID not found.'
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async fetchLiteIMUserByFirebaseID(firebaseID) {
        try {
            let liteIMUserDoc = await this.collection('liteIM')
                .doc(firebaseID)
                .get()
            let user = liteIMUserDoc.exists ? liteIMUserDoc.data() : null
            if (!user) throw 'User not found by firebaseID.'
            user.id = liteIMUserDoc.id
            return user
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async fetchLiteIMUserByAddress(address) {
        try {
            let walletDoc = await this.collection('wallets')
                .doc(address)
                .get()
            let wallet = walletDoc.exists ? walletDoc.data() : null
            if (!wallet) throw 'User not found by firebaseID.'

            let userID = wallet.belongsTo
            return this.fetchLiteIMUserByFirebaseID(userID)
        } catch (err) {
            console.log(err)
            throw `There was a problem finding the user by address: ${address}`
        }
    }

    async fetchLiteIMUserByPhoneNumber(phone) {
        try {
            let userID = await this.getUserIdByPhone(phone)
            if (!userID) throw 'User not found by phone number.'
            return this.fetchLiteIMUserByFirebaseID(userID)
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async fetchTwoFactorData(firebaseID) {
        try {
            let doc = await this.collection('two_factor')
                .doc(firebaseID)
                .get()
            let twoFactorData = doc.exists ? doc.data() : null
            if (!twoFactorData) return false
            return twoFactorData
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async fetchTransactions(address, limit, startTime = null, startID = null) {
        try {
            let query = this.collection('transactions')
                .where('_parties', 'array-contains', address)
                .orderBy('time', 'desc')
                .orderBy('txid', 'asc')
                .limit(limit + 1)
            if (startTime && startID) query = query.startAt(startTime, startID)
            let transactions = []
            return query.get().then(snapshot => {
                if (snapshot.size <= 0) throw 'No transactions found'
                snapshot.forEach(transaction => {
                    if (transaction.exists) {
                        let tx = transaction.data()
                        transactions.push(tx)
                    }
                })

                return transactions
            })
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async addLiteIMUser(userID, serviceID, email) {
        try {
            let service = this.service
            return await this.collection('liteIM')
                .doc(userID)
                .set(
                    { email, services: { [service]: serviceID.toString() } },
                    { merge: true }
                )
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async createNewCommandPartial(serviceID, command, allowMenu = true) {
        try {
            await this.clearCommandPartial(serviceID)
            await this.addCommandPartial(serviceID, command, allowMenu)
        } catch (e) {
            console.log('E:', e)
        }
    }

    async fetchCommandPartial(serviceID) {
        try {
            let service = this.service
            return this.collection('liteIM')
                .doc('state')
                .collection(`commandPartials_${service}`)
                .doc(serviceID.toString())
                .get()
                .then(doc => {
                    return doc
                    // if (doc && doc.exists) return doc
                    // else throw this.responder.response('failure', 'generic')
                })
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async addCommandPartial(serviceID, command, allowMenu) {
        try {
            let service = this.service
            return this.collection('liteIM')
                .doc('state')
                .collection(`commandPartials_${service}`)
                .doc(serviceID.toString())
                .set({ command, allowMenu })
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async setCommandPartial(
        serviceID,
        commandPartial,
        merge = true,
        allowMenu = true
    ) {
        try {
            let service = this.service
            return this.collection('liteIM')
                .doc('state')
                .collection(`commandPartials_${service}`)
                .doc(serviceID.toString())
                .set({ ...commandPartial, allowMenu }, { merge })
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async unsetCommandPartial(serviceID, field) {
        try {
            let service = this.service
            let FieldValue = require('firebase-admin').firestore.FieldValue
            return this.collection('liteIM')
                .doc('state')
                .collection(`commandPartials_${service}`)
                .doc(serviceID.toString())
                .update({
                    [field]: FieldValue.delete()
                })
        } catch (err) {
            console.log(err)
        }
    }

    async clearCommandPartial(serviceID) {
        try {
            let service = this.service
            return this.collection('liteIM')
                .doc('state')
                .collection(`commandPartials_${service}`)
                .doc(serviceID.toString())
                .delete()
        } catch (err) {
            console.log(err)
        }
    }

    async setBotMessageID(serviceID, messageID) {
        try {
            let service = this.service
            return await this.collection('liteIM')
                .doc('state')
                .collection(`ongoingMessages_${service}`)
                .doc(serviceID.toString())
                .set({ messageID }, { merge: true })
                .catch(err => {
                    throw `Could not set the ongoing conversation for this user.`
                })
        } catch (err) {
            console.log(err)
        }
    }

    async getBotMessageID(serviceID) {
        try {
            let service = this.service
            return await this.collection('liteIM')
                .doc('state')
                .collection(`ongoingMessages_${service}`)
                .doc(serviceID.toString())
                .get()
                .then(snapshot => {
                    if (snapshot.exists) {
                        return snapshot.data()
                    } else {
                        console.log(
                            `Could not get the ongoing conversation for ${serviceID}.`
                        )
                        return false
                    }
                })
                .catch(err => {
                    console.log(
                        `Could not get the ongoing conversation for ${serviceID}.`
                    )
                    return false
                })
        } catch (err) {
            console.log(err)
        }
    }

    async checkIfEmailExists(email) {
        try {
            await this.auth().getUserByEmail(email) //this returns if exists, throws if doesn't
            return true
        } catch (err) {
            if (err.code === 'auth/user-not-found') return false
            else throw err
        }
    }

    async checkIfPhoneNumberExists(phone) {
        try {
            let number = phone.toString()
            number = number.replace(/\D+/g, '')

            return this.collection('two_factor')
                .where('phoneNumber', '==', number)
                .limit(1)
                .get()
                .then(snapshot => {
                    return snapshot.size > 0 && snapshot.docs[0].exists
                })
                .catch(err => {
                    throw this.responder.response('failure', 'generic')
                })
        } catch (err) {
            throw err
        }
    }

    // 2FA

    async enable2FA(serviceID, phone, code) {
        try {
            let number = phone.toString()
            number = number.replace(/\D+/g, '')

            let service = this.service
            let docName = `${serviceID}_${service}`
            await this.collection('two_factor')
                .doc(docName)
                .set({
                    activated: false,
                    type: 'sms',
                    phoneNumber: number,
                    credentialExpires: null,
                    onLogin: true,
                    onTransaction: false
                })
                .then(() => {
                    this.collection('pending_two_factor')
                        .doc(number)
                        .set({
                            type: 'sms',
                            actionType: 'enable',
                            textMatch: code,
                            belongsTo: serviceID.toString(),
                            phone: number,
                            expiresAt: Date.now() + 120 * 1000
                        })
                        .then(() => {
                            return true
                        })
                        .catch(err => {
                            throw err
                        })
                })
                .catch(err => {
                    throw err
                })
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async request2FA(userID, code) {
        try {
            return this.collection('two_factor')
                .doc(userID)
                .get()
                .then(async doc => {
                    if (doc && doc.exists) {
                        const phone = doc.data().phoneNumber
                        let number = phone.toString()
                        number = number.replace(/\D+/g, '')
                        return await this.collection('pending_two_factor')
                            .doc(number)
                            .set({
                                type: 'sms',
                                actionType: 'enable',
                                textMatch: code,
                                belongsTo: userID,
                                phone: number,
                                expiresAt: Date.now() + 120 * 1000
                            })
                            .then(() => {
                                return number
                            })
                            .catch(err => {
                                throw this.responder.response('failure', 'generic')
                            })
                    } else
                        throw this.responder.response(
                            'failure',
                            'twoFactor',
                            'notFound'
                        )
                })
                .catch(err => {
                    throw this.responder.response('failure', 'generic')
                })
        } catch (err) {
            console.log(err)
            throw this.responder.response('failure', 'generic')
        }
    }

    async check2FA(serviceID, code, userID = null) {
        try {
            let service = this.service
            let docName = userID ? userID : `${serviceID}_${service}`
            let twoFactorRef = this.collection('two_factor').doc(docName)

            let twoFactorDoc = await twoFactorRef.get().catch(() => {
                throw this.responder.response('failure', 'generic')
            })
            let twoFactor = twoFactorDoc.exists ? twoFactorDoc.data() : null
            if (!twoFactor)
                throw this.responder.response('failure', 'twoFactor', 'notEnabled')

            let pendingDoc = await this.collection('pending_two_factor')
                .doc(twoFactor.phoneNumber)
                .get()
                .catch(() => {
                    throw this.responder.response('failure', 'generic')
                })
            let pending = pendingDoc.exists ? pendingDoc.data() : null
            if (!pending)
                throw this.responder.response('failure', 'twoFactor', 'noPending')

            if (pending.expiresAt <= Date.now())
                throw this.responder.response('failure', 'twoFactor', 'invalid')
            if (pending.textMatch !== code.toString())
                throw this.responder.response('failure', 'twoFactor', 'invalid')

            let obj = { credentialExpires: Date.now() + 300 * 1000 }
            if (pending.actionType === 'enable') obj.activated = true
            if (pending.actionType === 'disable') obj.activated = false

            await twoFactorRef.set(obj, { merge: true }).catch(() => {
                throw this.responder.response('failure', 'generic')
            })
            return true
        } catch (err) {
            throw err
        }
    }

    async unsetPartial2FA(serviceID) {
        try {
            let service = this.service
            let docName = `${serviceID}_${service}`
            await this.collection('two_factor')
                .doc(docName)
                .get()
                .then(doc => {
                    if (doc && doc.exists) {
                        doc.ref.delete()
                    }
                })
            return true
        } catch (err) {
            console.log(err)
        }
    }

    async updateIdOn2FA(serviceID) {
        try {
            let service = this.service
            let fetchLiteIMUser = await this.fetchLiteIMUser(serviceID)
            let firebaseID = fetchLiteIMUser.id
            let docName = `${serviceID}_${service}`
            await this.collection('two_factor')
                .doc(docName)
                .get()
                .then(doc => {
                    if (doc && doc.exists) {
                        let data = doc.data()
                        this.collection('two_factor')
                            .doc(firebaseID)
                            .set(data)
                            .then(() => {
                                doc.ref.delete()
                                return true
                            })
                            .catch(err => {
                                console.log(err)
                                throw 'Could not update the ID of the 2FA entry.'
                            })
                    } else
                        throw 'Could not find 2FA for this user.'.catch(err => {
                            console.log(err)
                            throw 'Could not find 2FA for this user.'
                        })
                })
        } catch (err) {
            console.log(err)
        }
    }

    // state

    setLastMenu(userId, menu) {
        userId = userId.toString()

        return firebase
            .firestore()
            .collection('liteIM')
            .doc('state')
            .collection(`cachedMenus_${this.service}`)
            .doc(userId)
            .set({ menu })
    }

    async getLastMenu(userId) {
        userId = userId.toString()

        return firebase
            .firestore()
            .collection('liteIM')
            .doc('state')
            .collection(`cachedMenus_${this.service}`)
            .doc(userId)
            .get()
            .then(doc => {
                if (!doc.exists) return null
                return doc.data().menu
            })
            .catch(err => {
                console.error('error getting last menu:', err)
                return null
            })
    }

    async fetchNextTransactionID(userID) {
        try {
            return this.collection('liteIM')
                .doc(userID)
                .get()
                .then(doc => {
                    if (doc && doc.exists) {
                        let nextTime = doc.data()._nextTime
                        let nextID = doc.data()._nextTransactionID

                        return { nextTime, nextID }
                    }
                })
        } catch (err) {
            console.log(err)
        }
    }

    async setNextTransactionID(userID, nextTime, nextID) {
        try {
            return this.collection('liteIM')
                .doc(userID)
                .set(
                    {
                        _nextTime: nextTime,
                        _nextTransactionID: nextID
                    },
                    { merge: true }
                )
        } catch (err) {
            console.log(err)
        }
    }

    async unsetNextTransactionID(userID) {
        try {
            let FieldValue = require('firebase-admin').firestore.FieldValue
            return this.collection('liteIM')
                .doc(userID)
                .set(
                    {
                        _nextTime: FieldValue.delete(),
                        _nextTransactionID: FieldValue.delete()
                    },
                    { merge: true }
                )
        } catch (err) {
            console.log(err)
        }
    }


    async getAllUsers() {
        return this.collection('liteIM')
            .get()
            .then(snapshot => {
                return snapshot
            })
    }
}

module.exports = FirestoreHandler
