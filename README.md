# SwiftCart Express

I want to create the quick commerce app like blinkit and its functionality to show product with their description like flipkart product and rating of the product and specification and editable and clicakble banner and hero banner and also when click on banner product shows and when click on products related product also shows and when user order the product its  show interface  like flipkart and also add admin panel  and everything that shows in screen edit in admin panel and add payment integration and use supabas for database and I have own coustom domain if you want and make website fast and always store data and every user sheen the product and use only email id to login and signup and password weak not add and set purwarharshit3@gmail.com as the admin only this email id login shows admin panel

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6a4cb0f0-b71e-4386-86fd-062acfeb70d0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Mobile app (Play Store / App Store)

The repo includes a [Capacitor](https://capacitorjs.com) wrapper (`android/` and `ios/` folders). The native app loads the **live website URL** in a WebView, so every update you push appears in the app instantly — no rebuild needed.

1. **Set your production URL** in `capacitor.config.ts` (`APP_URL` — it currently points at the preview domain).
2. **Android → Play Store**
   - Install Android Studio + the Android SDK.
   - `npm i && npx cap sync android`
   - Open `android/` in Android Studio, set your app icon/splash, generate a signed AAB (Build → Generate Signed Bundle), then upload to [Google Play Console](https://play.google.com/console).
3. **iOS → App Store** (requires a Mac)
   - Install Xcode, then `npm i && npx cap sync ios`.
   - Open `ios/App` in Xcode, set the bundle ID / signing, archive (Product → Archive), then upload to App Store Connect.

Environment variables (Supabase keys, Razorpay keys, etc.) are read at runtime from the live website — the app itself needs none.
