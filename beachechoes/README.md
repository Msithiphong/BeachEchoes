How to run the app when you first clone from github
1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

HOW TO DEVELOP W/ GITHUB:
1. Fork the main Branch
2. Develop the code
3. Create a Pull Request and have someone review to merge to main

CODEBASE ARCHITECTURE / LAYOUT

APP FOLDER:
- At the top of the project there is the "app" folder this is where all of our "screens" will reside. 

ASSETS FOLDER:
- This folder is where all of our images, icons and reside for reference for styling

COMPONENTS FOLDER:
- This folder is for reusable components that we will use such as "buttons" throughout the app

CORE FOLDER:
- Core styling files

HELPERS FOLDER:
- These are functions that help the logic behind stuff like "login" and "register"

In the parent directory there is a server.js which is our node backend for routing and our apis



In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo
