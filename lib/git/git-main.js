/* @flow */

import GitPackage from './git-package'

const gitPackageInstance = new GitPackage()
GitPackage.registerDeserializers(gitPackageInstance)
GitPackage.registerViewProviders(gitPackageInstance)

export default gitPackageInstance
