const crypto = require('crypto')

/**
 * Encrypts an object's value properties with the provided public key.
 *
 * @param {Object} data The object you want to encrypt.
 * @param {String} encryptionKey The public RSA encryption key to encrypt the data with.
 */
const encrypt = async (data, encryptionKey) => {
    if (!data)
        return {
            success: false,
            code: 'MISSING_PARAM',
            error: "'data' was not passed as a parameter."
        }
    if (!encryptionKey)
        return {
            success: false,
            code: 'MISSING_PARAM',
            error: "'key' was not passed as a parameter."
        }

    const encryptedData = {}
    Object.keys(data).forEach(key => {
        const value = data[key]

        encryptedData[key] = crypto
            .publicEncrypt(
                Buffer.from(encryptionKey, 'hex').toString('ascii'),
                Buffer.from(value)
            )
            .toString('base64')
    })

    return { success: true, data: encryptedData }
}

module.exports = {
    encrypt
}
