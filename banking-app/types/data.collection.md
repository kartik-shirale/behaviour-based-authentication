Quick Prompt: Add Kotlin Expo Module in Existing Expo Project
Check your project type:

Is it bare workflow or custom dev client?
If not, run expo prebuild or expo eject to enable native code support.

Create local Expo Module scaffold:

bash
npx create-expo-module@latest --local

# Enter your module name, e.g. my-network-module

# This creates ./modules/my-network-module with Java/Kotlin and Swift code

Implement Kotlin native code:

Open:

text
modules/my-network-module/android/src/main/java/expo/modules/mynetworkmodule/MyNetworkModule.kt
Write your Kotlin functions using Expo Modules API, e.g.:

kotlin
class MyNetworkModule : Module() {
override fun definition() = ModuleDefinition {
Name("MyNetworkModule")

    Function("getSimSerial") {
      val telephonyManager = appContext.applicationContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
      telephonyManager.simSerialNumber ?: "unknown"
    }

}
}
Add required permissions:

Add in android/app/src/main/AndroidManifest.xml:

xml
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
Handle runtime permissions in JavaScript if needed.

Add the module to your Expo app:

In your main project folder:

bash
yarn add file:./modules/my-network-module
Import and call native module in JS/TS:

typescript
import MyNetworkModule from 'my-network-module';

async function getSimSerial() {
try {
const simSerial = await MyNetworkModule.getSimSerial();
console.log('SIM Serial:', simSerial);
} catch (e) {
console.error(e);
}
}
Run and build:

Start metro: npx expo start
