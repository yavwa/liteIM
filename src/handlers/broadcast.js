const Firestore = require('./firestore_handler')

module.exports = async (message) => {
    let success
    try {
        let firestore = new Firestore()
        let allUsersSnapshot = await firestore.getAllUsers()
        allUsersSnapshot.forEach(async doc => {
            if (doc && doc.exists) {
                let services = doc.data().services
                for (var service in services) {
                    if (services.hasOwnProperty(service)){
                        let serviceUserID = services[service]
                        await require(`./services/${service}`).sendMessage(serviceUserID, message)
                    }
                }
            }
        })
        
        success = true
    } catch (e) {
        console.log(e)
        success = false
    }

    return success
}
